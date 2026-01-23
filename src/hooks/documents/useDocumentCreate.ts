import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseDocument, findDuplicates } from '@/utils/chunkParser';
import { ClinicalDocument } from '@/types/clinical';
import { DbChunkType, DbPrimaryLabel } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { usePhiAuditLog } from '@/hooks/usePhiAuditLog';

/**
 * Hook for creating new clinical documents
 */
export function useDocumentCreate(
  userId: string | undefined,
  onDocumentCreated?: (doc: ClinicalDocument) => void
) {
  const { logDocumentAccess, logChunkAccess } = usePhiAuditLog(userId);

  const createDocument = useCallback(async (
    text: string, 
    noteType?: string, 
    service?: string
  ): Promise<ClinicalDocument | null> => {
    if (!userId) return null;

    const chunks = parseDocument(text);
    const duplicates = findDuplicates(chunks);
    
    chunks.forEach(chunk => {
      if (duplicates.has(chunk.id)) {
        chunk.suggestedLabel = 'REMOVE';
        chunk.confidence = 0.75;
      }
    });

    try {
      // Create document
      const { data: docData, error: docError } = await supabase
        .from('clinical_documents')
        .insert({
          user_id: userId,
          original_text: text,
          note_type: noteType,
          service: service,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create chunks
      const chunkInserts = chunks.map((chunk, index) => ({
        document_id: docData.id,
        chunk_index: index,
        text: chunk.text,
        chunk_type: chunk.type as DbChunkType,
        start_index: chunk.startIndex,
        end_index: chunk.endIndex,
        is_critical: chunk.isCritical,
        critical_type: chunk.criticalType,
        suggested_label: chunk.suggestedLabel as DbPrimaryLabel | null,
        confidence: chunk.confidence,
      }));

      const { data: chunkData, error: chunkError } = await supabase
        .from('document_chunks')
        .insert(chunkInserts)
        .select();

      if (chunkError) throw chunkError;

      // Map the returned chunk IDs back
      const newDoc: ClinicalDocument = {
        id: docData.id,
        originalText: text,
        chunks: (chunkData || []).map((c: any, i: number) => ({
          ...chunks[i],
          id: c.id,
        })),
        annotations: [],
        createdAt: new Date(docData.created_at),
        noteType,
        service,
      };

      // Log PHI creation
      logDocumentAccess(newDoc.id, 'INSERT');
      logChunkAccess(newDoc.chunks.map(c => c.id), 'INSERT');
      
      toast({ title: 'Document saved', description: 'Your document has been saved to the cloud.' });
      
      onDocumentCreated?.(newDoc);
      return newDoc;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to create document:', error);
      }
      toast({
        title: 'Failed to save document',
        description: 'An error occurred while saving.',
        variant: 'destructive',
      });
      return null;
    }
  }, [userId, logDocumentAccess, logChunkAccess, onDocumentCreated]);

  return { createDocument };
}
