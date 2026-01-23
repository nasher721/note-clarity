import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocuments } from '../useDocuments';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

// Mock PHI audit log
vi.mock('@/hooks/usePhiAuditLog', () => ({
  usePhiAuditLog: () => ({
    logDocumentAccess: vi.fn(),
    logChunkAccess: vi.fn(),
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('useDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state when no userId', () => {
    const { result } = renderHook(() => useDocuments(undefined));

    expect(result.current.documents).toEqual([]);
    expect(result.current.currentDocument).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should provide selectDocument function', () => {
    const { result } = renderHook(() => useDocuments('user-123'));

    expect(typeof result.current.selectDocument).toBe('function');
  });

  it('should provide updateDocumentInList function', () => {
    const { result } = renderHook(() => useDocuments('user-123'));

    expect(typeof result.current.updateDocumentInList).toBe('function');
  });

  it('should provide addDocumentToList function', () => {
    const { result } = renderHook(() => useDocuments('user-123'));

    expect(typeof result.current.addDocumentToList).toBe('function');
  });

  it('should set currentDocument to null when selecting empty docId', () => {
    const { result } = renderHook(() => useDocuments('user-123'));

    result.current.selectDocument('');

    expect(result.current.currentDocument).toBeNull();
  });

  it('should clear documents when userId becomes undefined', async () => {
    const { result, rerender } = renderHook(
      ({ userId }) => useDocuments(userId),
      { initialProps: { userId: 'user-123' } }
    );

    await act(async () => {
      rerender({ userId: undefined });
    });

    expect(result.current.documents).toEqual([]);
    expect(result.current.currentDocument).toBeNull();
  });
});
