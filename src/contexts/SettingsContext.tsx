
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type Theme = 'light' | 'dark' | 'system';

interface SettingsContextType {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    copilotEnabled: boolean;
    setCopilotEnabled: (enabled: boolean) => void;
    autoSave: boolean;
    setAutoSave: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

interface SettingsProviderProps {
    children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    // Initialize state from localStorage or defaults
    const [fontSize, setFontSizeState] = useState<FontSize>(() =>
        (localStorage.getItem('fontSize') as FontSize) || 'base'
    );

    const [theme, setThemeState] = useState<Theme>(() =>
        (localStorage.getItem('theme') as Theme) || 'system'
    );

    const [copilotEnabled, setCopilotEnabledState] = useState(() =>
        localStorage.getItem('copilotEnabled') !== 'false' // default true
    );

    const [autoSave, setAutoSaveState] = useState(() =>
        localStorage.getItem('autoSave') !== 'false' // default true
    );

    // Persistence wrappers
    const setFontSize = (size: FontSize) => {
        setFontSizeState(size);
        localStorage.setItem('fontSize', size);
        document.documentElement.style.setProperty('--font-scale', size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : size === 'xl' ? '1.25rem' : '1rem');
    };

    const setTheme = (t: Theme) => {
        setThemeState(t);
        localStorage.setItem('theme', t);

        // Apply theme logic
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (t === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(t);
        }
    };

    const setCopilotEnabled = (enabled: boolean) => {
        setCopilotEnabledState(enabled);
        localStorage.setItem('copilotEnabled', String(enabled));
    };

    const setAutoSave = (enabled: boolean) => {
        setAutoSaveState(enabled);
        localStorage.setItem('autoSave', String(enabled));
    };

    // Initial effect to apply settings
    useEffect(() => {
        setTheme(theme);
        setFontSize(fontSize);
    }, []);

    return (
        <SettingsContext.Provider
            value={{
                fontSize,
                setFontSize,
                theme,
                setTheme,
                copilotEnabled,
                setCopilotEnabled,
                autoSave,
                setAutoSave
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}
