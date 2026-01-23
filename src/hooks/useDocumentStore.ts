import { useState, useCallback } from 'react';
import { ClinicalDocument, ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope } from '@/types/clinical';
import { useDocuments, useDocumentCreate, useAnnotations, useLearnedRules, useCleanedText } from './documents';

/**
 * @deprecated This hook is maintained for backward compatibility.
 * Prefer using the individual hooks from '@/hooks/documents' directly:
 * - useDocuments: For loading and selecting documents
 * - useDocumentCreate: For creating new documents
 * - useAnnotations: For managing chunk annotations
 * - useLearnedRules: For fetching learned rules
 * - useCleanedText: For generating cleaned output
 */
export function useDocumentStore(userId: string | undefined) {
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);

  // Use the split hooks
  const {
    documents,
    currentDocument,
    loading,
    selectDocument,
    updateDocumentInList,
    addDocumentToList,
    setCurrentDocument,
  } = useDocuments(userId);

  const { createDocument } = useDocumentCreate(userId, addDocumentToList);

  const { annotateChunk, bulkAnnotateChunks, removeAnnotation, getAnnotation } = useAnnotations(
    userId,
    currentDocument,
    updateDocumentInList
  );

  const { getLearnedRules } = useLearnedRules(userId);
  const { getCleanedText } = useCleanedText(currentDocument);

  // Wrap selectDocument to also reset selected chunk
  const handleSelectDocument = useCallback((docId: string) => {
    selectDocument(docId);
    setSelectedChunkId(null);
  }, [selectDocument]);

  return {
    documents,
    currentDocument,
    selectedChunkId,
    setSelectedChunkId,
    createDocument,
    annotateChunk,
    bulkAnnotateChunks,
    removeAnnotation,
    getAnnotation,
    getCleanedText,
    selectDocument: handleSelectDocument,
    getLearnedRules,
    loading,
  };
}
