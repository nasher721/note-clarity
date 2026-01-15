import { BatchDocument } from '@/hooks/useBatchProcessor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Clock,
  FileText,
  X,
  Play,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchQueuePanelProps {
  queue: BatchDocument[];
  currentIndex: number;
  isProcessing: boolean;
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    totalAnnotations: number;
  };
  onGoToDocument: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onStartProcessing: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function BatchQueuePanel({
  queue,
  currentIndex,
  isProcessing,
  stats,
  onGoToDocument,
  onNext,
  onPrev,
  onStartProcessing,
  onRemove,
  onClear,
}: BatchQueuePanelProps) {
  if (queue.length === 0) {
    return null;
  }

  const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const hasUnprocessed = stats.pending > 0;

  return (
    <Card className="p-4 space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold">Batch Queue</span>
          <Badge variant="secondary">{stats.total} notes</Badge>
        </div>
        <div className="flex items-center gap-2">
          {hasUnprocessed && (
            <Button
              size="sm"
              onClick={onStartProcessing}
              disabled={isProcessing}
              className="gap-1"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Process All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-destructive"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{stats.completed} / {stats.total} processed</span>
          <span>{stats.totalAnnotations} annotations</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {stats.total}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentIndex >= queue.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Queue list */}
      <ScrollArea className="h-[200px] border rounded-lg">
        <div className="p-2 space-y-1">
          {queue.map((doc, index) => (
            <div
              key={doc.id}
              onClick={() => onGoToDocument(index)}
              className={cn(
                'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                index === currentIndex
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-muted border border-transparent'
              )}
            >
              {/* Status icon */}
              {doc.status === 'pending' && (
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {doc.status === 'processing' && (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              )}
              {doc.status === 'completed' && (
                <Check className="h-4 w-4 text-label-keep shrink-0" />
              )}

              {/* Doc info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0 text-xs">
                    #{index + 1}
                  </Badge>
                  {doc.patientId && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {doc.patientId}
                    </Badge>
                  )}
                  {doc.annotationCount > 0 && (
                    <Badge className="shrink-0 text-xs bg-label-keep/20 text-label-keep border-0">
                      {doc.annotationCount} labeled
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {doc.text.substring(0, 50)}...
                </p>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(doc.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Keyboard shortcuts hint */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="kbd">←</span>
          <span className="kbd">→</span>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <span className="kbd">N</span>
          Next unlabeled
        </span>
      </div>
    </Card>
  );
}
