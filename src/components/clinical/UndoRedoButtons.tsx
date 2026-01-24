import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface UndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoCount?: number;
  redoCount?: number;
  size?: 'sm' | 'default';
}

export function UndoRedoButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoCount = 0,
  redoCount = 0,
  size = 'sm',
}: UndoRedoButtonsProps) {
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            className={buttonSize}
            aria-label="Undo"
          >
            <Undo2 className={iconSize} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Undo {undoCount > 0 ? `(${undoCount})` : ''}</p>
          <p className="text-xs text-muted-foreground">Ctrl+Z</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            className={buttonSize}
            aria-label="Redo"
          >
            <Redo2 className={iconSize} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Redo {redoCount > 0 ? `(${redoCount})` : ''}</p>
          <p className="text-xs text-muted-foreground">Ctrl+Y</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
