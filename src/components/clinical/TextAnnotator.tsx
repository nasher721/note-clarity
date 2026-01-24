import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { TextHighlight, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope, SCOPE_LABELS } from '@/types/clinical';
import { useAnnotationToolShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Scissors, Trash2, X, Highlighter, MousePointer, Eraser, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TextAnnotatorProps {
  text: string;
  highlights: TextHighlight[];
  onAddHighlight: (highlight: Omit<TextHighlight, 'id' | 'timestamp' | 'userId'>) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onUpdateHighlight: (highlightId: string, updates: Partial<TextHighlight>) => void;
}

type Tool = 'select' | 'keep' | 'condense' | 'remove' | 'erase';

const LABEL_COLORS: Record<PrimaryLabel, { bg: string; text: string; border: string }> = {
  KEEP: { bg: 'bg-green-200/70 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', border: 'border-green-400' },
  CONDENSE: { bg: 'bg-yellow-200/70 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-400' },
  REMOVE: { bg: 'bg-red-200/70 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', border: 'border-red-400' },
};

interface RenderedSegment {
  start: number;
  end: number;
  text: string;
  highlights: TextHighlight[];
}

function getOverlappingHighlights(highlights: TextHighlight[], start: number, end: number): TextHighlight[] {
  return highlights.filter(h => h.startIndex < end && h.endIndex > start);
}

function buildSegments(text: string, highlights: TextHighlight[]): RenderedSegment[] {
  if (highlights.length === 0) {
    return [{ start: 0, end: text.length, text, highlights: [] }];
  }

  // Get all boundary points
  const boundaries = new Set<number>([0, text.length]);
  for (const h of highlights) {
    boundaries.add(h.startIndex);
    boundaries.add(h.endIndex);
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const segments: RenderedSegment[] = [];

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];
    if (start < end) {
      segments.push({
        start,
        end,
        text: text.substring(start, end),
        highlights: getOverlappingHighlights(highlights, start, end),
      });
    }
  }

  return segments;
}

