import { useState, useCallback, useEffect } from 'react';
import {
  ActiveLearningService,
  FeedbackPayload,
  FeedbackType,
  ModelMetrics,
  ModelPrediction,
  PatternRule
} from '@/services/activeLearningService';
import { ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy } from '@/types/clinical';
import { ModelExplanation } from '@/utils/inferenceModel';
import { toast } from '@/hooks/use-toast';

interface UseActiveLearningOptions {
  userId: string | undefined;
  documentId?: string;
  noteType?: string;
  service?: string;
}

export function useActiveLearning({
  userId,
  documentId,
  noteType,
  service,
}: UseActiveLearningOptions) {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [patternRules, setPatternRules] = useState<PatternRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confusionMatrix, setConfusionMatrix] = useState<Record<string, Record<string, number>> | null>(null);

  // Load metrics on mount
  useEffect(() => {
    if (userId) {
      loadMetrics();
      loadPatternRules();
    }
  }, [userId]);

  const loadMetrics = useCallback(async () => {
    if (!userId) return;

    try {
      const data = await ActiveLearningService.getMetrics(userId);
      setMetrics(data);

      const matrix = await ActiveLearningService.getConfusionMatrix(userId);
      setConfusionMatrix(matrix);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }, [userId]);

  const loadPatternRules = useCallback(async () => {
    if (!userId) return;

    try {
      const rules = await ActiveLearningService.getPatternRules(userId);
      setPatternRules(rules);
    } catch (error) {
      console.error('Failed to load pattern rules:', error);
    }
  }, [userId]);

  /**
   * Record feedback when user accepts a model prediction
   */
  const acceptPrediction = useCallback(async (
    annotation: ChunkAnnotation,
    explanation: ModelExplanation,
  ) => {
    if (!userId || !documentId) return;

    const prediction: ModelPrediction = {
      chunkId: annotation.chunkId,
      chunkText: annotation.rawText,
      chunkType: annotation.sectionType,
      predictedLabel: annotation.label,
      predictedConfidence: explanation.confidence,
      predictionSource: explanation.source,
      removeReason: annotation.removeReason,
      condenseStrategy: annotation.condenseStrategy,
    };

    const payload: FeedbackPayload = {
      prediction,
      feedbackType: 'accept',
      documentId,
      noteType,
      service,
    };

    try {
      await ActiveLearningService.recordFeedback(userId, payload);
      // Refresh metrics after feedback
      loadMetrics();
    } catch (error) {
      console.error('Failed to record acceptance:', error);
    }
  }, [userId, documentId, noteType, service, loadMetrics]);

  /**
   * Record feedback when user rejects a model prediction
   */
  const rejectPrediction = useCallback(async (
    annotation: ChunkAnnotation,
    explanation: ModelExplanation,
    correctedLabel: PrimaryLabel,
    correctedRemoveReason?: RemoveReason,
    correctedCondenseStrategy?: CondenseStrategy,
  ) => {
    if (!userId || !documentId) return;

    const prediction: ModelPrediction = {
      chunkId: annotation.chunkId,
      chunkText: annotation.rawText,
      chunkType: annotation.sectionType,
      predictedLabel: annotation.label,
      predictedConfidence: explanation.confidence,
      predictionSource: explanation.source,
      removeReason: annotation.removeReason,
      condenseStrategy: annotation.condenseStrategy,
    };

    const feedbackType: FeedbackType = correctedLabel === annotation.label ? 'modify' : 'reject';

    const payload: FeedbackPayload = {
      prediction,
      feedbackType,
      correctedLabel,
      correctedRemoveReason,
      correctedCondenseStrategy,
      documentId,
      noteType,
      service,
    };

    try {
      await ActiveLearningService.recordFeedback(userId, payload);
      loadMetrics();

      toast({
        title: 'Feedback recorded',
        description: 'Your correction will improve future predictions.',
      });
    } catch (error) {
      console.error('Failed to record rejection:', error);
      toast({
        title: 'Failed to record feedback',
        variant: 'destructive',
      });
    }
  }, [userId, documentId, noteType, service, loadMetrics]);

  /**
   * Generate pattern rules from annotation history
   */
  const generatePatterns = useCallback(async () => {
    if (!userId) return [];

    setIsLoading(true);
    try {
      const patterns = await ActiveLearningService.generatePatternsFromAnnotations(userId);

      if (patterns.length === 0) {
        toast({
          title: 'No patterns found',
          description: 'Make more corrections to generate patterns.',
        });
        return [];
      }

      toast({
        title: 'Patterns generated',
        description: `Found ${patterns.length} potential patterns.`,
      });

      return patterns;
    } catch (error) {
      console.error('Failed to generate patterns:', error);
      toast({
        title: 'Failed to generate patterns',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Save generated patterns to database
   */
  const savePatterns = useCallback(async (patterns: PatternRule[]) => {
    if (!userId || patterns.length === 0) return;

    setIsLoading(true);
    try {
      await ActiveLearningService.savePatternRules(userId, patterns);
      await loadPatternRules();

      toast({
        title: 'Patterns saved',
        description: `Saved ${patterns.length} new pattern rules.`,
      });
    } catch (error) {
      console.error('Failed to save patterns:', error);
      toast({
        title: 'Failed to save patterns',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadPatternRules]);

  /**
   * Toggle a pattern rule on/off
   */
  const togglePattern = useCallback(async (ruleId: string, isActive: boolean) => {
    try {
      await ActiveLearningService.togglePatternRule(ruleId, isActive);
      await loadPatternRules();
    } catch (error) {
      console.error('Failed to toggle pattern:', error);
      toast({
        title: 'Failed to update pattern',
        variant: 'destructive',
      });
    }
  }, [loadPatternRules]);

  /**
   * Delete a pattern rule
   */
  const deletePattern = useCallback(async (ruleId: string) => {
    try {
      await ActiveLearningService.deletePatternRule(ruleId);
      await loadPatternRules();

      toast({
        title: 'Pattern deleted',
      });
    } catch (error) {
      console.error('Failed to delete pattern:', error);
      toast({
        title: 'Failed to delete pattern',
        variant: 'destructive',
      });
    }
  }, [loadPatternRules]);

  return {
    metrics,
    patternRules,
    confusionMatrix,
    isLoading,
    acceptPrediction,
    rejectPrediction,
    generatePatterns,
    savePatterns,
    togglePattern,
    deletePattern,
    refreshMetrics: loadMetrics,
    refreshPatterns: loadPatternRules,
  };
}
