import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChunkAnnotation, 
  PrimaryLabel, 
  RemoveReason, 
  CondenseStrategy, 
  LabelScope 
} from '@/types/clinical';

/**
 * Hook for fetching and managing learned annotation rules
 */
export function useLearnedRules(userId: string | undefined) {
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
      if (import.meta.env.DEV) {
        console.error('Failed to load learned rules:', error);
      }
      return [];
    }
  }, [userId]);

  return { getLearnedRules };
}
