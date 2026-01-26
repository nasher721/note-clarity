
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';
import { PrimaryLabel } from '@/types/clinical';

export interface Collaborator {
    userId: string;
    email: string;
    color: string; // Hex color for their cursor
    onlineAt: Date;
}

export interface CursorPosition {
    chunkId: string | null;
    selection?: {
        start: number;
        end: number;
        text: string;
    };
    timestamp: number;
}

interface CollaborationContextType {
    onlineUsers: Collaborator[];
    cursors: Map<string, CursorPosition>;
    broadcastCursor: (position: CursorPosition) => void;
    isConnected: boolean;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

// Generate a random color for the user
const getRandomColor = (userId: string) => {
    const colors = [
        '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399',
        '#22d3ee', '#818cf8', '#c084fc', '#f472b6', '#fb7185'
    ];
    // specific deterministic color based on char code sum
    const sum = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
};

export function CollaborationProvider({
    documentId,
    children
}: {
    documentId: string | null;
    children: ReactNode
}) {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<Collaborator[]>([]);
    const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!user || !documentId) {
            setOnlineUsers([]);
            setCursors(new Map());
            setIsConnected(false);
            return;
        }

        const channel = supabase.channel(`doc_room:${documentId}`, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const users: Collaborator[] = [];

                for (const key in newState) {
                    const state = newState[key][0] as any; // First presence for this user
                    if (state) {
                        users.push({
                            userId: key,
                            email: state.email || 'Anonymous',
                            color: state.color || getRandomColor(key),
                            onlineAt: new Date(state.online_at || Date.now()),
                        });
                    }
                }
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // console.log('User joined:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // Remove cursor when user leaves
                setCursors(prev => {
                    const next = new Map(prev);
                    next.delete(key);
                    return next;
                });
            })
            .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
                if (payload.userId !== user.id) {
                    setCursors(prev => {
                        const next = new Map(prev);
                        next.set(payload.userId, payload.position);
                        return next;
                    });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    // Track presence
                    channel.track({
                        email: user.email,
                        color: getRandomColor(user.id),
                        online_at: new Date().toISOString(),
                    });
                } else {
                    setIsConnected(false);
                }
            });

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [documentId, user]);

    const broadcastCursor = (position: CursorPosition) => {
        if (channelRef.current && isConnected && user) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'cursor-move',
                payload: {
                    userId: user.id,
                    position: {
                        ...position,
                        timestamp: Date.now(),
                    },
                },
            });
        }
    };

    const value = {
        onlineUsers,
        cursors,
        broadcastCursor,
        isConnected,
    };

    return (
        <CollaborationContext.Provider value={value}>
            {children}
        </CollaborationContext.Provider>
    );
}

export function useCollaboration() {
    const context = useContext(CollaborationContext);
    // It's optional because we might be in a route without provider (e.g. auth)
    // But generally in workspace it should be available if wrapped.
    // Returning partial or throwing if critical?
    // Let's return undefined if not wrapped, but consuming components should handle it.
    return context;
}
