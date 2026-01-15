import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  CheckCircle2, 
  Circle,
  Trash2,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChartNoteItem {
  id: string;
  noteType: string;
  dateTime?: string;
  status: 'pending' | 'processing' | 'completed';
  annotationCount: number;
  chunkCount: number;
}

interface ChartQueuePanelProps {
  patientId: string;
  notes: ChartNoteItem[];
  currentIndex: number;
  onGoToNote: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onClear: () => void;
}

export function ChartQueuePanel({
  patientId,
  notes,
  currentIndex,
  onGoToNote,
  onNext,
  onPrev,
  onClear,
}: ChartQueuePanelProps) {
  const completedCount = notes.filter(n => n.annotationCount > 0).length;
  const progress = notes.length > 0 ? (completedCount / notes.length) * 100 : 0;

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No notes loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Patient header */}
      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
        <User className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{patientId}</span>
        <Badge variant="outline" className="ml-auto">
          {notes.length} notes
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedCount} / {notes.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          Note {currentIndex + 1} of {notes.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentIndex === notes.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Note list */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {notes.map((note, idx) => (
          <button
            key={note.id}
            onClick={() => onGoToNote(idx)}
            className={cn(
              'w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors text-sm',
              idx === currentIndex
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            )}
          >
            {note.annotationCount > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{note.noteType}</div>
              {note.dateTime && (
                <div className={cn(
                  'text-xs truncate',
                  idx === currentIndex ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                  {note.dateTime}
                </div>
              )}
            </div>

            {note.annotationCount > 0 && (
              <Badge 
                variant={idx === currentIndex ? 'secondary' : 'outline'} 
                className="text-xs"
              >
                {note.annotationCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Keyboard hints */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">→</kbd>
          <span>Navigate notes</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">N</kbd>
          <span>Next unlabeled</span>
        </div>
      </div>

      {/* Clear button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="w-full text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Clear Chart
      </Button>
    </div>
  );
}
