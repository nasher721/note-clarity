import { DocumentChunk, ChunkAnnotation } from '@/types/clinical';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Scissors, Trash2, FileText, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffPreviewProps {
  chunks: DocumentChunk[];
  annotations: ChunkAnnotation[];
}

export function DiffPreview({ chunks, annotations }: DiffPreviewProps) {
  const getAnnotation = (chunkId: string) => annotations.find(a => a.chunkId === chunkId);

  const stats = {
    keep: chunks.filter(c => {
      const a = getAnnotation(c.id);
      return a?.label === 'KEEP';
    }).length,
    condense: chunks.filter(c => {
      const a = getAnnotation(c.id);
      return a?.label === 'CONDENSE';
    }).length,
    remove: chunks.filter(c => {
      const a = getAnnotation(c.id);
      return a?.label === 'REMOVE';
    }).length,
    unlabeled: chunks.filter(c => !getAnnotation(c.id)).length,
  };

  const originalWordCount = chunks.reduce((acc, c) => acc + c.text.split(/\s+/).length, 0);
  const cleanedWordCount = chunks.reduce((acc, c) => {
    const a = getAnnotation(c.id);
    if (a?.label === 'REMOVE') return acc;
    if (a?.label === 'CONDENSE') return acc + Math.ceil(c.text.split(/\s+/).length * 0.3);
    return acc + c.text.split(/\s+/).length;
  }, 0);
  const reduction = Math.round((1 - cleanedWordCount / originalWordCount) * 100);

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
          <Badge variant="outline" className="gap-1">
            {stats.unlabeled} Unlabeled
          </Badge>
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
            <div className="p-4 space-y-2">
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
          </ScrollArea>
        </TabsContent>

        <TabsContent value="diff" className="flex-1 m-0 overflow-hidden">
          <div className="h-full grid grid-cols-2 divide-x">
            {/* Original */}
            <ScrollArea className="h-full">
              <div className="panel-header">Original</div>
              <div className="p-4 space-y-2">
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
            </ScrollArea>

            {/* Cleaned */}
            <ScrollArea className="h-full">
              <div className="panel-header">Cleaned</div>
              <div className="p-4 space-y-2">
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
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
