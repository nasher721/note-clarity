import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { TextHighlight, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope, REMOVE_REASON_LABELS, CONDENSE_STRATEGY_LABELS, SCOPE_LABELS } from '@/types/clinical';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Scissors, Trash2, X, Highlighter, MousePointer, Eraser } from 'lucide-react';
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
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Label options for pending selection
  const [pendingLabel, setPendingLabel] = useState<PrimaryLabel>('KEEP');
  const [pendingReason, setPendingReason] = useState<RemoveReason | ''>('');
  const [pendingStrategy, setPendingStrategy] = useState<CondenseStrategy | ''>('');
  const [pendingScope, setPendingScope] = useState<LabelScope>('this_document');

  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);

  const handleTextSelection = useCallback(() => {
    if (activeTool === 'select' || activeTool === 'erase') return;

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
        // For labeling tools, immediately add the highlight
        if (activeTool === 'keep' || activeTool === 'condense' || activeTool === 'remove') {
          const label = activeTool.toUpperCase() as PrimaryLabel;
          onAddHighlight({
            startIndex,
            endIndex,
            text: selectedText,
            label,
            scope: 'this_document',
          });
        }
      }
    }

    selection.removeAllRanges();
  }, [activeTool, text, onAddHighlight]);

  const handleSegmentClick = useCallback((segment: RenderedSegment, e: React.MouseEvent) => {
    if (activeTool === 'erase' && segment.highlights.length > 0) {
      // Remove the topmost highlight
      const topHighlight = segment.highlights[segment.highlights.length - 1];
      onRemoveHighlight(topHighlight.id);
      return;
    }

    if (activeTool === 'select' && segment.highlights.length > 0) {
      // Select highlight for editing
      const topHighlight = segment.highlights[segment.highlights.length - 1];
      setSelectedHighlight(topHighlight);
    }
  }, [activeTool, onRemoveHighlight]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'v':
        case 'V':
          setActiveTool('select');
          break;
        case 'k':
        case 'K':
          setActiveTool('keep');
          break;
        case 'c':
        case 'C':
          setActiveTool('condense');
          break;
        case 'r':
        case 'R':
          setActiveTool('remove');
          break;
        case 'e':
        case 'E':
          setActiveTool('erase');
          break;
        case 'Escape':
          setSelectedHighlight(null);
          setPendingSelection(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toolButtons = [
    { tool: 'select' as Tool, icon: MousePointer, label: 'Select', shortcut: 'V' },
    { tool: 'keep' as Tool, icon: Check, label: 'Keep', shortcut: 'K', color: 'text-green-600' },
    { tool: 'condense' as Tool, icon: Scissors, label: 'Condense', shortcut: 'C', color: 'text-yellow-600' },
    { tool: 'remove' as Tool, icon: Trash2, label: 'Remove', shortcut: 'R', color: 'text-red-600' },
    { tool: 'erase' as Tool, icon: Eraser, label: 'Erase', shortcut: 'E' },
  ];

  return (
    <div className="flex flex-col h-full">
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

      {/* Selected highlight panel */}
      {selectedHighlight && (
        <div className="border-t bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={cn(
                selectedHighlight.label === 'KEEP' && 'bg-label-keep text-white',
                selectedHighlight.label === 'CONDENSE' && 'bg-label-condense text-black',
                selectedHighlight.label === 'REMOVE' && 'bg-label-remove text-white'
              )}>
                {selectedHighlight.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                chars {selectedHighlight.startIndex}–{selectedHighlight.endIndex}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedHighlight(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-2 bg-muted rounded text-sm font-mono max-h-20 overflow-y-auto">
            {selectedHighlight.text.length > 200 
              ? selectedHighlight.text.substring(0, 200) + '...' 
              : selectedHighlight.text}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={selectedHighlight.label}
              onValueChange={(value) => {
                onUpdateHighlight(selectedHighlight.id, { label: value as PrimaryLabel });
                setSelectedHighlight({ ...selectedHighlight, label: value as PrimaryLabel });
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEEP">
                  <span className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" /> Keep
                  </span>
                </SelectItem>
                <SelectItem value="CONDENSE">
                  <span className="flex items-center gap-2">
                    <Scissors className="h-3 w-3 text-yellow-600" /> Condense
                  </span>
                </SelectItem>
                <SelectItem value="REMOVE">
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-3 w-3 text-red-600" /> Remove
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedHighlight.scope}
              onValueChange={(value) => {
                onUpdateHighlight(selectedHighlight.id, { scope: value as LabelScope });
                setSelectedHighlight({ ...selectedHighlight, scope: value as LabelScope });
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onRemoveHighlight(selectedHighlight.id);
                setSelectedHighlight(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
