import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnnotations } from '../useAnnotations';
import { ClinicalDocument } from '@/types/clinical';

// Mock Supabase client
const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));
const mockDelete = vi.fn(() => ({
  eq: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'chunk_annotations') {
        return {
          upsert: mockUpsert,
          delete: mockDelete,
        };
      }
      if (table === 'learned_rules') {
        return {
          upsert: vi.fn(() => Promise.resolve({ error: null })),
        };
      }
      return {};
    }),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const createMockDocument = (): ClinicalDocument => ({
  id: 'doc-1',
  originalText: 'Test document text',
  chunks: [
    {
      id: 'chunk-1',
      text: 'First chunk',
      type: 'paragraph',
      startIndex: 0,
      endIndex: 11,
      isCritical: false,
    },
    {
      id: 'chunk-2',
      text: 'Second chunk',
      type: 'medication_list',
      startIndex: 12,
      endIndex: 24,
      isCritical: false,
    },
  ],
  annotations: [],
  createdAt: new Date(),
});

describe('useAnnotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return annotation functions', () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useAnnotations('user-123', createMockDocument(), mockOnUpdate)
    );

    expect(typeof result.current.annotateChunk).toBe('function');
    expect(typeof result.current.bulkAnnotateChunks).toBe('function');
    expect(typeof result.current.removeAnnotation).toBe('function');
    expect(typeof result.current.getAnnotation).toBe('function');
  });

  it('should return undefined for non-existent annotation', () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useAnnotations('user-123', createMockDocument(), mockOnUpdate)
    );

    const annotation = result.current.getAnnotation('non-existent');
    expect(annotation).toBeUndefined();
  });

  it('should return existing annotation', () => {
    const mockOnUpdate = vi.fn();
    const docWithAnnotation: ClinicalDocument = {
      ...createMockDocument(),
      annotations: [
        {
          chunkId: 'chunk-1',
          rawText: 'First chunk',
          sectionType: 'paragraph',
          label: 'KEEP',
          scope: 'this_document',
          timestamp: new Date(),
          userId: 'user-123',
        },
      ],
    };

    const { result } = renderHook(() =>
      useAnnotations('user-123', docWithAnnotation, mockOnUpdate)
    );

    const annotation = result.current.getAnnotation('chunk-1');
    expect(annotation).toBeDefined();
    expect(annotation?.label).toBe('KEEP');
  });

  it('should not annotate when no document', async () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useAnnotations('user-123', null, mockOnUpdate)
    );

    await act(async () => {
      await result.current.annotateChunk('chunk-1', 'KEEP');
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should not annotate when no userId', async () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useAnnotations(undefined, createMockDocument(), mockOnUpdate)
    );

    await act(async () => {
      await result.current.annotateChunk('chunk-1', 'KEEP');
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should not bulk annotate with empty chunk list', async () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useAnnotations('user-123', createMockDocument(), mockOnUpdate)
    );

    await act(async () => {
      await result.current.bulkAnnotateChunks([], 'KEEP');
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should not remove annotation when no document', async () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useAnnotations('user-123', null, mockOnUpdate)
    );

    await act(async () => {
      await result.current.removeAnnotation('chunk-1');
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });
});
