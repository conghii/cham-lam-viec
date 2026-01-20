"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    Check,
    Clock,
    MoreVertical,
    Plus,
    Tag as TagIcon,
    Trash2,
    X,
    MessageSquare,
    Target,
    Pencil,
    Edit2,
    User as UserIcon,
    Sparkles
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";
import {
    Task,
    updateTask,
    SubTask,
    Comment,
    Goal,
    Tag,
    subscribeToTaskComments,
    addTaskComment,
    updateTaskStatus,
    deleteTask
} from "@/lib/firebase/firestore";
// We need a comment item component, but for now we might need to inline it or find it.
// Assuming we can inline a simple version or reuse if it exists.
// Looking at TaskCard, it uses CommentItem. Let's try to find it or make a simple one.

interface TaskDetailDialogProps {
    task: Task;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tags?: Tag[];
    members?: any[];
    goals?: Goal[];
    orgId?: string | null;
}

export function TaskDetailDialog({
    task,
    open,
    onOpenChange,
    tags = [],
    members = [],
    goals = [],
    orgId
}: TaskDetailDialogProps) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateSubtasks = async () => {
        if (!title) {
            toast.error("Please ensure the task has a title first.");
            return;
        }
        setIsGenerating(true);
        try {
            const res = await fetch("/api/ai/subtasks", {
                method: "POST",
                body: JSON.stringify({ title, description }),
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            if (data.subtasks && Array.isArray(data.subtasks)) {
                const newSubtasks = data.subtasks.map((st: string) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    title: st,
                    completed: false
                }));
                // Append to existing, don't overwrite if in edit mode, usually user wants to add to it.
                const updatedSubtasks = [...(task.subtasks || []), ...newSubtasks];
                await updateTask(task.id, { subtasks: updatedSubtasks });
                toast.success("Subtasks generated with AI! ✨");
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Failed to generate subtasks");
        } finally {
            setIsGenerating(false);
        }
    };

    // Task State
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || "");
    const [date, setDate] = useState<Date | undefined>(
        task.dueDate && task.dueDate !== "" ? new Date(task.dueDate) : undefined
    );
    const [priority, setPriority] = useState<"low" | "medium" | "high">(
        task.priority || "medium"
    );
    const [tag, setTag] = useState(task.tag || "");
    const [goalId, setGoalId] = useState<string | null | undefined>(task.goalId);

    // Assignees
    const [assigneeId, setAssigneeId] = useState<string | null | undefined>(task.assigneeId);
    const [assigneeIds, setAssigneeIds] = useState<string[]>(
        task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])
    );

    // Subtasks
    const [newSubtask, setNewSubtask] = useState("");

    // Comments
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");

    // Sync state when task changes or dialog opens
    useEffect(() => {
        if (open) {
            setTitle(task.title);
            setDescription(task.description || "");
            setDate(task.dueDate ? new Date(task.dueDate) : undefined);
            setPriority(task.priority || "medium");
            setTag(task.tag || "");
            setGoalId(task.goalId);
            setAssigneeIds(task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []));
            setIsEditMode(false);
        }
    }, [open, task]);

    // Subscribe to comments
    useEffect(() => {
        if (open) {
            const unsubscribe = subscribeToTaskComments(task.id, (data) =>
                setComments(data)
            );
            return () => unsubscribe();
        }
    }, [open, task.id]);

    const handleSave = async () => {
        try {
            await updateTask(task.id, {
                title,
                description,
                dueDate: date ? date.toISOString() : null,
                priority,
                tag,
                goalId: goalId === "none" ? null : goalId,
                assigneeIds,
                // Legacy support
                assigneeId: assigneeIds.length > 0 ? assigneeIds[0] : null
            });
            setIsEditMode(false);
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    // Auto-save on discrete field changes (like priority, date context menu style) if not in full edit mode? 
    // TaskCard saves on "Save Details" or individual changes?
    // The previous TaskCard had a specific "Save" button in edit mode.
    // Let's rely on handleSave for the main edit mode, but direct updates for some like status.

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;
        const subtask: SubTask = {
            id: Math.random().toString(36).substr(2, 9),
            title: newSubtask,
            completed: false,
        };
        const updatedSubtasks = [...(task.subtasks || []), subtask];
        await updateTask(task.id, { subtasks: updatedSubtasks });
        setNewSubtask("");
    };

    const toggleSubtask = async (subtaskId: string) => {
        const updatedSubtasks = (task.subtasks || []).map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        await updateTask(task.id, { subtasks: updatedSubtasks });
    };

    const deleteSubtask = async (subtaskId: string) => {
        const updatedSubtasks = (task.subtasks || []).filter((st) => st.id !== subtaskId);
        await updateTask(task.id, { subtasks: updatedSubtasks });
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        await addTaskComment(task.id, newComment);
        setNewComment("");
    };

    const priorityConfig = {
        low: { color: "bg-slate-100 text-slate-700 border-slate-200" },
        medium: { color: "bg-amber-50 text-amber-700 border-amber-200" },
        high: { color: "bg-rose-50 text-rose-700 border-rose-200" },
    };

    const subtasksTotal = task.subtasks?.length || 0;
    const subtasksCompleted = task.subtasks?.filter((st) => st.completed).length || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="w-[95vw] md:w-[80vw] lg:w-[60vw] max-w-[800px] h-[90vh] md:h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-muted/50 to-transparent flex-shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                            {isEditMode ? (
                                <>
                                    <DialogTitle className="sr-only">Edit Task</DialogTitle>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="font-bold text-xl border-transparent px-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/80 hover:bg-muted/50 transition-colors"
                                        placeholder="Task title"
                                        autoFocus
                                    />
                                </>
                            ) : (
                                <DialogTitle className="text-xl font-bold leading-tight py-1">
                                    {task.title}
                                </DialogTitle>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant={task.completed ? "secondary" : "default"} className="rounded-sm font-normal">
                                    {task.completed ? "Completed" : "Active"}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditMode ? (
                                <Button size="sm" onClick={handleSave} className="h-8">Save</Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsEditMode(true)}
                                    className="rounded-full hover:bg-black/5"
                                    title="Edit Task"
                                >
                                    <Pencil className="h-4 w-4 opacity-70" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="rounded-full hover:bg-black/5"
                            >
                                <X className="h-5 w-5 opacity-70" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <ScrollArea className="flex-1 p-4 md:p-6 h-full bg-background/50">
                        <div className="space-y-8">
                            {/* Metadata Grid */}
                            <div className="flex flex-wrap gap-6 p-4 bg-muted/20 rounded-xl border border-border/40">
                                {/* Priority */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</Label>
                                    {isEditMode ? (
                                        <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                            <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant="outline" className={cn("font-normal capitalize", priorityConfig[priority]?.color)}>
                                            {priority}
                                        </Badge>
                                    )}
                                </div>

                                {/* Date */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</Label>
                                    {isEditMode ? (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-8 text-xs font-normal justify-start text-left w-[130px]">
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {date ? format(date, "MMM d") : "Set date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    ) : (
                                        <div className="flex items-center h-8 text-sm">
                                            {date ? <span className="flex items-center gap-2"><CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />{format(date, "MMM d, yyyy")}</span> : <span className="text-muted-foreground text-xs italic">No date</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Tag */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tag</Label>
                                    {isEditMode ? (
                                        <Select value={tag} onValueChange={setTag}>
                                            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Select tag" /></SelectTrigger>
                                            <SelectContent>
                                                {tags.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-center h-8">
                                            {(() => {
                                                const t = tags.find(tg => tg.id === tag || tg.label === tag);
                                                return t ? (
                                                    <Badge variant="outline" className={cn("font-normal", t.color)}>{t.label}</Badge>
                                                ) : (tag ? <Badge variant="outline">{tag}</Badge> : <span className="text-muted-foreground text-xs italic">No tag</span>)
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Assignee */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignee</Label>
                                    {isEditMode ? (
                                        <Select value={assigneeIds[0] || "none"} onValueChange={(v) => setAssigneeIds(v === "none" ? [] : [v])}>
                                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                                <SelectValue placeholder="Unassigned" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Unassigned</SelectItem>
                                                {members.map(m => (
                                                    <SelectItem key={m.uid} value={m.uid}>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-4 w-4"><AvatarImage src={m.photoURL} /><AvatarFallback>{m.displayName?.[0]}</AvatarFallback></Avatar>
                                                            <span>{m.displayName}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-center h-8">
                                            {assigneeIds.length > 0 ? (
                                                <div className="flex -space-x-2">
                                                    {assigneeIds.map(id => {
                                                        const m = members.find(mem => mem.uid === id);
                                                        if (!m) return null;
                                                        return <Avatar key={id} className="h-6 w-6 border-2 border-background" title={m.displayName}><AvatarImage src={m.photoURL} /><AvatarFallback>{m.displayName?.[0]}</AvatarFallback></Avatar>
                                                    })}
                                                </div>
                                            ) : <span className="text-muted-foreground text-xs italic">Unassigned</span>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold">Description</Label>
                                {isEditMode ? (
                                    <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px]" placeholder="Add description..." />
                                ) : (
                                    <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", !description && "italic text-muted-foreground")}>
                                        {description || "No description provided."}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Subtasks */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-sm font-semibold">
                                        <CheckCircle2 className="h-4 w-4 text-primary" /> Subtasks
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        {isEditMode && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGenerateSubtasks}
                                                disabled={isGenerating}
                                                className="h-6 text-[10px] px-2 gap-1.5 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                                            >
                                                <Sparkles className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                                                {isGenerating ? "Generating..." : "Auto-Breakdown"}
                                            </Button>
                                        )}
                                        <span className="text-xs text-muted-foreground">{subtasksCompleted}/{subtasksTotal}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {(task.subtasks || []).map((st) => (
                                        <div key={st.id} className="flex items-center gap-3 group p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                            <Checkbox checked={st.completed} onCheckedChange={() => toggleSubtask(st.id)} className="rounded-full" />
                                            <span className={cn("flex-1 text-sm", st.completed && "line-through text-muted-foreground")}>{st.title}</span>
                                            {isEditMode && (
                                                <Button variant="ghost" size="icon" onClick={() => deleteSubtask(st.id)} className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {isEditMode && (
                                    <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Add a step..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} className="h-9 border-none bg-transparent hover:bg-muted/30" />
                                    </form>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Activity Feed */}
                    <div className="w-full md:w-[320px] bg-muted/10 border-l flex flex-col h-[300px] md:h-full shrink-0">
                        <div className="p-4 border-b font-medium text-xs uppercase tracking-wider text-muted-foreground bg-muted/5">
                            Activity
                        </div>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="h-6 w-6 mt-1">
                                            <AvatarImage src={comment.userPhotoURL} />
                                            <AvatarFallback>{comment.userDisplayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold">{comment.userDisplayName}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {comment.createdAt ? format(comment.createdAt.toDate(), "MMM d, HH:mm") : "Just now"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-foreground/80 leading-relaxed bg-white dark:bg-slate-800 p-2 rounded-lg border border-border/40">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {comments.length === 0 && (
                                    <div className="text-center py-8 text-xs text-muted-foreground italic">No comments yet.</div>
                                )}
                            </div>
                        </ScrollArea>
                        <div className="p-3 border-t bg-background">
                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <Avatar className="h-6 w-6"><AvatarFallback>Me</AvatarFallback></Avatar>
                                <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." className="h-8 text-xs flex-1" />
                            </form>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
