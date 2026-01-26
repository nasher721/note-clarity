
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/clinical/Header';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDocumentContext } from '@/contexts/DocumentContext';
import { CollaborationProvider } from '@/contexts/CollaborationContext';

export function DashboardLayout() {
    const { user, loading, signOut } = useAuth();
    const { selectDocument, currentDocument } = useDocumentContext();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine mode from URL path
    const getModeFromPath = (path: string) => {
        if (path.includes('/batch')) return 'batch';
        if (path.includes('/chart')) return 'chart';
        if (path.includes('/inference')) return 'inference';
        if (path.includes('/intelligence')) return 'intelligence';
        if (path.includes('/analytics')) return 'analytics';
        return 'training';
    };

    const currentMode = getModeFromPath(location.pathname);

    // Handle mode switching from Header
    const handleModeChange = (newMode: 'training' | 'inference' | 'batch' | 'chart' | 'intelligence' | 'analytics') => {
        // When switching modes, we might need to clear current document selection
        // depending on the target mode, or just navigate
        if (newMode === 'training') {
            navigate('/workspace/training');
        } else {
            navigate(`/workspace/${newMode}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <CollaborationProvider documentId={currentDocument?.id || null}>
            <div className="min-h-screen flex flex-col bg-background">
                <Header
                    mode={currentMode as any}
                    onModeChange={handleModeChange}
                    user={user}
                    onSignOut={signOut}
                />
                <main className="flex-1 overflow-hidden">
                    <Outlet />
                </main>
            </div>
        </CollaborationProvider>
    );
}
