import { DocumentChunk, PrimaryLabel, RemoveReason, CondenseStrategy } from '@/types/clinical';
import { CandidateSignal, ModelSource } from './types';
import { getHeuristicLabel } from './heuristicRules';

export const buildCandidateSignals = (chunk: DocumentChunk): CandidateSignal[] => {
    const signals: CandidateSignal[] = [];
    const heuristic = getHeuristicLabel(chunk);
    if (heuristic.label && heuristic.confidence && heuristic.reason) {
        signals.push({
            label: heuristic.label,
            confidence: heuristic.confidence,
            reason: heuristic.reason,
            source: chunk.isCritical ? 'critical_safety' : 'heuristic_rules',
            removeReason: heuristic.removeReason,
            condenseStrategy: heuristic.condenseStrategy,
        });
    }

    if (chunk.suggestedLabel && chunk.confidence) {
        signals.push({
            label: chunk.suggestedLabel,
            confidence: Math.min(chunk.confidence + 0.04, 0.9),
            reason: 'Parser suggestion',
            source: 'heuristic_rules',
        });
    }

    return signals;
};

export const mergeSignals = (signals: CandidateSignal[]) => {
    if (!signals.length) return null;

    const grouped = new Map<PrimaryLabel, CandidateSignal[]>();
    for (const signal of signals) {
        const existing = grouped.get(signal.label) ?? [];
        existing.push(signal);
        grouped.set(signal.label, existing);
    }

    const ranked = Array.from(grouped.entries()).map(([label, items]) => {
        const avgConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length;

        // Boost confidence if multiple signals agree
        const boosted = Math.min(avgConfidence + Math.min(items.length * 0.05, 0.12), 0.97);

        return {
            label,
            confidence: boosted,
            reasons: items.map(item => item.reason),
            sources: items.map(item => item.source),
            removeReason: items.find(item => item.removeReason)?.removeReason,
            condenseStrategy: items.find(item => item.condenseStrategy)?.condenseStrategy,
        };
    });

    ranked.sort((a, b) => b.confidence - a.confidence);
    return ranked[0];
};

export const applyCriticalSafety = (chunk: DocumentChunk, candidate: CandidateSignal) => {
    if (!chunk.isCritical || candidate.label !== 'REMOVE') return candidate;

    return {
        ...candidate,
        label: 'KEEP' as PrimaryLabel,
        confidence: Math.max(candidate.confidence - 0.15, 0.6),
        reason: 'Critical content retained despite removal signal',
        source: 'critical_safety' as ModelSource,
        removeReason: undefined,
    };
};
