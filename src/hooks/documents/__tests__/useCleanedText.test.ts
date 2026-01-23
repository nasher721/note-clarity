import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCleanedText } from '../useCleanedText';
import { ClinicalDocument } from '@/types/clinical';

const createMockDocument = (annotations: any[] = []): ClinicalDocument => ({
  id: 'doc-1',
  originalText: 'Test document text',
  chunks: [
    {
      id: 'chunk-1',
      text: 'First chunk content',
      type: 'paragraph',
      startIndex: 0,
      endIndex: 19,
      isCritical: false,
    },
    {
      id: 'chunk-2',
      text: 'Second chunk content',
      type: 'medication_list',
      startIndex: 20,
      endIndex: 40,
      isCritical: false,
    },
    {
      id: 'chunk-3',
      text: 'Third chunk content',
      type: 'vital_signs',
      startIndex: 41,
      endIndex: 60,
      isCritical: false,
    },
  ],
  annotations,
  createdAt: new Date(),
});

describe('useCleanedText', () => {
  it('should return empty string when no document', () => {
    const { result } = renderHook(() => useCleanedText(null));

    const cleanedText = result.current.getCleanedText();
    expect(cleanedText).toBe('');
  });

  it('should return all chunks joined when no annotations', () => {
    const doc = createMockDocument();
    const { result } = renderHook(() => useCleanedText(doc));

    const cleanedText = result.current.getCleanedText();
    expect(cleanedText).toContain('First chunk content');
    expect(cleanedText).toContain('Second chunk content');
    expect(cleanedText).toContain('Third chunk content');
  });

  it('should exclude chunks with REMOVE label', () => {
    const doc = createMockDocument([
      {
        chunkId: 'chunk-2',
        rawText: 'Second chunk content',
        sectionType: 'medication_list',
        label: 'REMOVE',
        scope: 'this_document',
        timestamp: new Date(),
        userId: 'user-123',
      },
    ]);

    const { result } = renderHook(() => useCleanedText(doc));

    const cleanedText = result.current.getCleanedText();
    expect(cleanedText).toContain('First chunk content');
    expect(cleanedText).not.toContain('Second chunk content');
    expect(cleanedText).toContain('Third chunk content');
  });

  it('should condense chunks with CONDENSE label', () => {
    const doc = createMockDocument([
      {
        chunkId: 'chunk-1',
        rawText: 'First chunk content',
        sectionType: 'paragraph',
        label: 'CONDENSE',
        scope: 'this_document',
        timestamp: new Date(),
        userId: 'user-123',
      },
    ]);

    const { result } = renderHook(() => useCleanedText(doc));

    const cleanedText = result.current.getCleanedText();
    expect(cleanedText).toContain('[CONDENSED:');
    expect(cleanedText).toContain('Second chunk content');
    expect(cleanedText).toContain('Third chunk content');
  });

  it('should keep chunks with KEEP label unchanged', () => {
    const doc = createMockDocument([
      {
        chunkId: 'chunk-1',
        rawText: 'First chunk content',
        sectionType: 'paragraph',
        label: 'KEEP',
        scope: 'this_document',
        timestamp: new Date(),
        userId: 'user-123',
      },
    ]);

    const { result } = renderHook(() => useCleanedText(doc));

    const cleanedText = result.current.getCleanedText();
    expect(cleanedText).toContain('First chunk content');
    expect(cleanedText).toContain('Second chunk content');
    expect(cleanedText).toContain('Third chunk content');
  });

  it('should handle multiple annotations correctly', () => {
    const doc = createMockDocument([
      {
        chunkId: 'chunk-1',
        rawText: 'First chunk content',
        sectionType: 'paragraph',
        label: 'KEEP',
        scope: 'this_document',
        timestamp: new Date(),
        userId: 'user-123',
      },
      {
        chunkId: 'chunk-2',
        rawText: 'Second chunk content',
        sectionType: 'medication_list',
        label: 'REMOVE',
        scope: 'this_document',
        timestamp: new Date(),
        userId: 'user-123',
      },
      {
        chunkId: 'chunk-3',
        rawText: 'Third chunk content',
        sectionType: 'vital_signs',
        label: 'CONDENSE',
        scope: 'this_document',
        timestamp: new Date(),
        userId: 'user-123',
      },
    ]);

    const { result } = renderHook(() => useCleanedText(doc));

    const cleanedText = result.current.getCleanedText();
    expect(cleanedText).toContain('First chunk content');
    expect(cleanedText).not.toContain('Second chunk content');
    expect(cleanedText).toContain('[CONDENSED:');
  });

  it('should join chunks with double newlines', () => {
    const doc = createMockDocument();
    const { result } = renderHook(() => useCleanedText(doc));

    const cleanedText = result.current.getCleanedText();
    expect(cleanedText).toContain('\n\n');
  });
});
