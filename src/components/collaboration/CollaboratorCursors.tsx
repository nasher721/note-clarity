
import { useCollaboration } from "@/contexts/CollaborationContext";
import { useAuth } from '@/hooks/useAuth';
import { MousePointer2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CollaboratorCursorsProps {
    // We might need to know container dimensions or interact with ChunkViewer
    // For now, let's assume we render *inside* ChunkViewer items or over them?
    // Actually, rendering over specific chunks is easier if this component is inside the Chunk list loop.
    // OR, we pass the chunkId and this component renders ONLY if there's a cursor for that chunk.
    chunkId: string;
}

export function CollaboratorCursors({ chunkId }: CollaboratorCursorsProps) {
    const context = useCollaboration();
    const { user } = useAuth();

    if (!context || !user) return null;

    const { cursors, onlineUsers } = context;

    // Find cursors on this chunk
    const activeCursors = Array.from(cursors.entries())
        .filter(([userId, position]) => position.chunkId === chunkId && userId !== user.id)
        .map(([userId, position]) => {
            const userInfo = onlineUsers.find(u => u.userId === userId);
            return { userId, position, userInfo };
        })
        .filter(c => c.userInfo); // Ensure we have user info

    return (
        <AnimatePresence>
            {activeCursors.map(({ userId, userInfo, position }) => (
                <motion.div
                    key={userId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute pointer-events-none z-10 flex items-center gap-1"
                    // Position logic: if we have selection indices, we'd need complex text measurement.
                    // For MVP, let's just show it at the top-right of the chunk or generic "present" indicator.
                    // Let's put it top-right of the ID badge for now.
                    style={{
                        top: -10,
                        right: 0,
                        // If we implement text selection mapping later, we'd use position.selection
                    }}
                >
                    <div
                        className="flex items-center px-1.5 py-0.5 rounded text-[10px] text-white shadow-sm font-medium"
                        style={{ backgroundColor: userInfo?.color || '#888' }}
                    >
                        <MousePointer2 className="h-3 w-3 mr-1" />
                        {userInfo?.email.split('@')[0]}
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
    );
}
