"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, MoreHorizontal, Pencil, Plus, Trash2, Palette } from "lucide-react";
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
import { Tag } from "@/lib/firebase/firestore";

interface TagSelectorProps {
    value: string;
    onChange: (value: string) => void;
    tags: Tag[];
    role?: string; // 'owner' | 'member' | 'viewer'
    onEditTag?: (tag: Tag) => void;
    onDeleteTag?: (tagId: string) => void;
    onCreateTag?: () => void;
    className?: string;
}

export function TagSelector({
    value,
    onChange,
    tags,
    role = "member",
    onEditTag,
    onDeleteTag,
    onCreateTag,
    className,
}: TagSelectorProps) {
    const [open, setOpen] = useState(false);

    // Find selected tag object
    const selectedTag = tags.find((t) => t.id === value) || tags.find((t) => t.label.toLowerCase() === value.toLowerCase()) || tags[0];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-[140px] justify-between h-9 px-3 border-border/50 bg-muted/30 hover:bg-muted/50 text-muted-foreground font-normal", className)}
                >
                    {selectedTag ? (
                        <div className="flex items-center gap-2 truncate">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", selectedTag.color?.split(" ")[0].replace("text-", "bg-").replace("bg-", "bg-") || "bg-slate-400")} />
                            <span className="truncate">{selectedTag.label}</span>
                        </div>
                    ) : (
                        "Select tag..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search tags..." />
                    <CommandList>
                        <CommandEmpty>No tags found.</CommandEmpty>
                        <CommandGroup heading="Tags">
                            {tags.map((tag) => (
                                <CommandItem
                                    key={tag.id}
                                    value={tag.label}
                                    onSelect={() => {
                                        onChange(tag.id);
                                        setOpen(false);
                                    }}
                                    className="group flex items-center justify-between cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 truncate flex-1">
                                        <div className={cn("w-2 h-2 rounded-full", tag.color?.split(" ")[0].replace("text-", "bg-").replace("bg-", "bg-") || "bg-slate-400")} />
                                        <span>{tag.label}</span>
                                    </div>

                                    {value === tag.id && (
                                        <Check className={cn("mr-2 h-4 w-4 opacity-100", role === 'owner' && "mr-0")} />
                                    )}

                                    {/* Action Buttons */}
                                    {true && (
                                        <div className="flex items-center gap-1 ml-auto pl-2 bg-popover">
                                            <div
                                                role="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditTag?.(tag);
                                                }}
                                                className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-primary transition-colors"
                                                title="Edit Tag"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </div>
                                            <div
                                                role="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteTag?.(tag.id);
                                                }}
                                                className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-destructive transition-colors"
                                                title="Delete Tag"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </div>
                                        </div>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {onCreateTag && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => {
                                            onCreateTag();
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer text-primary"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Tag
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
