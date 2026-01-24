import { DocumentChunk, ChunkAnnotation, PrimaryLabel } from '@/types/clinical';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Check, Scissors, Trash2, Sparkles, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChunkViewerProps {
  chunks: DocumentChunk[];
  annotations: ChunkAnnotation[];
  selectedChunkId: string | null;
  onChunkSelect: (chunkId: string) => void;
  onQuickLabel?: (chunkId: string, label: PrimaryLabel) => void;
  onRemoveLabel?: (chunkId: string) => void;
}

const CHUNK_TYPE_LABELS: Record<string, string> = {
  section_header: 'Header',
  paragraph: 'Paragraph',
  bullet_list: 'List',
  imaging_report: 'Imaging',
  lab_values: 'Labs',
  medication_list: 'Medications',
  vital_signs: 'Vitals',
  attestation: 'Attestation',
  unknown: 'Text',
};

function getLabelIcon(label: PrimaryLabel) {
  switch (label) {
    case 'KEEP':
      return <Check className="h-3 w-3" />;
    case 'CONDENSE':
      return <Scissors className="h-3 w-3" />;
    case 'REMOVE':
      return <Trash2 className="h-3 w-3" />;
  }
}

function getLabelClass(label: PrimaryLabel) {
  switch (label) {
    case 'KEEP':
      return 'chunk-keep';
    case 'CONDENSE':
      return 'chunk-condense';
    case 'REMOVE':
      return 'chunk-remove';
  }
}

export function ChunkViewer({ 
  chunks, 
  annotations, 
  selectedChunkId, 
  onChunkSelect,
  onQuickLabel,
  onRemoveLabel 
}: ChunkViewerProps) {
  const getAnnotation = (chunkId: string) => annotations.find(a => a.chunkId === chunkId);

  const handleQuickLabel = (e: React.MouseEvent, chunkId: string, label: PrimaryLabel) => {
    e.stopPropagation();
    onQuickLabel?.(chunkId, label);
  };

  const handleRemoveLabel = (e: React.MouseEvent, chunkId: string) => {
    e.stopPropagation();
    onRemoveLabel?.(chunkId);
  };

  return (
    <div className="space-y-2">
      {chunks.map((chunk, index) => {
        const annotation = getAnnotation(chunk.id);
        const isSelected = selectedChunkId === chunk.id;
        
        return (
          <div
            key={chunk.id}
            onClick={() => onChunkSelect(chunk.id)}
            className={cn(
              'group relative p-3 rounded-lg cursor-pointer transition-all duration-200',
              'border hover:border-primary/50',
              isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '',
              annotation ? getLabelClass(annotation.label) : 'bg-card border-border',
              chunk.isCritical && !annotation?.overrideJustification && 'chunk-critical'
            )}
          >
            {/* Quick action buttons on hover for labeled chunks */}
            {annotation && onQuickLabel && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="flex items-center gap-1 bg-background/95 rounded-lg shadow-md border p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant={annotation.label === 'KEEP' ? 'default' : 'ghost'}
                        className={cn(
                          "h-7 w-7",
                          annotation.label === 'KEEP' && "bg-label-keep hover:bg-label-keep/90"
                        )}
                        onClick={(e) => handleQuickLabel(e, chunk.id, 'KEEP')}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Keep</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant={annotation.label === 'CONDENSE' ? 'default' : 'ghost'}
                        className={cn(
                          "h-7 w-7",
                          annotation.label === 'CONDENSE' && "bg-label-condense hover:bg-label-condense/90 text-black"
                        )}
                        onClick={(e) => handleQuickLabel(e, chunk.id, 'CONDENSE')}
                      >
                        <Scissors className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Condense</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant={annotation.label === 'REMOVE' ? 'default' : 'ghost'}
                        className={cn(
                          "h-7 w-7",
                          annotation.label === 'REMOVE' && "bg-label-remove hover:bg-label-remove/90"
                        )}
                        onClick={(e) => handleQuickLabel(e, chunk.id, 'REMOVE')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Remove</TooltipContent>
                  </Tooltip>
                  
                  <div className="w-px h-5 bg-border mx-0.5" />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleRemoveLabel(e, chunk.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Remove label</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
            
            {/* Click to edit hint for unlabeled chunks */}
            {!annotation && !isSelected && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background/95 px-2 py-1 rounded-md shadow-sm border text-xs text-muted-foreground flex items-center gap-1">
                  <Pencil className="h-3 w-3" />
                  Click to label
                </div>
              </div>
            )}
            
            {/* Chunk header */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs font-medium">
                #{index + 1}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {CHUNK_TYPE_LABELS[chunk.type] || chunk.type}
              </Badge>
              
              {chunk.isCritical && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Critical
                </Badge>
              )}
              
              {chunk.suggestedLabel && !annotation && (
                <Badge variant="secondary" className="text-xs gap-1 bg-accent text-accent-foreground">
                  <Sparkles className="h-3 w-3" />
                  Suggested: {chunk.suggestedLabel}
                </Badge>
              )}
              
              {annotation && (
                <Badge 
                  className={cn(
                    'text-xs gap-1 ml-auto group-hover:ring-2 group-hover:ring-primary/30 transition-all',
                    annotation.label === 'KEEP' && 'bg-label-keep text-white',
                    annotation.label === 'CONDENSE' && 'bg-label-condense text-black',
                    annotation.label === 'REMOVE' && 'bg-label-remove text-white'
                  )}
                >
                  {getLabelIcon(annotation.label)}
                  {annotation.label}
                </Badge>
              )}
            </div>

            {/* Chunk content */}
            <div className={cn(
              'text-sm font-mono whitespace-pre-wrap break-words',
              annotation?.label === 'REMOVE' && 'line-through opacity-60'
            )}>
              {chunk.text.length > 500 ? chunk.text.substring(0, 500) + '...' : chunk.text}
            </div>

            {/* Confidence indicator */}
            {chunk.confidence && chunk.confidence > 0 && !annotation && (
              <div className="absolute bottom-2 right-2">
                <div 
                  className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"
                  title={`${Math.round(chunk.confidence * 100)}% confidence`}
                >
                  <div 
                    className="h-full bg-primary/60 rounded-full"
                    style={{ width: `${chunk.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
