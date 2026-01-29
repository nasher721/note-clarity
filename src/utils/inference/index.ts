import { DocumentChunk, ChunkAnnotation } from '@/types/clinical';
import { ModelExplanation, ExtractedField, MatchResult } from './types';
import { buildCandidateSignals, mergeSignals, applyCriticalSafety } from './signalFusion';
import { getLearnedSuggestion } from './similarity';
import { extractFieldsFromChunk, dedupeExtractedFields } from './fieldExtraction';
import { buildAnnotation } from './annotationBuilder';
import { findDuplicates } from '@/utils/chunkParser';

export * from './types';
export * from './textUtils';
export * from './fieldExtraction';
export * from './heuristicRules';
export * from './similarity';
export * from './signalFusion';
export * from './analytics';

const getDuplicateSuggestion = (chunk: DocumentChunk, duplicates: Set<string>): MatchResult | null => {
    if (!duplicates.has(chunk.id)) return null;

    const annotation = buildAnnotation(chunk, 'REMOVE', {
        removeReason: 'duplicate_data',
        scope: 'this_document',
    });

    return {
        annotation,
        explanation: {
            source: 'duplicate_detector',
            confidence: 0.74,
            reason: 'Repeated text detected in note',
            signals: ['Text overlaps earlier section'],
        },
    };
};

export const buildModelAnnotations = async ({
    chunks,
    learnedAnnotations,
    noteType,
    service,
    patternRules,
}: {
    chunks: DocumentChunk[];
    learnedAnnotations: ChunkAnnotation[];
    noteType?: string;
    service?: string;
    patternRules?: any[];
}) => {
    const annotations: ChunkAnnotation[] = [];
    const explanations: Record<string, ModelExplanation> = {};
    const extractedFields: ExtractedField[] = [];

    const duplicates = findDuplicates(chunks);

    for (const chunk of chunks) {
        extractedFields.push(...extractFieldsFromChunk(chunk));

        const learned = await getLearnedSuggestion(chunk, learnedAnnotations, noteType, service);
        if (learned) {
            annotations.push(learned.annotation);
            explanations[chunk.id] = learned.explanation;
            continue;
        }

        const duplicateSuggestion = getDuplicateSuggestion(chunk, duplicates);
        if (duplicateSuggestion) {
            annotations.push(duplicateSuggestion.annotation);
            explanations[chunk.id] = duplicateSuggestion.explanation;
            continue;
        }

        const candidates = buildCandidateSignals(chunk);
        const merged = mergeSignals(candidates);
        if (merged) {
            const safeCandidate = applyCriticalSafety(chunk, {
                label: merged.label,
                confidence: merged.confidence,
                reason: merged.reasons[0] ?? 'Composite heuristic',
                source: merged.sources.length > 1 ? 'combined_signals' : merged.sources[0],
                removeReason: merged.removeReason, // Types match now
                condenseStrategy: merged.condenseStrategy, // Types match now
            });
            const annotation = buildAnnotation(chunk, safeCandidate.label, {
                removeReason: safeCandidate.removeReason,
                condenseStrategy: safeCandidate.condenseStrategy,
            });
            annotations.push(annotation);
            explanations[chunk.id] = {
                source: safeCandidate.source,
                confidence: safeCandidate.confidence,
                reason: safeCandidate.reason,
                signals: merged.reasons.slice(0, 3),
            };
        }
    }

    return { annotations, explanations, extractedFields: dedupeExtractedFields(extractedFields) };
};
