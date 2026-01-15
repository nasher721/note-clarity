import { FileText, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from './ModeToggle';
import { ThemeToggle } from './ThemeToggle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeaderProps {
  mode: 'training' | 'inference';
  onModeChange: (mode: 'training' | 'inference') => void;
}

export function Header({ mode, onModeChange }: HeaderProps) {
  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-6 w-6" />
            <h1 className="font-semibold text-lg">Clinical Note De-Noiser</h1>
          </div>
          <div className="h-6 w-px bg-border" />
          <ModeToggle mode={mode} onModeChange={onModeChange} />
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
                Shortcuts
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span>Keep</span>
                  <span className="kbd">1</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Condense</span>
                  <span className="kbd">2</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Remove</span>
                  <span className="kbd">3</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Clear selection</span>
                  <span className="kbd">Esc</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
