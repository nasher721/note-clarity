import { DocumentChunk, ChunkAnnotation, PrimaryLabel } from '@/types/clinical';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, Scissors, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChunkViewerProps {
  chunks: DocumentChunk[];
  annotations: ChunkAnnotation[];
  selectedChunkId: string | null;
  onChunkSelect: (chunkId: string) => void;
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

export function ChunkViewer({ chunks, annotations, selectedChunkId, onChunkSelect }: ChunkViewerProps) {
  const getAnnotation = (chunkId: string) => annotations.find(a => a.chunkId === chunkId);

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
                    'text-xs gap-1 ml-auto',
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
