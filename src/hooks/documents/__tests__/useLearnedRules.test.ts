import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLearnedRules } from '../useLearnedRules';

// Mock Supabase client
const mockSelect = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: mockSelect,
      })),
    })),
  },
}));

describe('useLearnedRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no userId', async () => {
    const { result } = renderHook(() => useLearnedRules(undefined));

    let rules: any[] = [];
    await act(async () => {
      rules = await result.current.getLearnedRules();
    });

    expect(rules).toEqual([]);
  });

  it('should provide getLearnedRules function', () => {
    const { result } = renderHook(() => useLearnedRules('user-123'));

    expect(typeof result.current.getLearnedRules).toBe('function');
  });

  it('should return empty array on error', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });

    const { result } = renderHook(() => useLearnedRules('user-123'));

    let rules: any[] = [];
    await act(async () => {
      rules = await result.current.getLearnedRules();
    });

    expect(rules).toEqual([]);
  });

  it('should transform database rules to ChunkAnnotation format', async () => {
    const mockDbRules = [
      {
        id: 'rule-1',
        pattern_text: 'test pattern',
        chunk_type: 'narrative',
        label: 'REMOVE',
        remove_reason: 'duplicate',
        condense_strategy: null,
        scope: 'this_note_type',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123',
      },
    ];

    mockSelect.mockResolvedValueOnce({ data: mockDbRules, error: null });

    const { result } = renderHook(() => useLearnedRules('user-123'));

    let rules: any[] = [];
    await act(async () => {
      rules = await result.current.getLearnedRules();
    });

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      chunkId: 'rule-1',
      rawText: 'test pattern',
      sectionType: 'narrative',
      label: 'REMOVE',
      removeReason: 'duplicate',
      scope: 'this_note_type',
      userId: 'user-123',
    });
  });

  it('should handle null data gracefully', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useLearnedRules('user-123'));

    let rules: any[] = [];
    await act(async () => {
      rules = await result.current.getLearnedRules();
    });

    expect(rules).toEqual([]);
  });
});
