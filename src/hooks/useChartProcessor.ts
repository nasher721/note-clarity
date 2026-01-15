import { useState, useCallback, useMemo } from 'react';
import { ClinicalDocument, DocumentChunk, ChunkAnnotation } from '@/types/clinical';
import { ParsedNote } from '@/utils/chartParser';
import { parseDocument } from '@/utils/chunkParser';
import { ChartNoteItem } from '@/components/clinical/ChartQueuePanel';

interface ChartNote {
  id: string;
  noteType: string;
  dateTime?: string;
  document: ClinicalDocument;
}

interface ChartState {
  patientId: string;
  notes: ChartNote[];
  currentIndex: number;
}

export function useChartProcessor(userId?: string) {
  const [chartState, setChartState] = useState<ChartState | null>(null);

  const loadChart = useCallback((patientId: string, parsedNotes: ParsedNote[]) => {
    const notes: ChartNote[] = parsedNotes.map(note => {
      const chunks = parseDocument(note.text);
      return {
        id: note.id,
        noteType: note.noteType,
        dateTime: note.dateTime,
        document: {
          id: note.id,
          originalText: note.text,
          chunks,
          annotations: [],
          createdAt: new Date(),
          noteType: note.noteType,
        },
      };
    });

    setChartState({
      patientId,
      notes,
      currentIndex: 0,
    });
  }, []);

  const clearChart = useCallback(() => {
    setChartState(null);
  }, []);

  const goToNote = useCallback((index: number) => {
    setChartState(prev => {
      if (!prev) return null;
      const clampedIndex = Math.max(0, Math.min(index, prev.notes.length - 1));
      return { ...prev, currentIndex: clampedIndex };
    });
  }, []);

  const nextNote = useCallback(() => {
    setChartState(prev => {
      if (!prev || prev.currentIndex >= prev.notes.length - 1) return prev;
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, []);

  const prevNote = useCallback(() => {
    setChartState(prev => {
      if (!prev || prev.currentIndex <= 0) return prev;
      return { ...prev, currentIndex: prev.currentIndex - 1 };
    });
  }, []);

  const annotateChunk = useCallback(async (chunkId: string, label: ChunkAnnotation['label'], options?: Partial<ChunkAnnotation>) => {
    if (!userId) return;

    setChartState(prev => {
      if (!prev) return null;

      const currentNote = prev.notes[prev.currentIndex];
      const chunk = currentNote.document.chunks.find(c => c.id === chunkId);
      if (!chunk) return prev;

      const existingIndex = currentNote.document.annotations.findIndex(a => a.chunkId === chunkId);
      
      const newAnnotation: ChunkAnnotation = {
        chunkId,
        rawText: chunk.text,
        sectionType: chunk.type,
        label,
        scope: options?.scope || 'this_document',
        timestamp: new Date(),
        userId,
        removeReason: options?.removeReason,
        condenseStrategy: options?.condenseStrategy,
        overrideJustification: options?.overrideJustification,
      };

      const newAnnotations = [...currentNote.document.annotations];
      if (existingIndex >= 0) {
        newAnnotations[existingIndex] = newAnnotation;
      } else {
        newAnnotations.push(newAnnotation);
      }

      const updatedNotes = [...prev.notes];
      updatedNotes[prev.currentIndex] = {
        ...currentNote,
        document: {
          ...currentNote.document,
          annotations: newAnnotations,
        },
      };

      return { ...prev, notes: updatedNotes };
    });
  }, [userId]);

  const bulkAnnotateChunks = useCallback(async (chunkIds: string[], label: ChunkAnnotation['label'], options?: Partial<ChunkAnnotation>) => {
    for (const id of chunkIds) {
      await annotateChunk(id, label, options);
    }
  }, [annotateChunk]);

  const removeAnnotation = useCallback((chunkId: string) => {
    setChartState(prev => {
      if (!prev) return null;

      const currentNote = prev.notes[prev.currentIndex];
      const newAnnotations = currentNote.document.annotations.filter(a => a.chunkId !== chunkId);

      const updatedNotes = [...prev.notes];
      updatedNotes[prev.currentIndex] = {
        ...currentNote,
        document: {
          ...currentNote.document,
          annotations: newAnnotations,
        },
      };

      return { ...prev, notes: updatedNotes };
    });
  }, []);

  const getAnnotation = useCallback((chunkId: string): ChunkAnnotation | undefined => {
    if (!chartState) return undefined;
    return chartState.notes[chartState.currentIndex]?.document.annotations.find(a => a.chunkId === chunkId);
  }, [chartState]);

  const currentNote = useMemo(() => {
    return chartState?.notes[chartState.currentIndex] || null;
  }, [chartState]);

  const noteItems: ChartNoteItem[] = useMemo(() => {
    if (!chartState) return [];
    return chartState.notes.map(note => ({
      id: note.id,
      noteType: note.noteType,
      dateTime: note.dateTime,
      status: note.document.annotations.length > 0 ? 'completed' as const : 'pending' as const,
      annotationCount: note.document.annotations.length,
      chunkCount: note.document.chunks.length,
    }));
  }, [chartState]);

  const stats = useMemo(() => {
    if (!chartState) return { total: 0, labeled: 0, totalChunks: 0, totalAnnotations: 0 };
    
    const labeled = chartState.notes.filter(n => n.document.annotations.length > 0).length;
    const totalChunks = chartState.notes.reduce((sum, n) => sum + n.document.chunks.length, 0);
    const totalAnnotations = chartState.notes.reduce((sum, n) => sum + n.document.annotations.length, 0);
    
    return {
      total: chartState.notes.length,
      labeled,
      totalChunks,
      totalAnnotations,
    };
  }, [chartState]);

  return {
    // State
    chartState,
    patientId: chartState?.patientId || '',
    currentIndex: chartState?.currentIndex || 0,
    currentNote,
    currentDocument: currentNote?.document || null,
    noteItems,
    stats,
    isLoaded: chartState !== null,

    // Actions
    loadChart,
    clearChart,
    goToNote,
    nextNote,
    prevNote,
    annotateChunk,
    bulkAnnotateChunks,
    removeAnnotation,
    getAnnotation,
  };
}
