import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  handler: () => void;
  /** If true, also matches uppercase version of key */
  caseInsensitive?: boolean;
  /** Description for UI display */
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are currently enabled */
  enabled?: boolean;
  /** Prevent shortcuts when these elements are focused */
  ignoreInputs?: boolean;
}

/**
 * Hook for managing keyboard shortcuts in a component
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: '1', handler: () => setLabel('KEEP'), description: 'Set Keep label' },
 *   { key: '2', handler: () => setLabel('CONDENSE'), description: 'Set Condense label' },
 *   { key: 'Escape', handler: () => clear(), description: 'Clear selection' },
 * ]);
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, ignoreInputs = true } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore when typing in form fields
    if (ignoreInputs && (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    )) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatches = shortcut.caseInsensitive
        ? e.key.toLowerCase() === shortcut.key.toLowerCase()
        : e.key === shortcut.key;

      if (keyMatches) {
        shortcut.handler();
        return;
      }
    }
  }, [enabled, ignoreInputs, shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Preset shortcuts for labeling operations
 */
export function useLabelingShortcuts(handlers: {
  onKeep?: () => void;
  onCondense?: () => void;
  onRemove?: () => void;
  onClear?: () => void;
}, enabled = true) {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onKeep) {
    shortcuts.push({ key: '1', handler: handlers.onKeep, description: 'Keep' });
  }
  if (handlers.onCondense) {
    shortcuts.push({ key: '2', handler: handlers.onCondense, description: 'Condense' });
  }
  if (handlers.onRemove) {
    shortcuts.push({ key: '3', handler: handlers.onRemove, description: 'Remove' });
  }
  if (handlers.onClear) {
    shortcuts.push({ key: 'Escape', handler: handlers.onClear, description: 'Clear' });
  }

  useKeyboardShortcuts(shortcuts, { enabled });
}

/**
 * Preset shortcuts for navigation operations
 */
export function useNavigationShortcuts(handlers: {
  onPrev?: () => void;
  onNext?: () => void;
  onNextUnlabeled?: () => void;
}, enabled = true) {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onPrev) {
    shortcuts.push({ key: 'ArrowLeft', handler: handlers.onPrev, description: 'Previous' });
  }
  if (handlers.onNext) {
    shortcuts.push({ key: 'ArrowRight', handler: handlers.onNext, description: 'Next' });
  }
  if (handlers.onNextUnlabeled) {
    shortcuts.push({ key: 'n', handler: handlers.onNextUnlabeled, caseInsensitive: true, description: 'Next unlabeled' });
  }

  useKeyboardShortcuts(shortcuts, { enabled });
}

/**
 * Preset shortcuts for text annotation tools
 */
export function useAnnotationToolShortcuts(handlers: {
  onSelect?: () => void;
  onKeep?: () => void;
  onCondense?: () => void;
  onRemove?: () => void;
  onErase?: () => void;
  onClear?: () => void;
}, enabled = true) {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onSelect) {
    shortcuts.push({ key: 'v', handler: handlers.onSelect, caseInsensitive: true, description: 'Select tool' });
  }
  if (handlers.onKeep) {
    shortcuts.push({ key: 'k', handler: handlers.onKeep, caseInsensitive: true, description: 'Keep tool' });
  }
  if (handlers.onCondense) {
    shortcuts.push({ key: 'c', handler: handlers.onCondense, caseInsensitive: true, description: 'Condense tool' });
  }
  if (handlers.onRemove) {
    shortcuts.push({ key: 'r', handler: handlers.onRemove, caseInsensitive: true, description: 'Remove tool' });
  }
  if (handlers.onErase) {
    shortcuts.push({ key: 'e', handler: handlers.onErase, caseInsensitive: true, description: 'Erase tool' });
  }
  if (handlers.onClear) {
    shortcuts.push({ key: 'Escape', handler: handlers.onClear, description: 'Clear selection' });
  }

  useKeyboardShortcuts(shortcuts, { enabled });
}
