import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type OrganizationMember, type Group } from "@/lib/firebase/firestore";
import { Users } from "lucide-react";

interface AssigneeDisplayProps {
    assigneeIds?: string[];
    groupIds?: string[];
    members: OrganizationMember[];
    groups: Group[];
    className?: string;
    maxAssignees?: number;
}

export function AssigneeDisplay({
    assigneeIds = [],
    groupIds = [],
    members,
    groups,
    className,
    maxAssignees = 3
}: AssigneeDisplayProps) {
    const assignedMembers = members.filter(m => assigneeIds.includes(m.id));
    const assignedGroups = groups.filter(g => groupIds.includes(g.id));

    if (assignedMembers.length === 0 && assignedGroups.length === 0) {
        return null;
    }

    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            {/* Groups */}
            {assignedGroups.map(group => (
                <Badge
                    key={group.id}
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors h-6 px-2 gap-1 text-[10px] font-medium uppercase tracking-tight"
                >
                    <Users className="h-2.5 w-2.5" />
                    {group.name}
                </Badge>
            ))}

            {/* User Avatars */}
            {assignedMembers.length > 0 && (
                <div className="flex -space-x-2 overflow-hidden">
                    {assignedMembers.slice(0, maxAssignees).map((member) => (
                        <Avatar
                            key={member.id}
                            className="h-6 w-6 border-2 border-background ring-0 transition-transform hover:scale-110"
                            title={member.displayName || member.email}
                        >
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback className="text-[8px] bg-muted">
                                {member.displayName?.charAt(0) || "?"}
                            </AvatarFallback>
                        </Avatar>
                    ))}
                    {assignedMembers.length > maxAssignees && (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                            +{assignedMembers.length - maxAssignees}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
