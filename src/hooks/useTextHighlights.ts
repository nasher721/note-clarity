import { useState, useCallback, useEffect } from 'react';
import { TextHighlight, PrimaryLabel } from '@/types/clinical';
import { supabase } from '@/integrations/supabase/client';

export function useTextHighlights(userId?: string, documentId?: string) {
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);
  const [loading, setLoading] = useState(false);

  // Load highlights from database when document changes
  useEffect(() => {
    if (!userId || !documentId) {
      setHighlights([]);
      return;
    }

    const loadHighlights = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('text_highlights')
          .select('*')
          .eq('document_id', documentId)
          .eq('user_id', userId);

        if (error) throw error;

        const loaded: TextHighlight[] = (data || []).map((h) => ({
          id: h.id,
          startIndex: h.start_index,
          endIndex: h.end_index,
          text: h.text,
          label: h.label as PrimaryLabel,
          removeReason: h.remove_reason as TextHighlight['removeReason'],
          condenseStrategy: h.condense_strategy as TextHighlight['condenseStrategy'],
          scope: h.scope as TextHighlight['scope'],
          timestamp: new Date(h.updated_at),
          userId: h.user_id,
        }));

        setHighlights(loaded);
      } catch (err) {
        console.error('Error loading highlights:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHighlights();
  }, [userId, documentId]);

  const addHighlight = useCallback(async (highlight: Omit<TextHighlight, 'id' | 'timestamp' | 'userId'>) => {
    if (!userId || !documentId) return;

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
      
      // Delete overlapping highlights from DB
      const idsToRemove = overlapping.map(h => h.id);
      await supabase
        .from('text_highlights')
        .delete()
        .in('id', idsToRemove);

      // Insert merged highlight
      const { data, error } = await supabase
        .from('text_highlights')
        .insert({
          document_id: documentId,
          user_id: userId,
          start_index: minStart,
          end_index: maxEnd,
          text: highlight.text,
          label: highlight.label,
          remove_reason: highlight.removeReason || null,
          condense_strategy: highlight.condenseStrategy || null,
          scope: highlight.scope,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding merged highlight:', error);
        return;
      }

      const newHighlight: TextHighlight = {
        id: data.id,
        startIndex: data.start_index,
        endIndex: data.end_index,
        text: data.text,
        label: data.label as PrimaryLabel,
        removeReason: data.remove_reason as TextHighlight['removeReason'],
        condenseStrategy: data.condense_strategy as TextHighlight['condenseStrategy'],
        scope: data.scope as TextHighlight['scope'],
        timestamp: new Date(data.updated_at),
        userId: data.user_id,
      };

      setHighlights(prev => [
        ...prev.filter(h => !idsToRemove.includes(h.id)),
        newHighlight,
      ]);
    } else {
      // Insert new highlight
      const { data, error } = await supabase
        .from('text_highlights')
        .insert({
          document_id: documentId,
          user_id: userId,
          start_index: highlight.startIndex,
          end_index: highlight.endIndex,
          text: highlight.text,
          label: highlight.label,
          remove_reason: highlight.removeReason || null,
          condense_strategy: highlight.condenseStrategy || null,
          scope: highlight.scope,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding highlight:', error);
        return;
      }

      const newHighlight: TextHighlight = {
        id: data.id,
        startIndex: data.start_index,
        endIndex: data.end_index,
        text: data.text,
        label: data.label as PrimaryLabel,
        removeReason: data.remove_reason as TextHighlight['removeReason'],
        condenseStrategy: data.condense_strategy as TextHighlight['condenseStrategy'],
        scope: data.scope as TextHighlight['scope'],
        timestamp: new Date(data.updated_at),
        userId: data.user_id,
      };

      setHighlights(prev => [...prev, newHighlight]);
    }
  }, [userId, documentId, highlights]);

  const removeHighlight = useCallback(async (highlightId: string) => {
    const { error } = await supabase
      .from('text_highlights')
      .delete()
      .eq('id', highlightId);

    if (error) {
      console.error('Error removing highlight:', error);
      return;
    }

    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  }, []);

  const updateHighlight = useCallback(async (highlightId: string, updates: Partial<TextHighlight>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.label) dbUpdates.label = updates.label;
    if (updates.removeReason !== undefined) dbUpdates.remove_reason = updates.removeReason;
    if (updates.condenseStrategy !== undefined) dbUpdates.condense_strategy = updates.condenseStrategy;
    if (updates.scope) dbUpdates.scope = updates.scope;

    const { error } = await supabase
      .from('text_highlights')
      .update(dbUpdates)
      .eq('id', highlightId);

    if (error) {
      console.error('Error updating highlight:', error);
      return;
    }

    setHighlights(prev => prev.map(h => 
      h.id === highlightId ? { ...h, ...updates, timestamp: new Date() } : h
    ));
  }, []);

  const clearHighlights = useCallback(async () => {
    if (!documentId) return;

    const { error } = await supabase
      .from('text_highlights')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      console.error('Error clearing highlights:', error);
      return;
    }

    setHighlights([]);
  }, [documentId]);

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
    loading,
    addHighlight,
    removeHighlight,
    updateHighlight,
    clearHighlights,
    getStats,
  };
}
