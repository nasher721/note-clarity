import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClinicalDocument, ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope } from '@/types/clinical';
import { toast } from '@/hooks/use-toast';
import { usePhiAuditLog } from '@/hooks/usePhiAuditLog';

/**
 * Hook for loading and selecting clinical documents
 * Handles document listing, selection, and PHI audit logging
 */
export function useDocuments(userId: string | undefined) {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [currentDocument, setCurrentDocument] = useState<ClinicalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { logDocumentAccess } = usePhiAuditLog(userId);

  // Load user's documents
  useEffect(() => {
    if (!userId) {
      setDocuments([]);
      setCurrentDocument(null);
      return;
    }

    const loadDocuments = async () => {
      setLoading(true);
      try {
        const { data: docs, error } = await supabase
          .from('clinical_documents')
          .select(`
            id,
            original_text,
            note_type,
            service,
            created_at,
            document_chunks (
              id,
              chunk_index,
              text,
              chunk_type,
              start_index,
              end_index,
              is_critical,
              critical_type,
              suggested_label,
              confidence
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Load annotations separately
        const { data: annotations, error: annError } = await supabase
          .from('chunk_annotations')
          .select('*')
          .eq('user_id', userId);

        if (annError) throw annError;

        const loadedDocs: ClinicalDocument[] = (docs || []).map((doc: any) => ({
          id: doc.id,
          originalText: doc.original_text,
          noteType: doc.note_type,
          service: doc.service,
          createdAt: new Date(doc.created_at),
          chunks: (doc.document_chunks || [])
            .sort((a: any, b: any) => a.chunk_index - b.chunk_index)
            .map((chunk: any) => ({
              id: chunk.id,
              text: chunk.text,
              type: chunk.chunk_type,
              startIndex: chunk.start_index,
              endIndex: chunk.end_index,
              isCritical: chunk.is_critical,
              criticalType: chunk.critical_type,
              suggestedLabel: chunk.suggested_label,
              confidence: chunk.confidence ? parseFloat(chunk.confidence) : undefined,
            })),
          annotations: (annotations || [])
            .filter((a: any) => doc.document_chunks?.some((c: any) => c.id === a.chunk_id))
            .map((a: any) => ({
              chunkId: a.chunk_id,
              rawText: doc.document_chunks?.find((c: any) => c.id === a.chunk_id)?.text || '',
              sectionType: doc.document_chunks?.find((c: any) => c.id === a.chunk_id)?.chunk_type || 'unknown',
              label: a.label as PrimaryLabel,
              removeReason: a.remove_reason as RemoveReason | undefined,
              condenseStrategy: a.condense_strategy as CondenseStrategy | undefined,
              scope: a.scope as LabelScope,
              timestamp: new Date(a.created_at),
              userId: a.user_id,
              overrideJustification: a.override_justification,
            })),
        }));

        setDocuments(loadedDocs);
        
        // Log PHI access for all loaded documents
        if (loadedDocs.length > 0) {
          loadedDocs.forEach(doc => logDocumentAccess(doc.id, 'SELECT'));
        }
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('Failed to load documents:', error);
        }
        toast({
          title: 'Failed to load documents',
          description: 'An error occurred while loading.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [userId, logDocumentAccess]);

  const selectDocument = useCallback((docId: string) => {
    if (!docId) {
      setCurrentDocument(null);
      return;
    }
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setCurrentDocument(doc);
      // Log PHI access when user selects a document to view
      logDocumentAccess(doc.id, 'SELECT');
    }
  }, [documents, logDocumentAccess]);

  const updateDocumentInList = useCallback((updatedDoc: ClinicalDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (currentDocument?.id === updatedDoc.id) {
      setCurrentDocument(updatedDoc);
    }
  }, [currentDocument?.id]);

  const addDocumentToList = useCallback((newDoc: ClinicalDocument) => {
    setDocuments(prev => [newDoc, ...prev]);
    setCurrentDocument(newDoc);
  }, []);

  return {
    documents,
    currentDocument,
    loading,
    selectDocument,
    updateDocumentInList,
    addDocumentToList,
    setCurrentDocument,
  };
}
