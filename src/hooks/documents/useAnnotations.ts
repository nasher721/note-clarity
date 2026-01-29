import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ClinicalDocument, 
  ChunkAnnotation, 
  PrimaryLabel, 
  RemoveReason, 
  CondenseStrategy, 
  LabelScope 
} from '@/types/clinical';
import { DbPrimaryLabel, DbLabelScope, DbChunkType } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface AnnotationOptions {
  removeReason?: RemoveReason;
  condenseStrategy?: CondenseStrategy;
  scope?: LabelScope;
  overrideJustification?: string;
}

/**
 * Hook for managing chunk annotations
 */
export function useAnnotations(
  userId: string | undefined,
  currentDocument: ClinicalDocument | null,
  onDocumentUpdate: (doc: ClinicalDocument) => void
) {
  const annotateChunk = useCallback(async (
    chunkId: string,
    label: PrimaryLabel,
    options: AnnotationOptions = {}
  ) => {
    if (!currentDocument || !userId) return;

    const chunk = currentDocument.chunks.find(c => c.id === chunkId);
    if (!chunk) return;

    try {
      const { error } = await supabase
        .from('chunk_annotations')
        .upsert({
          chunk_id: chunkId,
          user_id: userId,
          label: label as DbPrimaryLabel,
          remove_reason: options.removeReason,
          condense_strategy: options.condenseStrategy,
          scope: (options.scope || 'global') as DbLabelScope,
          override_justification: options.overrideJustification,
        }, {
          onConflict: 'chunk_id,user_id',
        });

      if (error) throw error;

      const annotation: ChunkAnnotation = {
        chunkId,
        rawText: chunk.text,
        sectionType: chunk.type,
        label,
        removeReason: options.removeReason,
        condenseStrategy: options.condenseStrategy,
        scope: options.scope || 'global',
        timestamp: new Date(),
        userId,
        overrideJustification: options.overrideJustification,
      };

      const updatedDoc = {
        ...currentDocument,
        annotations: [
          ...currentDocument.annotations.filter(a => a.chunkId !== chunkId),
          annotation,
        ],
      };

      onDocumentUpdate(updatedDoc);

      // Show feedback for successful labeling
      toast({
        title: `Labeled as ${label}`,
        description: chunk.text.length > 50 ? chunk.text.substring(0, 50) + '...' : chunk.text,
      });

      // If scope is not this_document, also create/update a learned rule
      if (options.scope && options.scope !== 'this_document') {
        await supabase
          .from('learned_rules')
          .upsert({
            user_id: userId,
            pattern_text: chunk.text.toLowerCase().trim(),
            chunk_type: chunk.type as DbChunkType,
            label: label as DbPrimaryLabel,
            remove_reason: options.removeReason,
            condense_strategy: options.condenseStrategy,
            scope: options.scope as DbLabelScope,
            note_type: currentDocument.noteType,
            service: currentDocument.service,
          }, {
            onConflict: 'id',
          });
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to save annotation:', error);
      }
      toast({
        title: 'Failed to save annotation',
        description: 'An error occurred while saving.',
        variant: 'destructive',
      });
    }
  }, [currentDocument, userId, onDocumentUpdate]);

  const bulkAnnotateChunks = useCallback(async (
    chunkIds: string[],
    label: PrimaryLabel,
    options: AnnotationOptions = {}
  ) => {
    if (!currentDocument || !userId || chunkIds.length === 0) return;

    try {
      // Create annotations for all chunks
      const annotationInserts = chunkIds.map(chunkId => ({
        chunk_id: chunkId,
        user_id: userId,
        label: label as DbPrimaryLabel,
        remove_reason: options.removeReason,
        condense_strategy: options.condenseStrategy,
        scope: (options.scope || 'global') as DbLabelScope,
      }));

      const { error } = await supabase
        .from('chunk_annotations')
        .upsert(annotationInserts, {
          onConflict: 'chunk_id,user_id',
        });

      if (error) throw error;

      // Update local state
      const newAnnotations: ChunkAnnotation[] = chunkIds.map(chunkId => {
        const chunk = currentDocument.chunks.find(c => c.id === chunkId);
        return {
          chunkId,
          rawText: chunk?.text || '',
          sectionType: chunk?.type || 'unknown',
          label,
          removeReason: options.removeReason,
          condenseStrategy: options.condenseStrategy,
          scope: options.scope || 'global',
          timestamp: new Date(),
          userId,
        };
      });

      const updatedDoc = {
        ...currentDocument,
        annotations: [
          ...currentDocument.annotations.filter(a => !chunkIds.includes(a.chunkId)),
          ...newAnnotations,
        ],
      };

      onDocumentUpdate(updatedDoc);

      toast({
        title: 'Bulk labeling complete',
        description: `Applied ${label} to ${chunkIds.length} chunks.`,
      });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to bulk annotate:', error);
      }
      toast({
        title: 'Bulk labeling failed',
        description: 'An error occurred while applying labels.',
        variant: 'destructive',
      });
    }
  }, [currentDocument, userId, onDocumentUpdate]);

  const removeAnnotation = useCallback(async (chunkId: string) => {
    if (!currentDocument || !userId) return;

    try {
      const { error } = await supabase
        .from('chunk_annotations')
        .delete()
        .eq('chunk_id', chunkId)
        .eq('user_id', userId);

      if (error) throw error;

      const updatedDoc = {
        ...currentDocument,
        annotations: currentDocument.annotations.filter(a => a.chunkId !== chunkId),
      };

      onDocumentUpdate(updatedDoc);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to remove annotation:', error);
      }
      toast({
        title: 'Failed to remove annotation',
        description: 'An error occurred while removing.',
        variant: 'destructive',
      });
    }
  }, [currentDocument, userId, onDocumentUpdate]);

  const getAnnotation = useCallback((chunkId: string): ChunkAnnotation | undefined => {
    return currentDocument?.annotations.find(a => a.chunkId === chunkId);
  }, [currentDocument]);

  return {
    annotateChunk,
    bulkAnnotateChunks,
    removeAnnotation,
    getAnnotation,
  };
}
