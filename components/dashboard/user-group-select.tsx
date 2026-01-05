"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Users, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Group,
    subscribeToGroups,
    getOrganizationMembers,
    type OrganizationMember
} from "@/lib/firebase/firestore";

interface UserGroupSelectProps {
    orgId: string;
    assigneeIds: string[];
    groupIds: string[];
    onAssigneeChange: (ids: string[]) => void;
    onGroupChange: (ids: string[]) => void;
    members?: OrganizationMember[]; // Optional if we want to fetch internally
}

export function UserGroupSelect({
    orgId,
    assigneeIds,
    groupIds,
    onAssigneeChange,
    onGroupChange,
    members: passedMembers
}: UserGroupSelectProps) {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<OrganizationMember[]>(passedMembers || []);
    const [groups, setGroups] = useState<Group[]>([]);

    // Fetch members if not passed
    useEffect(() => {
        if (!passedMembers && orgId) {
            getOrganizationMembers(orgId).then(setMembers);
        } else if (passedMembers) {
            setMembers(passedMembers);
        }
    }, [orgId, passedMembers]);

    // Fetch groups
    useEffect(() => {
        if (!orgId) return;
        const unsubscribe = subscribeToGroups((g) => setGroups(g));
        return () => unsubscribe();
    }, [orgId]);

    const toggleAssignee = (userId: string) => {
        const newIds = assigneeIds.includes(userId)
            ? assigneeIds.filter(id => id !== userId)
            : [...assigneeIds, userId];
        onAssigneeChange(newIds);
    };

    const toggleGroup = (groupId: string) => {
        const newIds = groupIds.includes(groupId)
            ? groupIds.filter(id => id !== groupId)
            : [...groupIds, groupId];
        onGroupChange(newIds);
    };

    const selectedMembers = members.filter(m => assigneeIds.includes(m.id));
    const selectedGroups = groups.filter(g => groupIds.includes(g.id));
    const totalSelected = selectedMembers.length + selectedGroups.length;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-auto min-h-9 w-full justify-between px-3 py-2"
                >
                    <div className="flex flex-wrap gap-1 items-center">
                        {totalSelected === 0 && <span className="text-muted-foreground">Assign to...</span>}

                        {selectedGroups.map(group => (
                            <Badge key={group.id} variant="secondary" className="rounded-sm px-1 font-normal text-xs flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {group.name}
                                <span
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleGroup(group.id);
                                    }}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </span>
                            </Badge>
                        ))}

                        {selectedMembers.map(member => (
                            <Badge key={member.id} variant="secondary" className="rounded-sm px-1 font-normal text-xs flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                    <AvatarImage src={member.photoURL || undefined} />
                                    <AvatarFallback className="text-[8px]">{member.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {member.displayName?.split(' ')[0]}
                                <span
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAssignee(member.id);
                                    }}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </span>
                            </Badge>
                        ))}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search people or groups..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading="Groups">
                            {groups.map((group) => (
                                <CommandItem
                                    key={group.id}
                                    value={"group:" + group.name}
                                    onSelect={() => toggleGroup(group.id)}
                                >
                                    <div className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        groupIds.includes(group.id)
                                            ? "bg-primary text-primary-foreground"
                                            : "opacity-50 [&_svg]:invisible"
                                    )}>
                                        <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <Users className="mr-2 h-4 w-4 opacity-50" />
                                    <span>{group.name}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">{group.memberIds.length} members</span>
                                </CommandItem>
                            ))}
                            {groups.length === 0 && <div className="py-2 text-xs text-center text-muted-foreground">No groups created yet.</div>}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Members">
                            {members.map((member) => (
                                <CommandItem
                                    key={member.id}
                                    value={"user:" + member.displayName}
                                    onSelect={() => toggleAssignee(member.id)}
                                >
                                    <div className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        assigneeIds.includes(member.id)
                                            ? "bg-primary text-primary-foreground"
                                            : "opacity-50 [&_svg]:invisible"
                                    )}>
                                        <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <Avatar className="mr-2 h-6 w-6">
                                        <AvatarImage src={member.photoURL || undefined} />
                                        <AvatarFallback className="text-[10px]">{member.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm">{member.displayName}</span>
                                        <span className="text-xs text-muted-foreground">{member.email}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
