
import { useSettings } from '@/contexts/SettingsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
    Laptop,
    Moon,
    Sun,
    Type,
    Zap,
    Save
} from 'lucide-react';

export function SettingsPage() {
    const {
        fontSize, setFontSize,
        theme, setTheme,
        copilotEnabled, setCopilotEnabled,
        autoSave, setAutoSave
    } = useSettings();

    return (
        <div className="container max-w-4xl p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">
                    Manage your workspace preferences and application behavior.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Appearance Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sun className="h-5 w-5" />
                            Appearance
                        </CardTitle>
                        <CardDescription>
                            Customize how the application looks and feels.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>Theme</Label>
                            <div className="flex gap-4">
                                <Button
                                    variant={theme === 'light' ? 'default' : 'outline'}
                                    className="flex-1 flex-col h-auto py-4 gap-2"
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun className="h-6 w-6" />
                                    Light
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'default' : 'outline'}
                                    className="flex-1 flex-col h-auto py-4 gap-2"
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon className="h-6 w-6" />
                                    Dark
                                </Button>
                                <Button
                                    variant={theme === 'system' ? 'default' : 'outline'}
                                    className="flex-1 flex-col h-auto py-4 gap-2"
                                    onClick={() => setTheme('system')}
                                >
                                    <Laptop className="h-6 w-6" />
                                    System
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                <Label>Font Size</Label>
                            </div>
                            <RadioGroup
                                value={fontSize}
                                onValueChange={(v) => setFontSize(v as any)}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="sm" id="font-sm" />
                                    <Label htmlFor="font-sm" className="text-sm">Small</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="base" id="font-base" />
                                    <Label htmlFor="font-base" className="text-base">Medium</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="lg" id="font-lg" />
                                    <Label htmlFor="font-lg" className="text-lg">Large</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="xl" id="font-xl" />
                                    <Label htmlFor="font-xl" className="text-xl">Extra Large</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </CardContent>
                </Card>

                {/* Application Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Application Intelligence
                        </CardTitle>
                        <CardDescription>
                            Configure AI assistance and automation features.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">AI Copilot</Label>
                                <p className="text-sm text-muted-foreground">
                                    Show real-time annotation suggestions in Training Mode.
                                </p>
                            </div>
                            <Switch
                                checked={copilotEnabled}
                                onCheckedChange={setCopilotEnabled}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Auto-Save</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically save changes to documents as you work.
                                </p>
                            </div>
                            <Switch
                                checked={autoSave}
                                onCheckedChange={setAutoSave}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
