"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Calendar as CalendarIcon,
    Target,
    Tag as TagIcon,
    Flag,
    CornerDownLeft,
    X,
    Users
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Goal, Tag } from "@/lib/firebase/firestore";

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialStatus: string;
    statusLabel: string;
    onSubmit: (data: {
        title: string;
        priority: "low" | "medium" | "high";
        dueDate?: Date;
        tag?: string;
        goalId?: string;
        assigneeId?: string;
    }) => Promise<void>;
    goals?: Goal[];
    tags?: Tag[];
    members?: any[];
}

export function CreateTaskDialog({
    open,
    onOpenChange,
    initialStatus,
    statusLabel,
    onSubmit,
    goals = [],
    tags = [],
    members = []
}: CreateTaskDialogProps) {
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [tag, setTag] = useState<string>("general");
    const [goalId, setGoalId] = useState<string | null>(null);
    const [assigneeId, setAssigneeId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when opened
    useEffect(() => {
        if (open) {
            setTitle("");
            setPriority("medium");
            setDate(undefined);
            setTag("general");
            setGoalId(null);
            setAssigneeId(null);
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!title.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);
            await onSubmit({
                title,
                priority,
                dueDate: date,
                tag,
                goalId: goalId || undefined,
                assigneeId: assigneeId || undefined
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Error creating task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const priorityConfig = {
        low: { label: "Low", color: "text-slate-500 bg-slate-100 border-slate-200" },
        medium: { label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200" },
        high: { label: "High", color: "text-rose-600 bg-rose-50 border-rose-200" }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden sm:rounded-xl">
                <DialogHeader className="px-6 py-3 border-b border-border/40 bg-muted/20">
                    <DialogTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold tracking-wider uppercase">CAPTURE</span>
                        New Task
                        <span className="text-muted-foreground/50">•</span>
                        <span>{statusLabel}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="sr-only" htmlFor="task-title">
                            What are you working on?
                        </label>
                        <Input
                            id="task-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="What are you working on?"
                            className="text-2xl font-medium border-0 px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto bg-transparent"
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Selector */}
                        <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                            <SelectTrigger className={cn(
                                "h-8 border bg-transparent hover:bg-muted/50 transition-colors w-auto gap-2 px-3 rounded-full",
                                priorityConfig[priority].color
                            )}>
                                <Flag className="w-3.5 h-3.5 fill-current opacity-70" />
                                <span className="text-xs font-medium">{priorityConfig[priority].label}</span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low Priority</SelectItem>
                                <SelectItem value="medium">Medium Priority</SelectItem>
                                <SelectItem value="high">High Priority</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date Selector */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-8 rounded-full border-dashed px-3 text-xs",
                                        date ? "border-solid bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" : "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                    {date ? format(date, "MMM d") : "Date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Goal Selector */}
                        <Select value={goalId || "none"} onValueChange={(v) => setGoalId(v === "none" ? null : v)}>
                            <SelectTrigger className="h-8 w-auto px-3 rounded-full border-dashed text-xs text-muted-foreground hover:text-foreground">
                                <div className="flex items-center gap-2">
                                    <Target className="h-3.5 w-3.5" />
                                    <span className="truncate max-w-[100px]">
                                        {goals.find(g => g.id === goalId)?.title || "Link Goal"}
                                    </span>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Goal</SelectItem>
                                {goals.map(g => (
                                    <SelectItem key={g.id} value={g.id} className="max-w-[200px] truncate">
                                        {g.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Tag Selector */}
                        <Select value={tag} onValueChange={setTag}>
                            <SelectTrigger className="h-8 w-auto px-3 rounded-full border-dashed text-xs text-muted-foreground hover:text-foreground">
                                <div className="flex items-center gap-2">
                                    <TagIcon className="h-3.5 w-3.5" />
                                    <span className="capitalize">{tags.find(t => t.id === tag || t.label === tag)?.label || tag || "Tag"}</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {tags.map(t => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Assignee Selector */}
                        <Select value={assigneeId || "none"} onValueChange={(v) => setAssigneeId(v === "none" ? null : v)}>
                            <SelectTrigger className="h-8 w-auto px-3 rounded-full border-dashed text-xs text-muted-foreground hover:text-foreground">
                                <div className="flex items-center gap-2">
                                    {assigneeId && members.find(m => m.uid === assigneeId) ? (
                                        <Avatar className="h-4 w-4">
                                            <AvatarImage src={members.find(m => m.uid === assigneeId)?.photoURL} />
                                            <AvatarFallback className="text-[8px]">
                                                {members.find(m => m.uid === assigneeId)?.displayName?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <Users className="h-3.5 w-3.5" />
                                    )}
                                    <span className="truncate max-w-[100px]">
                                        {assigneeId
                                            ? (members.find(m => m.uid === assigneeId)?.displayName || "Assignee")
                                            : "Assignee"}
                                    </span>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Assignee</SelectItem>
                                {members.map(m => (
                                    <SelectItem key={m.uid} value={m.uid}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={m.photoURL} />
                                                <AvatarFallback className="text-[8px]">
                                                    {m.displayName?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>{m.displayName}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-3 bg-muted/20 border-t border-border/40">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium opacity-100">
                                <CornerDownLeft className="h-3 w-3" />
                            </kbd>
                            <span>to add</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium opacity-100">
                                ESC
                            </kbd>
                            <span>to cancel</span>
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={!title.trim() || isSubmitting}
                        className="bg-sky-400 hover:bg-sky-500 text-white font-medium px-6"
                    >
                        {isSubmitting ? "Creating..." : "Create Task"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Need to import ArrowRight here since it wasn't in the top imports
import { ArrowRight } from "lucide-react";
