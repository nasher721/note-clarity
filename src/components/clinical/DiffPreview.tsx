import { useMemo } from 'react';
import { DocumentChunk, ChunkAnnotation, TextHighlight } from '@/types/clinical';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Scissors, Trash2, FileText, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffPreviewProps {
  chunks: DocumentChunk[];
  annotations: ChunkAnnotation[];
  originalText?: string;
  highlights?: TextHighlight[];
  mode?: 'chunks' | 'highlight';
}

interface TextSegment {
  text: string;
  label?: 'KEEP' | 'CONDENSE' | 'REMOVE';
  isHighlighted: boolean;
}

function buildTextSegments(text: string, highlights: TextHighlight[]): TextSegment[] {
  if (highlights.length === 0) {
    return [{ text, label: undefined, isHighlighted: false }];
  }

  // Sort highlights by start index
  const sorted = [...highlights].sort((a, b) => a.startIndex - b.startIndex);
  const segments: TextSegment[] = [];
  let currentIndex = 0;

  for (const highlight of sorted) {
    // Add unhighlighted text before this highlight
    if (highlight.startIndex > currentIndex) {
      segments.push({
        text: text.substring(currentIndex, highlight.startIndex),
        label: undefined,
        isHighlighted: false,
      });
    }

    // Add the highlighted segment
    segments.push({
      text: text.substring(highlight.startIndex, highlight.endIndex),
      label: highlight.label,
      isHighlighted: true,
    });

    currentIndex = highlight.endIndex;
  }

  // Add remaining text after last highlight
  if (currentIndex < text.length) {
    segments.push({
      text: text.substring(currentIndex),
      label: undefined,
      isHighlighted: false,
    });
  }

  return segments;
}

