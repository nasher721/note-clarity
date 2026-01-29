import { ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, DocumentChunk } from '@/types/clinical';

export const buildAnnotation = (
    chunk: DocumentChunk,
    label: PrimaryLabel,
    options: {
        removeReason?: RemoveReason;
        condenseStrategy?: CondenseStrategy;
        scope?: ChunkAnnotation['scope'];
    },
): ChunkAnnotation => ({
    chunkId: chunk.id,
    rawText: chunk.text,
    sectionType: chunk.type,
    label,
    removeReason: options.removeReason,
    condenseStrategy: options.condenseStrategy,
    scope: options.scope ?? 'this_document',
    timestamp: new Date(),
    userId: 'system',
});