export function TextAnnotator({
  text,
  highlights,
  onAddHighlight,
  onRemoveHighlight,
  onUpdateHighlight,
}: TextAnnotatorProps) {
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedHighlight, setSelectedHighlight] = useState<TextHighlight | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Label options for pending selection
  const [pendingLabel, setPendingLabel] = useState<PrimaryLabel>('KEEP');
  const [pendingReason, setPendingReason] = useState<RemoveReason | ''>('');
  const [pendingStrategy, setPendingStrategy] = useState<CondenseStrategy | ''>('');
  const [pendingScope, setPendingScope] = useState<LabelScope>('global');

  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);

  // Click-away behavior to close popup
  useEffect(() => {
    if (!popupPosition) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        textRef.current &&
        !textRef.current.contains(target)
      ) {
        setSelectedHighlight(null);
        setPendingSelection(null);
        setPopupPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popupPosition]);

  const handleApplyPendingLabel = useCallback((label: PrimaryLabel) => {
    if (!pendingSelection) return;
    
    onAddHighlight({
      startIndex: pendingSelection.start,
      endIndex: pendingSelection.end,
      text: pendingSelection.text,
      label,
      scope: pendingScope,
    });
    
    setPendingSelection(null);
    setPopupPosition(null);
  }, [pendingSelection, pendingScope, onAddHighlight]);

  // Find all occurrences of a text pattern in the document
  const findSimilarPatterns = useCallback((searchText: string): Array<{ start: number; end: number }> => {
    const matches: Array<{ start: number; end: number }> = [];
    const normalizedSearch = searchText.trim().toLowerCase();
    if (normalizedSearch.length < 3) return matches; // Minimum 3 chars to avoid noise
    
    let searchIndex = 0;
    const lowerText = text.toLowerCase();
    
    while (searchIndex < text.length) {
      const foundIndex = lowerText.indexOf(normalizedSearch, searchIndex);
      if (foundIndex === -1) break;
      
      matches.push({
        start: foundIndex,
        end: foundIndex + searchText.trim().length,
      });
      searchIndex = foundIndex + 1;
    }
    
    return matches;
  }, [text]);

  // Count similar patterns (excluding already highlighted ones)
  const getSimilarCount = useCallback((searchText: string): number => {
    const patterns = findSimilarPatterns(searchText);
    // Filter out patterns that are already highlighted
    const unhighlightedPatterns = patterns.filter(p => {
      return !highlights.some(h => 
        (h.startIndex <= p.start && h.endIndex >= p.end) || // Fully contained
        (p.start <= h.startIndex && p.end >= h.endIndex) // Contains highlight
      );
    });
    return unhighlightedPatterns.length;
  }, [findSimilarPatterns, highlights]);

  // Apply label to all similar patterns
  const handleApplyToAllSimilar = useCallback((searchText: string, label: PrimaryLabel, scope: LabelScope) => {
    const patterns = findSimilarPatterns(searchText);
    
    // Filter out patterns that are already highlighted
    const newPatterns = patterns.filter(p => {
      return !highlights.some(h => 
        (h.startIndex <= p.start && h.endIndex >= p.end) ||
        (p.start <= h.startIndex && p.end >= h.endIndex)
      );
    });

    if (newPatterns.length === 0) {
      toast({
        title: 'No additional matches',
        description: 'All similar patterns are already annotated.',
      });
      return;
    }

    // Add highlights for all new patterns
    newPatterns.forEach(pattern => {
      onAddHighlight({
        startIndex: pattern.start,
        endIndex: pattern.end,
        text: text.substring(pattern.start, pattern.end),
        label,
        scope,
      });
    });

    toast({
      title: 'Applied to all similar',
      description: `Added ${label} label to ${newPatterns.length} matching patterns.`,
    });

    setPendingSelection(null);
    setSelectedHighlight(null);
    setPopupPosition(null);
  }, [findSimilarPatterns, highlights, text, onAddHighlight]);

  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'erase') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textRef.current) return;

    const range = selection.getRangeAt(0);
    const textContent = textRef.current;

    // Calculate the start and end indices within the full text
    let startIndex = 0;
    let endIndex = 0;
    let foundStart = false;
    let foundEnd = false;

    const walker = document.createTreeWalker(textContent, NodeFilter.SHOW_TEXT);
    let currentIndex = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent?.length || 0;

      if (!foundStart && node === range.startContainer) {
        startIndex = currentIndex + range.startOffset;
        foundStart = true;
      }

      if (!foundEnd && node === range.endContainer) {
        endIndex = currentIndex + range.endOffset;
        foundEnd = true;
        break;
      }

      currentIndex += nodeLength;
    }

    if (foundStart && foundEnd && endIndex > startIndex) {
      const selectedText = text.substring(startIndex, endIndex);
      
      if (selectedText.trim().length > 0) {
        // Show popup for label selection instead of immediate apply
        setPendingSelection({ start: startIndex, end: endIndex, text: selectedText });
        setSelectedHighlight(null); // Clear any existing highlight selection
        
        // Calculate popup position
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const x = e.clientX - containerRect.left;
          const y = e.clientY - containerRect.top;
          setPopupPosition({ x, y });
        }
      }
    }

    selection.removeAllRanges();
  }, [activeTool, text]);

  const handleSegmentClick = useCallback((segment: RenderedSegment, e: React.MouseEvent) => {
    if (activeTool === 'erase' && segment.highlights.length > 0) {
      // Remove the topmost highlight
      const topHighlight = segment.highlights[segment.highlights.length - 1];
      onRemoveHighlight(topHighlight.id);
      return;
    }

    // Always open labeling panel when clicking a highlight (any tool mode)
    if (segment.highlights.length > 0) {
      const topHighlight = segment.highlights[segment.highlights.length - 1];
      setSelectedHighlight(topHighlight);
      
      // Calculate popup position relative to container
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - containerRect.left;
        const y = e.clientY - containerRect.top;
        setPopupPosition({ x, y });
      }
      e.stopPropagation();
    } else {
      // Clicking non-highlighted area clears selection
      setSelectedHighlight(null);
      setPopupPosition(null);
    }
  }, [activeTool, onRemoveHighlight]);

  // Use centralized keyboard shortcuts
  useAnnotationToolShortcuts(
    {
      onSelect: () => setActiveTool('select'),
      onKeep: () => setActiveTool('keep'),
      onCondense: () => setActiveTool('condense'),
      onRemove: () => setActiveTool('remove'),
      onErase: () => setActiveTool('erase'),
      onClear: () => {
        setSelectedHighlight(null);
        setPopupPosition(null);
        setPendingSelection(null);
      },
    },
    true
  );

  const toolButtons = [
    { tool: 'select' as Tool, icon: MousePointer, label: 'Select', shortcut: 'V' },
    { tool: 'keep' as Tool, icon: Check, label: 'Keep', shortcut: 'K', color: 'text-green-600' },
    { tool: 'condense' as Tool, icon: Scissors, label: 'Condense', shortcut: 'C', color: 'text-yellow-600' },
    { tool: 'remove' as Tool, icon: Trash2, label: 'Remove', shortcut: 'R', color: 'text-red-600' },
    { tool: 'erase' as Tool, icon: Eraser, label: 'Erase', shortcut: 'E' },
  ];

  return (
    <div ref={containerRef} className="relative flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        <div className="flex items-center gap-1 p-1 bg-background rounded-lg border">
          {toolButtons.map(({ tool, icon: Icon, label, shortcut, color }) => (
            <Button
              key={tool}
              variant={activeTool === tool ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool(tool)}
              className={cn(
                'gap-1.5 h-8',
                activeTool !== tool && color
              )}
              title={`${label} (${shortcut})`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">{label}</span>
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Highlighter className="h-4 w-4" />
          <span>{highlights.length} annotations</span>
        </div>
      </div>

      {/* Text display area */}
      <ScrollArea className="flex-1">
        <div
          ref={textRef}
          className={cn(
            'p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text',
            activeTool !== 'select' && activeTool !== 'erase' && 'cursor-text',
            activeTool === 'erase' && 'cursor-crosshair'
          )}
          onMouseUp={handleTextSelection}
          onClick={(e) => {
            // Click on empty area closes popup
            if (e.target === e.currentTarget) {
              setSelectedHighlight(null);
              setPopupPosition(null);
            }
          }}
        >
          {segments.map((segment, idx) => {
            const hasHighlights = segment.highlights.length > 0;
            const topHighlight = hasHighlights ? segment.highlights[segment.highlights.length - 1] : null;
            const colors = topHighlight ? LABEL_COLORS[topHighlight.label] : null;

            return (
              <span
                key={`${segment.start}-${segment.end}-${idx}`}
                onClick={(e) => handleSegmentClick(segment, e)}
                className={cn(
                  'transition-colors',
                  hasHighlights && colors && [
                    colors.bg,
                    colors.text,
                    'border-b-2',
                    colors.border,
                    'cursor-pointer hover:opacity-80',
                    topHighlight?.label === 'REMOVE' && 'line-through'
                  ],
                  activeTool === 'erase' && hasHighlights && 'hover:bg-destructive/20',
                  selectedHighlight && topHighlight?.id === selectedHighlight.id && 'ring-2 ring-primary ring-offset-1'
                )}
              >
                {segment.text}
              </span>
            );
          })}
        </div>
      </ScrollArea>

      {/* Floating popup for NEW text selection */}
      {pendingSelection && popupPosition && !selectedHighlight && (
        <div
          ref={popupRef}
          className="absolute z-50 w-72 bg-card border rounded-lg shadow-lg animate-scale-in"
          style={{
            left: Math.min(popupPosition.x, (containerRef.current?.clientWidth || 300) - 288),
            top: Math.min(popupPosition.y + 8, (containerRef.current?.clientHeight || 400) - 200),
          }}
        >
          <div className="p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Label Selection</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setPendingSelection(null);
                  setPopupPosition(null);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Text preview */}
            <div className="p-2 bg-muted rounded text-xs font-mono max-h-16 overflow-y-auto">
              {pendingSelection.text.length > 100 
                ? pendingSelection.text.substring(0, 100) + '...' 
                : pendingSelection.text}
            </div>

            {/* Label buttons */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 hover:bg-label-keep hover:text-white"
                onClick={() => handleApplyPendingLabel('KEEP')}
              >
                <Check className="h-3 w-3 mr-1" />
                Keep
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 hover:bg-label-condense hover:text-black"
                onClick={() => handleApplyPendingLabel('CONDENSE')}
              >
                <Scissors className="h-3 w-3 mr-1" />
                Condense
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 hover:bg-label-remove hover:text-white"
                onClick={() => handleApplyPendingLabel('REMOVE')}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>

            {/* Scope selector */}
            <Select
              value={pendingScope}
              onValueChange={(value) => setPendingScope(value as LabelScope)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Apply to all similar buttons */}
            {getSimilarCount(pendingSelection.text) > 0 && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Found {getSimilarCount(pendingSelection.text)} more similar patterns
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs hover:bg-label-keep/20"
                    onClick={() => handleApplyToAllSimilar(pendingSelection.text, 'KEEP', pendingScope)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    All Keep
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs hover:bg-label-condense/20"
                    onClick={() => handleApplyToAllSimilar(pendingSelection.text, 'CONDENSE', pendingScope)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    All Condense
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs hover:bg-label-remove/20"
                    onClick={() => handleApplyToAllSimilar(pendingSelection.text, 'REMOVE', pendingScope)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    All Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating popup for EXISTING highlight */}
      {selectedHighlight && popupPosition && !pendingSelection && (
        <div
          ref={popupRef}
          className="absolute z-50 w-72 bg-card border rounded-lg shadow-lg animate-scale-in"
          style={{
            left: Math.min(popupPosition.x, (containerRef.current?.clientWidth || 300) - 288),
            top: Math.min(popupPosition.y + 8, (containerRef.current?.clientHeight || 400) - 200),
          }}
        >
          <div className="p-3 space-y-3">
            {/* Header with label badge */}
            <div className="flex items-center justify-between">
              <Badge className={cn(
                selectedHighlight.label === 'KEEP' && 'bg-label-keep text-white',
                selectedHighlight.label === 'CONDENSE' && 'bg-label-condense text-black',
                selectedHighlight.label === 'REMOVE' && 'bg-label-remove text-white'
              )}>
                {selectedHighlight.label}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setSelectedHighlight(null);
                  setPopupPosition(null);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Text preview */}
            <div className="p-2 bg-muted rounded text-xs font-mono max-h-16 overflow-y-auto">
              {selectedHighlight.text.length > 100 
                ? selectedHighlight.text.substring(0, 100) + '...' 
                : selectedHighlight.text}
            </div>

            {/* Quick label buttons */}
            <div className="flex gap-1">
              <Button
                variant={selectedHighlight.label === 'KEEP' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1 h-8',
                  selectedHighlight.label === 'KEEP' && 'bg-label-keep hover:bg-label-keep/90'
                )}
                onClick={() => {
                  onUpdateHighlight(selectedHighlight.id, { label: 'KEEP' });
                  setSelectedHighlight({ ...selectedHighlight, label: 'KEEP' });
                }}
              >
                <Check className="h-3 w-3 mr-1" />
                Keep
              </Button>
              <Button
                variant={selectedHighlight.label === 'CONDENSE' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1 h-8',
                  selectedHighlight.label === 'CONDENSE' && 'bg-label-condense hover:bg-label-condense/90 text-black'
                )}
                onClick={() => {
                  onUpdateHighlight(selectedHighlight.id, { label: 'CONDENSE' });
                  setSelectedHighlight({ ...selectedHighlight, label: 'CONDENSE' });
                }}
              >
                <Scissors className="h-3 w-3 mr-1" />
                Condense
              </Button>
              <Button
                variant={selectedHighlight.label === 'REMOVE' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1 h-8',
                  selectedHighlight.label === 'REMOVE' && 'bg-label-remove hover:bg-label-remove/90'
                )}
                onClick={() => {
                  onUpdateHighlight(selectedHighlight.id, { label: 'REMOVE' });
                  setSelectedHighlight({ ...selectedHighlight, label: 'REMOVE' });
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>

            {/* Scope selector */}
            <Select
              value={selectedHighlight.scope}
              onValueChange={(value) => {
                onUpdateHighlight(selectedHighlight.id, { scope: value as LabelScope });
                setSelectedHighlight({ ...selectedHighlight, scope: value as LabelScope });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Apply to all similar button */}
            {getSimilarCount(selectedHighlight.text) > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => handleApplyToAllSimilar(
                  selectedHighlight.text, 
                  selectedHighlight.label, 
                  selectedHighlight.scope
                )}
              >
                <Copy className="h-3 w-3 mr-1" />
                Apply {selectedHighlight.label} to {getSimilarCount(selectedHighlight.text)} similar
              </Button>
            )}

            {/* Delete button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                onRemoveHighlight(selectedHighlight.id);
                setSelectedHighlight(null);
                setPopupPosition(null);
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete annotation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
