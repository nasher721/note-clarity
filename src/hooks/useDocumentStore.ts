import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseDocument, findDuplicates } from '@/utils/chunkParser';
import { PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope, DocumentChunk, ChunkAnnotation, ClinicalDocument } from '@/types/clinical';
import { toast } from '@/hooks/use-toast';

type DbChunkType = 'section_header' | 'paragraph' | 'bullet_list' | 'imaging_report' | 'lab_values' | 'medication_list' | 'vital_signs' | 'attestation' | 'unknown';
type DbPrimaryLabel = 'KEEP' | 'CONDENSE' | 'REMOVE';
type DbLabelScope = 'this_document' | 'note_type' | 'service' | 'global';

export function useDocumentStore(userId: string | undefined) {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [currentDocument, setCurrentDocument] = useState<ClinicalDocument | null>(null);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      } catch (error: any) {
        console.error('Failed to load documents:', error);
        toast({
          title: 'Failed to load documents',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [userId]);

  const createDocument = useCallback(async (text: string, noteType?: string, service?: string): Promise<ClinicalDocument | null> => {
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

      setDocuments(prev => [newDoc, ...prev]);
      setCurrentDocument(newDoc);
      
      toast({ title: 'Document saved', description: 'Your document has been saved to the cloud.' });
      
      return newDoc;
    } catch (error: any) {
      console.error('Failed to create document:', error);
      toast({
        title: 'Failed to save document',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [userId]);

  const annotateChunk = useCallback(async (
    chunkId: string,
    label: PrimaryLabel,
    options: {
      removeReason?: RemoveReason;
      condenseStrategy?: CondenseStrategy;
      scope?: LabelScope;
      overrideJustification?: string;
    } = {}
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
          scope: (options.scope || 'this_document') as DbLabelScope,
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
        scope: options.scope || 'this_document',
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

      setCurrentDocument(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));

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
      console.error('Failed to save annotation:', error);
      toast({
        title: 'Failed to save annotation',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [currentDocument, userId]);

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

      setCurrentDocument(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    } catch (error: any) {
      console.error('Failed to remove annotation:', error);
      toast({
        title: 'Failed to remove annotation',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [currentDocument, userId]);

  const getAnnotation = useCallback((chunkId: string): ChunkAnnotation | undefined => {
    return currentDocument?.annotations.find(a => a.chunkId === chunkId);
  }, [currentDocument]);

  const getCleanedText = useCallback((): string => {
    if (!currentDocument) return '';

    return currentDocument.chunks
      .filter(chunk => {
        const annotation = currentDocument.annotations.find(a => a.chunkId === chunk.id);
        return !annotation || annotation.label !== 'REMOVE';
      })
      .map(chunk => {
        const annotation = currentDocument.annotations.find(a => a.chunkId === chunk.id);
        if (annotation?.label === 'CONDENSE') {
          return `[CONDENSED: ${chunk.text.substring(0, 50)}...]`;
        }
        return chunk.text;
      })
      .join('\n\n');
  }, [currentDocument]);

  const selectDocument = useCallback((docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setCurrentDocument(doc);
      setSelectedChunkId(null);
    }
  }, [documents]);

  const getLearnedRules = useCallback(async (): Promise<ChunkAnnotation[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('learned_rules')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).map((r: any) => ({
        chunkId: r.id,
        rawText: r.pattern_text,
        sectionType: r.chunk_type || 'unknown',
        label: r.label as PrimaryLabel,
        removeReason: r.remove_reason as RemoveReason | undefined,
        condenseStrategy: r.condense_strategy as CondenseStrategy | undefined,
        scope: r.scope as LabelScope,
        timestamp: new Date(r.created_at),
        userId: r.user_id,
      }));
    } catch (error) {
      console.error('Failed to load learned rules:', error);
      return [];
    }
  }, [userId]);

  return {
    documents,
    currentDocument,
    selectedChunkId,
    setSelectedChunkId,
    createDocument,
    annotateChunk,
    removeAnnotation,
    getAnnotation,
    getCleanedText,
    selectDocument,
    getLearnedRules,
    loading,
  };
}
