import { ChunkAnnotation, DocumentChunk } from '@/types/clinical';
import { SemanticSearchService } from '@/services/semanticSearchService';
import { MatchResult } from './types';
import { normalizeText, jaccardSimilarity } from './textUtils';
import { buildAnnotation } from './annotationBuilder';

const scopeWeight = (scope: ChunkAnnotation['scope'], noteType?: string, service?: string) => {
    if (scope === 'note_type') return noteType ? 0.95 : 0.75;
    if (scope === 'service') return service ? 0.9 : 0.7;
    if (scope === 'global') return 0.85;
    return 0.8;
};

const getSimilarityMatch = async (
    chunk: DocumentChunk,
    learnedAnnotations: ChunkAnnotation[],
    noteType?: string,
    service?: string,
) => {
    const normalizedChunk = normalizeText(chunk.text);

    // 1. Exact exact match first (cheapest)
    for (const annotation of learnedAnnotations) {
        if (normalizeText(annotation.rawText) === normalizedChunk) {
            return { annotation, score: 1 };
        }
    }

    // 2. Semantic Search (Most accurate, expensive)
    try {
        const model = await SemanticSearchService.getModel(); // Check if loaded
        if (model) { // Only proceed if model service is actively available/loaded
            const texts = [chunk.text, ...learnedAnnotations.map(a => a.rawText)];
            const embeddings = await SemanticSearchService.embed(texts);

            const chunkEmbedding = embeddings[0];
            const ruleEmbeddings = embeddings.slice(1);

            let bestSemMatch: { annotation: ChunkAnnotation; score: number } | null = null;

            ruleEmbeddings.forEach((embedding, i) => {
                const score = SemanticSearchService.cosineSimilarity(chunkEmbedding, embedding);
                if (score > 0.75) { // Threshold for semantic match
                    const annotation = learnedAnnotations[i];
                    const weighted = score * scopeWeight(annotation.scope, noteType, service);
                    if (!bestSemMatch || weighted > bestSemMatch.score) {
                        bestSemMatch = { annotation, score: weighted };
                    }
                }
            });

            if (bestSemMatch) return bestSemMatch;
        }

    } catch (e) {
        // Fallback if model failed or not loaded
        console.warn('Semantic search failed, falling back to Jaccard', e);
    }

    // 3. Jaccard Index (Fallback)
    let bestMatch: { annotation: ChunkAnnotation; score: number } | null = null;
    for (const annotation of learnedAnnotations) {
        const similarity = jaccardSimilarity(chunk.text, annotation.rawText);
        if (similarity < 0.5) continue;

        const weighted = similarity * scopeWeight(annotation.scope, noteType, service);
        if (!bestMatch || weighted > bestMatch.score) {
            bestMatch = { annotation, score: weighted };
        }
    }

    return bestMatch;
};

export const getLearnedSuggestion = async (
    chunk: DocumentChunk,
    learnedAnnotations: ChunkAnnotation[],
    noteType?: string,
    service?: string,
): Promise<MatchResult | null> => {
    if (!learnedAnnotations.length) return null;

    const match = await getSimilarityMatch(chunk, learnedAnnotations, noteType, service);
    if (!match) return null;

    if (match.score < 0.7) return null;

    const annotation = buildAnnotation(chunk, match.annotation.label, {
        removeReason: match.annotation.removeReason,
        condenseStrategy: match.annotation.condenseStrategy,
        scope: match.annotation.scope,
    });

    return {
        annotation,
        explanation: {
            source: match.score >= 0.95 ? 'learned_exact' : 'learned_similar',
            confidence: Math.min(match.score, 0.95),
            reason: match.score >= 0.95 ? 'Exact match to learned rule' : 'Similar wording to learned rule',
            signals: [
                `Scope: ${match.annotation.scope.replace(/_/g, ' ')}`,
                `Similarity: ${Math.round(match.score * 100)}%`,
            ],
        },
    };
};
