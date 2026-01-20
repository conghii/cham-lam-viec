"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tag, updateTagInOrganization, addTagToOrganization, deleteTagFromOrganization } from "@/lib/firebase/firestore";

export const presetColors = [
    { label: "Slate", value: "bg-slate-50 text-slate-600 border-slate-100" },
    { label: "Blue", value: "bg-blue-50 text-blue-600 border-blue-100" },
    {
        label: "Green",
        value: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    { label: "Purple", value: "bg-purple-50 text-purple-600 border-purple-100" },
    { label: "Pink", value: "bg-pink-50 text-pink-600 border-pink-100" },
    { label: "Orange", value: "bg-orange-50 text-orange-600 border-orange-100" },
    { label: "Red", value: "bg-rose-50 text-rose-600 border-rose-100" },
];

interface TagManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId?: string;
    tags: Tag[];
    editingTag: Tag | null;
    setEditingTag: (tag: Tag | null) => void;
    newTagName: string;
    setNewTagName: (name: string) => void;
    newTagColor: string;
    setNewTagColor: (color: string) => void;
}

export function TagManagerDialog({
    open,
    onOpenChange,
    orgId,
    tags,
    editingTag,
    setEditingTag,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
}: TagManagerDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Tags</DialogTitle>
                    <DialogDescription>
                        Create, edit, and remove tags for your organization.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex gap-2 items-end">
                        <div className="space-y-2 flex-1">
                            <Label>
                                {editingTag ? "Edit Tag Name" : "New Tag Name"}
                            </Label>
                            <Input
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                placeholder="e.g. Marketing"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn("w-9 px-0", newTagColor)}
                                    >
                                        <div
                                            className={cn(
                                                "h-4 w-4 rounded-full",
                                                newTagColor
                                                    .split(" ")[0]
                                                    .replace("bg-", "bg-"),
                                            )}
                                        />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[180px] p-2">
                                    <div className="grid grid-cols-4 gap-2">
                                        {presetColors.map((c) => (
                                            <div
                                                key={c.value}
                                                className={cn(
                                                    "h-6 w-6 rounded-full cursor-pointer border hover:scale-110 transition-transform",
                                                    c.value,
                                                    newTagColor === c.value &&
                                                    "ring-2 ring-primary ring-offset-2",
                                                )}
                                                onClick={() => setNewTagColor(c.value)}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button
                            onClick={async () => {
                                if (!newTagName.trim() || !orgId) return;
                                if (editingTag) {
                                    await updateTagInOrganization(
                                        orgId,
                                        editingTag.id,
                                        newTagName,
                                        newTagColor,
                                    );
                                    setEditingTag(null);
                                } else {
                                    await addTagToOrganization(
                                        orgId,
                                        newTagName,
                                        newTagColor,
                                    );
                                }
                                setNewTagName("");
                                setNewTagColor(presetColors[0].value);
                            }}
                            className="w-20"
                        >
                            {editingTag ? "Save" : "Add"}
                        </Button>
                        {editingTag && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setEditingTag(null);
                                    setNewTagName("");
                                    setNewTagColor(presetColors[0].value);
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <ScrollArea className="h-[200px] border rounded-md p-2">
                        <div className="space-y-2">
                            {tags.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-8">
                                    No custom tags yet.
                                </p>
                            ) : (
                                tags.map((tag) => (
                                    <div
                                        key={tag.id}
                                        className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/30 group"
                                    >
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "font-normal capitalize",
                                                tag.color,
                                            )}
                                        >
                                            {tag.label}
                                        </Badge>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                    setEditingTag(tag);
                                                    setNewTagName(tag.label);
                                                    setNewTagColor(
                                                        tag.color || presetColors[0].value,
                                                    );
                                                }}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    if (orgId)
                                                        deleteTagFromOrganization(
                                                            orgId,
                                                            tag.id,
                                                        );
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
