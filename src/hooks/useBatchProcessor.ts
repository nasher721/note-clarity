import { useState, useCallback } from 'react';
import { ClinicalDocument, DocumentChunk, ChunkAnnotation } from '@/types/clinical';
import { parseDocument, findDuplicates } from '@/utils/chunkParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type DbChunkType = 'section_header' | 'paragraph' | 'bullet_list' | 'imaging_report' | 'lab_values' | 'medication_list' | 'vital_signs' | 'attestation' | 'unknown';
type DbPrimaryLabel = 'KEEP' | 'CONDENSE' | 'REMOVE';

export interface BatchDocument {
  id: string;
  text: string;
  noteType?: string;
  service?: string;
  patientId?: string;
  status: 'pending' | 'processing' | 'completed';
  document?: ClinicalDocument;
  annotationCount: number;
}

export function useBatchProcessor(userId: string | undefined) {
  const [batchQueue, setBatchQueue] = useState<BatchDocument[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToBatch = useCallback((items: Array<{
    text: string;
    noteType?: string;
    service?: string;
    patientId?: string;
  }>) => {
    const newItems: BatchDocument[] = items.map((item, index) => ({
      id: `batch-${Date.now()}-${index}`,
      text: item.text,
      noteType: item.noteType,
      service: item.service,
      patientId: item.patientId,
      status: 'pending',
      annotationCount: 0,
    }));

    setBatchQueue(prev => [...prev, ...newItems]);
    toast({
      title: 'Added to batch',
      description: `${items.length} document${items.length !== 1 ? 's' : ''} added to the queue.`,
    });
  }, []);

  const processDocument = useCallback(async (batchDoc: BatchDocument): Promise<ClinicalDocument | null> => {
    if (!userId) return null;

    const chunks = parseDocument(batchDoc.text);
    const duplicates = findDuplicates(chunks);
    
    chunks.forEach(chunk => {
      if (duplicates.has(chunk.id)) {
        chunk.suggestedLabel = 'REMOVE';
        chunk.confidence = 0.75;
      }
    });

    try {
      // Create document in database
      const { data: docData, error: docError } = await supabase
        .from('clinical_documents')
        .insert({
          user_id: userId,
          original_text: batchDoc.text,
          note_type: batchDoc.noteType,
          service: batchDoc.service,
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

      return {
        id: docData.id,
        originalText: batchDoc.text,
        chunks: (chunkData || []).map((c: any, i: number) => ({
          ...chunks[i],
          id: c.id,
        })),
        annotations: [],
        createdAt: new Date(docData.created_at),
        noteType: batchDoc.noteType,
        service: batchDoc.service,
      };
    } catch (error: any) {
      console.error('Failed to process document:', error);
      toast({
        title: 'Failed to process document',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [userId]);

  const startProcessing = useCallback(async () => {
    if (!userId || batchQueue.length === 0) return;

    setIsProcessing(true);
    const pendingDocs = batchQueue.filter(d => d.status === 'pending');

    for (let i = 0; i < pendingDocs.length; i++) {
      const batchDoc = pendingDocs[i];
      
      setBatchQueue(prev => prev.map(d => 
        d.id === batchDoc.id ? { ...d, status: 'processing' } : d
      ));

      const document = await processDocument(batchDoc);

      setBatchQueue(prev => prev.map(d => 
        d.id === batchDoc.id 
          ? { ...d, status: 'completed', document } 
          : d
      ));
    }

    setIsProcessing(false);
    toast({
      title: 'Batch processing complete',
      description: `Processed ${pendingDocs.length} documents.`,
    });
  }, [userId, batchQueue, processDocument]);

  const goToDocument = useCallback((index: number) => {
    if (index >= 0 && index < batchQueue.length) {
      setCurrentBatchIndex(index);
    }
  }, [batchQueue.length]);

  const nextDocument = useCallback(() => {
    if (currentBatchIndex < batchQueue.length - 1) {
      setCurrentBatchIndex(prev => prev + 1);
    }
  }, [currentBatchIndex, batchQueue.length]);

  const prevDocument = useCallback(() => {
    if (currentBatchIndex > 0) {
      setCurrentBatchIndex(prev => prev - 1);
    }
  }, [currentBatchIndex]);

  const updateAnnotationCount = useCallback((batchId: string, count: number) => {
    setBatchQueue(prev => prev.map(d =>
      d.id === batchId ? { ...d, annotationCount: count } : d
    ));
  }, []);

  const removeFromBatch = useCallback((batchId: string) => {
    setBatchQueue(prev => {
      const newQueue = prev.filter(d => d.id !== batchId);
      if (currentBatchIndex >= newQueue.length && newQueue.length > 0) {
        setCurrentBatchIndex(newQueue.length - 1);
      }
      return newQueue;
    });
  }, [currentBatchIndex]);

  const clearBatch = useCallback(() => {
    setBatchQueue([]);
    setCurrentBatchIndex(0);
  }, []);

  const currentBatchDocument = batchQueue[currentBatchIndex] || null;

  const stats = {
    total: batchQueue.length,
    pending: batchQueue.filter(d => d.status === 'pending').length,
    processing: batchQueue.filter(d => d.status === 'processing').length,
    completed: batchQueue.filter(d => d.status === 'completed').length,
    totalAnnotations: batchQueue.reduce((acc, d) => acc + d.annotationCount, 0),
  };

  return {
    batchQueue,
    currentBatchIndex,
    currentBatchDocument,
    isProcessing,
    stats,
    addToBatch,
    startProcessing,
    goToDocument,
    nextDocument,
    prevDocument,
    updateAnnotationCount,
    removeFromBatch,
    clearBatch,
  };
}
