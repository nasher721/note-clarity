import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Scissors, Sparkles, Trash2 } from 'lucide-react';

interface AnnotationStatusBarProps {
  annotationView: 'chunks' | 'highlight';
  annotatedCount: number;
  totalChunks: number;
  highlightStats: { total: number; keep: number; condense: number; remove: number };
}

export const AnnotationStatusBar = ({
  annotationView,
  annotatedCount,
  totalChunks,
  highlightStats,
}: AnnotationStatusBarProps) => {
  const progress = totalChunks ? Math.round((annotatedCount / totalChunks) * 100) : 0;
  const remaining = Math.max(totalChunks - annotatedCount, 0);

  return (
    <div className="border-b bg-background/60 px-4 py-2 text-xs text-muted-foreground">
      {annotationView === 'chunks' ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="uppercase tracking-wide text-[10px] text-muted-foreground">Annotation progress</span>
              <span className="font-medium text-foreground">
                {annotatedCount}/{totalChunks} ({progress}%)
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-medium">
              <Sparkles className="mr-1 h-2.5 w-2.5" />
              Remaining {remaining}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {highlightStats.total === 0 ? (
            <span className="text-[11px]">No highlights yet. Drag to select text and label.</span>
          ) : (
            <>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Check className="h-2.5 w-2.5 text-emerald-600" />
                Keep {highlightStats.keep}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Scissors className="h-2.5 w-2.5 text-yellow-600" />
                Condense {highlightStats.condense}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Trash2 className="h-2.5 w-2.5 text-red-600" />
                Remove {highlightStats.remove}
              </Badge>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Total {highlightStats.total}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
