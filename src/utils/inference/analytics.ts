import { ChunkAnnotation, PrimaryLabel } from '@/types/clinical';
import { ModelExplanation, ModelSource } from './types';

export const getInferenceStats = (
    annotations: ChunkAnnotation[],
    explanations: Record<string, ModelExplanation>
) => {
    const sources = Object.values(explanations).map(e => e.source);
    const confidences = Object.values(explanations).map(e => e.confidence);

    const sourceDistribution: Record<ModelSource, number> = {
        learned_exact: 0,
        learned_similar: 0,
        pattern_rule: 0,
        duplicate_detector: 0,
        heuristic_rules: 0,
        critical_safety: 0,
        combined_signals: 0,
    };

    for (const source of sources) {
        if (sourceDistribution[source] !== undefined) {
            sourceDistribution[source]++;
        }
    }

    const labelDistribution: Record<PrimaryLabel, number> = {
        KEEP: 0,
        CONDENSE: 0,
        REMOVE: 0,
    };

    for (const annotation of annotations) {
        if (labelDistribution[annotation.label] !== undefined) {
            labelDistribution[annotation.label]++;
        }
    }

    return {
        totalChunks: annotations.length,
        avgConfidence: confidences.length > 0
            ? confidences.reduce((a, b) => a + b, 0) / confidences.length
            : 0,
        sourceDistribution,
        labelDistribution,
    };
};
