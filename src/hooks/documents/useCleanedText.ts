import { useCallback } from 'react';
import { ClinicalDocument } from '@/types/clinical';

/**
 * Hook for generating cleaned text from annotated documents
 */
export function useCleanedText(currentDocument: ClinicalDocument | null) {
  const getCleanedText = useCallback((): string => {
    if (!currentDocument) return '';

    return currentDocument.chunks
      .filter(chunk => {
        const annotation = currentDocument.annotations.find(a => a.chunkId === chunk.id);
        return !annotation || annotation.label !== 'REMOVE';
      })
      .map(chunk => {
        const annotation = currentDocument.annotations.find(a => a.chunkId === chunk.id);
        if (annotation?.label === 'CONDENSE') {
          return `[CONDENSED: ${chunk.text.substring(0, 50)}...]`;
        }
        return chunk.text;
      })
      .join('\n\n');
  }, [currentDocument]);

  return { getCleanedText };
}
