import { FileText, HelpCircle, LogOut, User as UserIcon, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from './ModeToggle';
import { ThemeToggle } from './ThemeToggle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  mode: 'training' | 'inference' | 'batch' | 'chart' | 'intelligence';
  onModeChange: (mode: 'training' | 'inference' | 'batch' | 'chart' | 'intelligence') => void;
  user?: User | null;
  onSignOut?: () => void;
}

export function Header({ mode, onModeChange, user, onSignOut }: HeaderProps) {
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
                {(mode === 'batch' || mode === 'chart') && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        {mode === 'batch' ? 'Batch Mode' : 'Chart Mode'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Previous {mode === 'batch' ? 'doc' : 'note'}</span>
                      <span className="kbd">←</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Next {mode === 'batch' ? 'doc' : 'note'}</span>
                      <span className="kbd">→</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Next unlabeled</span>
                      <span className="kbd">N</span>
                    </div>
                  </>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          
          <ThemeToggle />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Signed in as</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
