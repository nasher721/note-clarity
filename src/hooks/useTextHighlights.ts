import { useState, useCallback } from 'react';
import { TextHighlight, PrimaryLabel } from '@/types/clinical';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function useTextHighlights(userId?: string) {
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);

  const addHighlight = useCallback((highlight: Omit<TextHighlight, 'id' | 'timestamp' | 'userId'>) => {
    if (!userId) return;

    // Check for overlapping highlights with same label - merge them
    const overlapping = highlights.filter(
      h => h.label === highlight.label &&
           ((h.startIndex <= highlight.startIndex && h.endIndex >= highlight.startIndex) ||
            (h.startIndex <= highlight.endIndex && h.endIndex >= highlight.endIndex) ||
            (h.startIndex >= highlight.startIndex && h.endIndex <= highlight.endIndex))
    );

    if (overlapping.length > 0) {
      // Merge all overlapping highlights
      const minStart = Math.min(highlight.startIndex, ...overlapping.map(h => h.startIndex));
      const maxEnd = Math.max(highlight.endIndex, ...overlapping.map(h => h.endIndex));
      
      // Remove overlapping highlights
      const idsToRemove = new Set(overlapping.map(h => h.id));
      
      setHighlights(prev => [
        ...prev.filter(h => !idsToRemove.has(h.id)),
        {
          ...highlight,
          id: generateId(),
          startIndex: minStart,
          endIndex: maxEnd,
          text: highlight.text, // Will need to be updated with full text
          timestamp: new Date(),
          userId,
        },
      ]);
    } else {
      setHighlights(prev => [
        ...prev,
        {
          ...highlight,
          id: generateId(),
          timestamp: new Date(),
          userId,
        },
      ]);
    }
  }, [userId, highlights]);

  const removeHighlight = useCallback((highlightId: string) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  }, []);

  const updateHighlight = useCallback((highlightId: string, updates: Partial<TextHighlight>) => {
    setHighlights(prev => prev.map(h => 
      h.id === highlightId ? { ...h, ...updates, timestamp: new Date() } : h
    ));
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  const getStats = useCallback(() => {
    const byLabel = highlights.reduce((acc, h) => {
      acc[h.label] = (acc[h.label] || 0) + 1;
      return acc;
    }, {} as Record<PrimaryLabel, number>);

    return {
      total: highlights.length,
      keep: byLabel.KEEP || 0,
      condense: byLabel.CONDENSE || 0,
      remove: byLabel.REMOVE || 0,
    };
  }, [highlights]);

  return {
    highlights,
    addHighlight,
    removeHighlight,
    updateHighlight,
    clearHighlights,
    getStats,
  };
}
