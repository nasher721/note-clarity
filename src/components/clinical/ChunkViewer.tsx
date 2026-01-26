import { DocumentChunk, ChunkAnnotation, PrimaryLabel } from '@/types/clinical';
import { CollaboratorCursors } from '@/components/collaboration/CollaboratorCursors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Check, Scissors, Trash2, Sparkles, Pencil, X, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelExplanation } from '@/utils/inferenceModel';

interface CopilotSuggestion {
  annotation: ChunkAnnotation;
  explanation: ModelExplanation;
}

interface ChunkViewerProps {
  chunks: DocumentChunk[];
  annotations: ChunkAnnotation[];
  selectedChunkId: string | null;
  suggestions?: Record<string, CopilotSuggestion>;
  onChunkSelect: (chunkId: string) => void;
  onQuickLabel?: (chunkId: string, label: PrimaryLabel) => void;
  onRemoveLabel?: (chunkId: string) => void;
  onAcceptSuggestion?: (chunkId: string, suggestion: CopilotSuggestion) => void;
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
  suggestions = {},
  onChunkSelect,
  onQuickLabel,
  onRemoveLabel,
  onAcceptSuggestion,
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

  const handleAcceptSuggestion = (e: React.MouseEvent, chunkId: string, suggestion: CopilotSuggestion) => {
    e.stopPropagation();
    onAcceptSuggestion?.(chunkId, suggestion);
  };

  return (
    <div className="space-y-2">
      {chunks.map((chunk, index) => {
        const annotation = getAnnotation(chunk.id);
        const suggestion = !annotation ? suggestions[chunk.id] : undefined;
        const isSelected = selectedChunkId === chunk.id;

        // Determine border class for suggestion glow
        let suggestionClass = '';
        if (suggestion) {
          if (suggestion.annotation.label === 'KEEP') suggestionClass = 'ring-1 ring-green-400/50 bg-green-50/10';
          if (suggestion.annotation.label === 'CONDENSE') suggestionClass = 'ring-1 ring-yellow-400/50 bg-yellow-50/10';
          if (suggestion.annotation.label === 'REMOVE') suggestionClass = 'ring-1 ring-red-400/50 bg-red-50/10';
        }

        return (
          <div
            key={chunk.id}
            onClick={() => onChunkSelect(chunk.id)}
            className={cn(
              'group relative p-3 rounded-lg cursor-pointer transition-all duration-200',
              'border hover:border-primary/50',
              isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '',
              annotation ? getLabelClass(annotation.label) : 'bg-card border-border',
              suggestion && !isSelected ? suggestionClass : '',
              chunk.isCritical && !annotation?.overrideJustification && 'chunk-critical'
            )}
          >
            <CollaboratorCursors chunkId={chunk.id} />

            {/* Quick action buttons on hover for labeled chunks */}
            {annotation && onQuickLabel && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="flex items-center gap-1 bg-background/95 rounded-lg shadow-md border p-1">
                  {/* ... existing buttons ... */}
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

            {/* Suggestion Accept Button */}
            {suggestion && onAcceptSuggestion && !isSelected && (
              <div className="absolute top-2 right-2 opacity-100 transition-opacity z-10">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 text-[10px] bg-background/80 hover:bg-primary hover:text-primary-foreground border shadow-sm"
                  onClick={(e) => handleAcceptSuggestion(e, chunk.id, suggestion)}
                >
                  <Bot className="h-3 w-3" />
                  Accept {suggestion.annotation.label}
                  <span className="opacity-70 text-[9px]">
                    {(suggestion.explanation.confidence * 100).toFixed(0)}%
                  </span>
                </Button>
              </div>
            )}

            {/* Click to edit hint for unlabeled chunks */}
            {!annotation && !suggestion && !isSelected && (
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

              {/* Existing "Suggested" badge logic (parser based) - merge or hide if copilot active? */}
              {chunk.suggestedLabel && !annotation && !suggestion && (
                <Badge variant="secondary" className="text-xs gap-1 bg-accent text-accent-foreground">
                  <Sparkles className="h-3 w-3" />
                  Suggested: {chunk.suggestedLabel}
                </Badge>
              )}

              {/* Copilot Badge */}
              {suggestion && (
                <Badge variant="outline" className={cn("text-xs gap-1 ml-auto animate-pulse",
                  suggestion.annotation.label === 'KEEP' && 'text-green-600 border-green-200',
                  suggestion.annotation.label === 'CONDENSE' && 'text-yellow-600 border-yellow-200',
                  suggestion.annotation.label === 'REMOVE' && 'text-red-600 border-red-200'
                )}>
                  <Bot className="h-3 w-3" />
                  Copilot: {suggestion.annotation.label}
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
              annotation?.label === 'REMOVE' && 'line-through opacity-60',
              suggestion?.annotation.label === 'REMOVE' && 'opacity-80'
            )}>
              {chunk.text.length > 500 ? chunk.text.substring(0, 500) + '...' : chunk.text}
            </div>

            {/* Confidence indicator */}
            {chunk.confidence && chunk.confidence > 0 && !annotation && !suggestion && (
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

