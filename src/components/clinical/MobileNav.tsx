
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, GraduationCap, Layers, ClipboardList, Wand2, Brain, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

interface MobileNavProps {
    mode: 'training' | 'inference' | 'batch' | 'chart' | 'intelligence' | 'analytics';
    onModeChange: (mode: 'training' | 'inference' | 'batch' | 'chart' | 'intelligence' | 'analytics') => void;
    user?: User | null;
    onSignOut?: () => void;
}

export function MobileNav({ mode, onModeChange, user, onSignOut }: MobileNavProps) {
    const NavItem = ({
        targetMode,
        icon: Icon,
        label
    }: {
        targetMode: MobileNavProps['mode'];
        icon: any;
        label: string;
    }) => (
        <Button
            variant={mode === targetMode ? 'secondary' : 'ghost'}
            className={cn(
                "w-full justify-start gap-2",
                mode === targetMode && "font-semibold"
            )}
            onClick={() => {
                onModeChange(targetMode);
                // We rely on the sheet closing automatically or user clicking outside for now, 
                // strictly accessible implementations might want a controlled state here.
            }}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Button>
    );

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                    <SheetTitle className="text-left flex items-center gap-2">
                        <span className="font-bold">Note Clarity</span>
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-medium text-muted-foreground px-2 py-1">Workspaces</h4>
                        <NavItem targetMode="training" icon={GraduationCap} label="Training Mode" />
                        <NavItem targetMode="batch" icon={Layers} label="Batch Processing" />
                        <NavItem targetMode="chart" icon={ClipboardList} label="Patient Chart" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-medium text-muted-foreground px-2 py-1">Intelligence</h4>
                        <NavItem targetMode="inference" icon={Wand2} label="Inference" />
                        <NavItem targetMode="intelligence" icon={Brain} label="AI Hub" />
                        <NavItem targetMode="analytics" icon={BarChart3} label="Analytics" />
                    </div>

                    <div className="mt-auto border-t pt-4">
                        {user && (
                            <div className="flex flex-col gap-2 px-2">
                                <div className="text-sm text-muted-foreground mb-2">
                                    Signed in as <br />
                                    <span className="text-foreground font-medium">{user.email}</span>
                                </div>
                                <Button variant="destructive" size="sm" onClick={onSignOut} className="w-full justify-start gap-2">
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
