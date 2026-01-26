
import { useCollaboration, Collaborator } from "@/contexts/CollaborationContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function OnlineUsersList() {
    const context = useCollaboration();

    if (!context || !context.isConnected) {
        return null;
    }

    const { onlineUsers } = context;

    if (onlineUsers.length <= 1) {
        // If only self, maybe don't show anything or show a "You are alone" state?
        // Let's hidden if only 1 (user themselves)
        return null;
    }

    return (
        <div className="flex items-center -space-x-2 mr-4">
            {onlineUsers.map((user) => (
                <Tooltip key={user.userId}>
                    <TooltipTrigger>
                        <Avatar className="h-8 w-8 border-2 border-background ring-1 ring-border">
                            {/* If we had an avatar URL, we'd use it. For now, initials. */}
                            <AvatarFallback
                                style={{ backgroundColor: user.color, color: 'white' }}
                                className="text-xs font-medium"
                            >
                                {user.email.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{user.email}</p>
                        <p className="text-xs text-muted-foreground">Since {user.onlineAt.toLocaleTimeString()}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}
