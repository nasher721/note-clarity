import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentCreate } from '../useDocumentCreate';

// Mock chunk parser
vi.mock('@/utils/chunkParser', () => ({
  parseDocument: vi.fn(() => [
    {
      id: 'chunk-1',
      text: 'Test chunk',
      type: 'narrative',
      startIndex: 0,
      endIndex: 10,
    },
  ]),
  findDuplicates: vi.fn(() => new Set()),
}));

// Mock Supabase client
const mockInsert = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'clinical_documents') {
        return {
          insert: mockInsert,
        };
      }
      if (table === 'document_chunks') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() =>
              Promise.resolve({
                data: [{ id: 'db-chunk-1' }],
                error: null,
              })
            ),
          })),
        };
      }
      return {};
    }),
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

describe('useDocumentCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: 'doc-123',
              original_text: 'Test text',
              created_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          })
        ),
      })),
    });
  });

  it('should provide createDocument function', () => {
    const { result } = renderHook(() => useDocumentCreate('user-123'));

    expect(typeof result.current.createDocument).toBe('function');
  });

  it('should return null when no userId', async () => {
    const { result } = renderHook(() => useDocumentCreate(undefined));

    let doc: any = 'not-null';
    await act(async () => {
      doc = await result.current.createDocument('Test text');
    });

    expect(doc).toBeNull();
  });

  it('should call onDocumentCreated callback', async () => {
    const mockCallback = vi.fn();
    const { result } = renderHook(() =>
      useDocumentCreate('user-123', mockCallback)
    );

    await act(async () => {
      await result.current.createDocument('Test text');
    });

    expect(mockCallback).toHaveBeenCalled();
  });

  it('should return null on database error', async () => {
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: new Error('DB Error'),
          })
        ),
      })),
    });

    const { result } = renderHook(() => useDocumentCreate('user-123'));

    let doc: any = 'not-null';
    await act(async () => {
      doc = await result.current.createDocument('Test text');
    });

    expect(doc).toBeNull();
  });

  it('should accept optional noteType and service', async () => {
    const { result } = renderHook(() => useDocumentCreate('user-123'));

    await act(async () => {
      await result.current.createDocument('Test text', 'Progress Note', 'Cardiology');
    });

    expect(mockInsert).toHaveBeenCalled();
  });
});
