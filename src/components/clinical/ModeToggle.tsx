import { Button } from '@/components/ui/button';
import { GraduationCap, Wand2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModeToggleProps {
  mode: 'training' | 'inference' | 'batch';
  onModeChange: (mode: 'training' | 'inference' | 'batch') => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModeChange('training')}
        className={cn(
          'gap-2 transition-all',
          mode === 'training' && 'bg-background shadow-sm'
        )}
      >
        <GraduationCap className="h-4 w-4" />
        <span className="hidden sm:inline">Training</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModeChange('batch')}
        className={cn(
          'gap-2 transition-all',
          mode === 'batch' && 'bg-background shadow-sm'
        )}
      >
        <Layers className="h-4 w-4" />
        <span className="hidden sm:inline">Batch</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModeChange('inference')}
        className={cn(
          'gap-2 transition-all',
          mode === 'inference' && 'bg-background shadow-sm'
        )}
      >
        <Wand2 className="h-4 w-4" />
        <span className="hidden sm:inline">Inference</span>
      </Button>
    </div>
  );
}
