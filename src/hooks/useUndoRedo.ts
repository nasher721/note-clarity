import { useState, useCallback, useMemo } from 'react';

export interface HistoryAction<T = unknown> {
  type: string;
  data: T;
  timestamp: Date;
}

interface UndoRedoState<T> {
  past: HistoryAction<T>[];
  future: HistoryAction<T>[];
}

/**
 * Generic undo/redo hook for managing action history
 */
export function useUndoRedo<T = unknown>(maxHistorySize = 50) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const pushAction = useCallback((action: Omit<HistoryAction<T>, 'timestamp'>) => {
    setState(prev => ({
      past: [
        ...prev.past.slice(-maxHistorySize + 1),
        { ...action, timestamp: new Date() },
      ],
      future: [], // Clear redo stack on new action
    }));
  }, [maxHistorySize]);

  const undo = useCallback((): HistoryAction<T> | null => {
    let undoneAction: HistoryAction<T> | null = null;
    
    setState(prev => {
      if (prev.past.length === 0) return prev;
      
      const newPast = [...prev.past];
      undoneAction = newPast.pop()!;
      
      return {
        past: newPast,
        future: [undoneAction, ...prev.future],
      };
    });
    
    return undoneAction;
  }, []);

  const redo = useCallback((): HistoryAction<T> | null => {
    let redoneAction: HistoryAction<T> | null = null;
    
    setState(prev => {
      if (prev.future.length === 0) return prev;
      
      const newFuture = [...prev.future];
      redoneAction = newFuture.shift()!;
      
      return {
        past: [...prev.past, redoneAction],
        future: newFuture,
      };
    });
    
    return redoneAction;
  }, []);

  const clear = useCallback(() => {
    setState({ past: [], future: [] });
  }, []);

  const stats = useMemo(() => ({
    undoCount: state.past.length,
    redoCount: state.future.length,
  }), [state.past.length, state.future.length]);

  return {
    canUndo,
    canRedo,
    pushAction,
    undo,
    redo,
    clear,
    stats,
    pastActions: state.past,
    futureActions: state.future,
  };
}

// Specific types for annotation actions
export type AnnotationActionType = 'add' | 'remove' | 'update' | 'bulk_add';

export interface AnnotationActionData {
  type: AnnotationActionType;
  chunkId?: string;
  chunkIds?: string[];
  previousLabel?: string | null;
  newLabel?: string;
  previousOptions?: Record<string, unknown>;
  newOptions?: Record<string, unknown>;
}

/**
 * Specialized hook for annotation undo/redo
 */
export function useAnnotationHistory() {
  return useUndoRedo<AnnotationActionData>(50);
}