export function DiffPreview({ 
  chunks, 
  annotations, 
  originalText = '', 
  highlights = [],
  mode = 'chunks' 
}: DiffPreviewProps) {
  const getAnnotation = (chunkId: string) => annotations.find(a => a.chunkId === chunkId);

  // Calculate stats based on mode
  const stats = useMemo(() => {
    if (mode === 'highlight') {
      return {
        keep: highlights.filter(h => h.label === 'KEEP').length,
        condense: highlights.filter(h => h.label === 'CONDENSE').length,
        remove: highlights.filter(h => h.label === 'REMOVE').length,
        unlabeled: 0, // In highlight mode, everything selected has a label
      };
    }
    return {
      keep: chunks.filter(c => getAnnotation(c.id)?.label === 'KEEP').length,
      condense: chunks.filter(c => getAnnotation(c.id)?.label === 'CONDENSE').length,
      remove: chunks.filter(c => getAnnotation(c.id)?.label === 'REMOVE').length,
      unlabeled: chunks.filter(c => !getAnnotation(c.id)).length,
    };
  }, [mode, highlights, chunks, annotations]);

  // Calculate word counts based on mode
  const { originalWordCount, cleanedWordCount, reduction } = useMemo(() => {
    if (mode === 'highlight' && originalText) {
      const origCount = originalText.split(/\s+/).filter(w => w.length > 0).length;
      
      // Calculate cleaned word count by processing segments
      const segments = buildTextSegments(originalText, highlights);
      let cleanedCount = 0;
      
      for (const segment of segments) {
        const wordCount = segment.text.split(/\s+/).filter(w => w.length > 0).length;
        if (segment.label === 'REMOVE') {
          // Don't count removed text
          continue;
        } else if (segment.label === 'CONDENSE') {
          // Condensed text counts as ~30%
          cleanedCount += Math.ceil(wordCount * 0.3);
        } else {
          // Keep or unlabeled text counts fully
          cleanedCount += wordCount;
        }
      }
      
      return {
        originalWordCount: origCount,
        cleanedWordCount: cleanedCount,
        reduction: origCount > 0 ? Math.round((1 - cleanedCount / origCount) * 100) : 0,
      };
    }

    // Chunk-based calculation
    const origCount = chunks.reduce((acc, c) => acc + c.text.split(/\s+/).length, 0);
    const cleanedCount = chunks.reduce((acc, c) => {
      const a = getAnnotation(c.id);
      if (a?.label === 'REMOVE') return acc;
      if (a?.label === 'CONDENSE') return acc + Math.ceil(c.text.split(/\s+/).length * 0.3);
      return acc + c.text.split(/\s+/).length;
    }, 0);
    
    return {
      originalWordCount: origCount,
      cleanedWordCount: cleanedCount,
      reduction: origCount > 0 ? Math.round((1 - cleanedCount / origCount) * 100) : 0,
    };
  }, [mode, originalText, highlights, chunks, annotations]);

  // Build segments for highlight mode
  const textSegments = useMemo(() => {
    if (mode === 'highlight' && originalText) {
      return buildTextSegments(originalText, highlights);
    }
    return [];
  }, [mode, originalText, highlights]);

  return (
    <div className="h-full flex flex-col">
      {/* Stats bar */}
      <div className="p-3 border-b bg-muted/30 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className="bg-label-keep text-white gap-1">
            <Check className="h-3 w-3" />
            {stats.keep} Keep
          </Badge>
          <Badge className="bg-label-condense text-black gap-1">
            <Scissors className="h-3 w-3" />
            {stats.condense} Condense
          </Badge>
          <Badge className="bg-label-remove text-white gap-1">
            <Trash2 className="h-3 w-3" />
            {stats.remove} Remove
          </Badge>
          {mode === 'chunks' && (
            <Badge variant="outline" className="gap-1">
              {stats.unlabeled} Unlabeled
            </Badge>
          )}
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {originalWordCount} → {cleanedWordCount} words
          <Badge 
            variant="secondary" 
            className={cn(
              'ml-2',
              reduction > 30 && 'bg-label-keep/20 text-label-keep'
            )}
          >
            -{reduction}%
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="cleaned" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="cleaned" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            <FileText className="h-4 w-4 mr-2" />
            Cleaned Output
          </TabsTrigger>
          <TabsTrigger 
            value="diff" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            <Columns className="h-4 w-4 mr-2" />
            Side-by-Side Diff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cleaned" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {mode === 'highlight' ? (
                // Highlight mode - inline text rendering
                <div className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {textSegments.map((segment, idx) => {
                    if (segment.label === 'REMOVE') {
                      return null; // Don't show removed text in cleaned output
                    }
                    
                    return (
                      <span
                        key={idx}
                        className={cn(
                          segment.label === 'KEEP' && 'bg-diff-keep rounded px-0.5',
                          segment.label === 'CONDENSE' && 'bg-diff-condense rounded px-0.5 italic'
                        )}
                      >
                        {segment.label === 'CONDENSE' ? (
                          <span className="text-muted-foreground">
                            [{segment.text.substring(0, 30).trim()}...]
                          </span>
                        ) : (
                          segment.text
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                // Chunk mode - block rendering
                <div className="space-y-2">
                  {chunks.map((chunk) => {
                    const annotation = getAnnotation(chunk.id);
                    
                    if (annotation?.label === 'REMOVE') {
                      return null;
                    }

                    return (
                      <div
                        key={chunk.id}
                        className={cn(
                          'p-3 rounded-lg text-sm font-mono whitespace-pre-wrap',
                          annotation?.label === 'KEEP' && 'bg-diff-keep',
                          annotation?.label === 'CONDENSE' && 'bg-diff-condense',
                          !annotation && 'bg-card border'
                        )}
                      >
                        {annotation?.label === 'CONDENSE' ? (
                          <span className="italic text-muted-foreground">
                            [Condensed: {chunk.text.substring(0, 80)}...]
                          </span>
                        ) : (
                          chunk.text
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="diff" className="flex-1 m-0 overflow-hidden">
          <div className="h-full grid grid-cols-2 divide-x">
            {/* Original */}
            <ScrollArea className="h-full">
              <div className="panel-header">Original</div>
              <div className="p-4">
                {mode === 'highlight' ? (
                  // Highlight mode - inline text with colors
                  <div className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {textSegments.map((segment, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          segment.label === 'KEEP' && 'bg-diff-keep rounded px-0.5',
                          segment.label === 'CONDENSE' && 'bg-diff-condense rounded px-0.5',
                          segment.label === 'REMOVE' && 'bg-diff-remove line-through opacity-60 rounded px-0.5'
                        )}
                      >
                        {segment.text}
                      </span>
                    ))}
                  </div>
                ) : (
                  // Chunk mode
                  <div className="space-y-2">
                    {chunks.map((chunk) => {
                      const annotation = getAnnotation(chunk.id);
                      
                      return (
                        <div
                          key={chunk.id}
                          className={cn(
                            'p-3 rounded-lg text-sm font-mono whitespace-pre-wrap',
                            annotation?.label === 'REMOVE' && 'bg-diff-remove line-through opacity-60',
                            annotation?.label === 'CONDENSE' && 'bg-diff-condense',
                            annotation?.label === 'KEEP' && 'bg-diff-keep',
                            !annotation && 'bg-card border'
                          )}
                        >
                          {chunk.text.length > 300 ? chunk.text.substring(0, 300) + '...' : chunk.text}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Cleaned */}
            <ScrollArea className="h-full">
              <div className="panel-header">Cleaned</div>
              <div className="p-4">
                {mode === 'highlight' ? (
                  // Highlight mode - inline text without removed
                  <div className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {textSegments.map((segment, idx) => {
                      if (segment.label === 'REMOVE') {
                        return null;
                      }
                      
                      return (
                        <span
                          key={idx}
                          className={cn(
                            segment.label === 'KEEP' && 'bg-diff-keep rounded px-0.5',
                            segment.label === 'CONDENSE' && 'bg-diff-condense rounded px-0.5 italic'
                          )}
                        >
                          {segment.label === 'CONDENSE' ? (
                            <span className="text-muted-foreground">
                              [{segment.text.substring(0, 30).trim()}...]
                            </span>
                          ) : (
                            segment.text
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  // Chunk mode
                  <div className="space-y-2">
                    {chunks.map((chunk) => {
                      const annotation = getAnnotation(chunk.id);
                      
                      if (annotation?.label === 'REMOVE') {
                        return null;
                      }

                      return (
                        <div
                          key={chunk.id}
                          className={cn(
                            'p-3 rounded-lg text-sm font-mono whitespace-pre-wrap',
                            annotation?.label === 'CONDENSE' && 'bg-diff-condense',
                            annotation?.label === 'KEEP' && 'bg-diff-keep',
                            !annotation && 'bg-card border'
                          )}
                        >
                          {annotation?.label === 'CONDENSE' ? (
                            <span className="italic text-muted-foreground">
                              [Condensed: {chunk.text.substring(0, 80)}...]
                            </span>
                          ) : (
                            chunk.text.length > 300 ? chunk.text.substring(0, 300) + '...' : chunk.text
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
