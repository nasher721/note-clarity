import { useState, useCallback } from 'react';
import { ClinicalDocument, DocumentChunk, ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope } from '@/types/clinical';
import { parseDocument, findDuplicates } from '@/utils/chunkParser';

const STORAGE_KEY = 'clinical-denoiser-documents';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function loadFromStorage(): ClinicalDocument[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const docs = JSON.parse(stored);
      return docs.map((doc: ClinicalDocument) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        annotations: doc.annotations.map((a: ChunkAnnotation) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        })),
      }));
    }
  } catch (e) {
    console.error('Failed to load documents from storage', e);
  }
  return [];
}

function saveToStorage(documents: ClinicalDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch (e) {
    console.error('Failed to save documents to storage', e);
  }
}

export function useDocumentStore() {
  const [documents, setDocuments] = useState<ClinicalDocument[]>(() => loadFromStorage());
  const [currentDocument, setCurrentDocument] = useState<ClinicalDocument | null>(null);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);

  const createDocument = useCallback((text: string, noteType?: string, service?: string): ClinicalDocument => {
    const chunks = parseDocument(text);
    const duplicates = findDuplicates(chunks);
    
    // Mark duplicates
    chunks.forEach(chunk => {
      if (duplicates.has(chunk.id)) {
        chunk.suggestedLabel = 'REMOVE';
        chunk.confidence = 0.75;
      }
    });

    const doc: ClinicalDocument = {
      id: generateId(),
      originalText: text,
      chunks,
      annotations: [],
      createdAt: new Date(),
      noteType,
      service,
    };

    setDocuments(prev => {
      const updated = [...prev, doc];
      saveToStorage(updated);
      return updated;
    });
    
    setCurrentDocument(doc);
    return doc;
  }, []);

  const annotateChunk = useCallback((
    chunkId: string,
    label: PrimaryLabel,
    options: {
      removeReason?: RemoveReason;
      condenseStrategy?: CondenseStrategy;
      scope?: LabelScope;
      overrideJustification?: string;
    } = {}
  ) => {
    if (!currentDocument) return;

    const chunk = currentDocument.chunks.find(c => c.id === chunkId);
    if (!chunk) return;

    const annotation: ChunkAnnotation = {
      chunkId,
      rawText: chunk.text,
      sectionType: chunk.type,
      label,
      removeReason: options.removeReason,
      condenseStrategy: options.condenseStrategy,
      scope: options.scope || 'this_document',
      timestamp: new Date(),
      userId: 'current-user', // Placeholder
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
    setDocuments(prev => {
      const updated = prev.map(d => d.id === updatedDoc.id ? updatedDoc : d);
      saveToStorage(updated);
      return updated;
    });
  }, [currentDocument]);

  const removeAnnotation = useCallback((chunkId: string) => {
    if (!currentDocument) return;

    const updatedDoc = {
      ...currentDocument,
      annotations: currentDocument.annotations.filter(a => a.chunkId !== chunkId),
    };

    setCurrentDocument(updatedDoc);
    setDocuments(prev => {
      const updated = prev.map(d => d.id === updatedDoc.id ? updatedDoc : d);
      saveToStorage(updated);
      return updated;
    });
  }, [currentDocument]);

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
  };
}
