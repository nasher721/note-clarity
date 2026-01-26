
import { useState, useEffect, useMemo } from 'react';
import { ClinicalDocument, ChunkAnnotation } from '@/types/clinical';
import { buildModelAnnotations, ModelExplanation } from '@/utils/inferenceModel';

interface UseCopilotProps {
    document: ClinicalDocument | null;
    learnedRules: ChunkAnnotation[];
    isEnabled?: boolean;
}

interface Suggestion {
    annotation: ChunkAnnotation;
    explanation: ModelExplanation;
}

export function useCopilot({ document, learnedRules, isEnabled = true }: UseCopilotProps) {
    const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
    const [isComputing, setIsComputing] = useState(false);

    useEffect(() => {
        if (!document || !isEnabled || learnedRules === undefined) {
            setSuggestions({});
            return;
        }

        setIsComputing(true);

        // Simulate async computation to avoid blocking UI
        const timer = setTimeout(async () => {
            try {
                const { annotations, explanations } = await buildModelAnnotations({
                    chunks: document.chunks,
                    learnedAnnotations: learnedRules,
                    noteType: document.noteType,
                    service: document.service,
                });

                const newSuggestions: Record<string, Suggestion> = {};

                // Only suggest for chunks that are NOT already annotated
                const existingAnnotations = new Set(document.annotations.map(a => a.chunkId));

                annotations.forEach(annotation => {
                    if (!existingAnnotations.has(annotation.chunkId)) {
                        newSuggestions[annotation.chunkId] = {
                            annotation: { ...annotation, userId: 'copilot' },
                            explanation: explanations[annotation.chunkId],
                        };
                    }
                });

                setSuggestions(newSuggestions);
            } catch (err) {
                console.error('Copilot inference error:', err);
            } finally {
                setIsComputing(false);
            }
        }, 100); // Small delay to yield to main thread

        return () => clearTimeout(timer);
    }, [document, learnedRules, isEnabled]);

    // If document annotations change (user accepts/rejects), remove that suggestion
    useEffect(() => {
        if (!document) return;

        setSuggestions(prev => {
            const next = { ...prev };
            let changed = false;

            document.annotations.forEach(a => {
                if (next[a.chunkId]) {
                    delete next[a.chunkId];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [document?.annotations]);

    return {
        suggestions,
        isComputing
    };
}
