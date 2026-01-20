"use client";

import { useState, useEffect } from "react";
import {
    updateTask,
    type Task,
    type TaskColumn,
    type SubTask,
    type Comment,
    addTaskComment,
    subscribeToTaskComments,
    subscribeToGoals,
    type Goal,
    Tag,
    updateTaskStatus,
    deleteTask,
} from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Trash2,
    Plus,
    Calendar as CalendarIcon,
    Pencil,
    MoreVertical,
    Edit2,
    X,
    Check,
    Target,
    Tag as TagIcon,
    AlertCircle,
    MessageSquare,
    Send,
    CheckCircle2,
    Sparkles,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserGroupSelect } from "@/components/dashboard/user-group-select";
import { TagSelector } from "@/components/dashboard/tag-selector";
import { AssigneeDisplay } from "@/components/dashboard/assignee-display";
import { type Group } from "@/lib/firebase/firestore";
import { toast } from "sonner";
import { useLanguage } from "@/components/shared/language-context";
import { CommentItem } from "./comment-item";

// Default tags if none exist
const defaultTags: Tag[] = [];

const priorityConfig = {
    low: {
        label: "Low",
        color: "text-slate-500 bg-slate-100 dark:bg-slate-900 border-slate-200",
        borderColor: "border-l-slate-400",
    },
    medium: {
        label: "Medium",
        color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200",
        borderColor: "border-l-amber-500",
    },
    high: {
        label: "High",
        color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-200",
        borderColor: "border-l-rose-500",
    },
};

export interface TaskCardProps {
    task: Task;
    compact?: boolean;
    columns?: TaskColumn[];
    onMove?: (taskId: string, status: string) => void;
    dragHandleProps?: any;
    members?: any[];
    groups?: Group[];
    role?: string;
    orgId?: string;
    tags?: Tag[];
    onEditTag?: (tag: Tag) => void;
    onDeleteTag?: (tagId: string) => void;
    onCreateTag?: () => void;
    isDragging?: boolean;
}

export function TaskCard({
    task,
    compact = false,
    columns,
    onMove,
    dragHandleProps,
    members = [],
    groups = [],
    role = "member",
    orgId,
    tags = [],
    onEditTag,
    onDeleteTag,
    onCreateTag,
    isDragging,
}: TaskCardProps) {
    const { t } = useLanguage();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Edit State
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
    const [assigneeId, setAssigneeId] = useState<string | null | undefined>(
        task.assigneeId
    );
    const [assigneeIds, setAssigneeIds] = useState<string[]>(
        task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])
    );
    const [groupIds, setGroupIds] = useState<string[]>(task.groupIds || []);

    // Subtasks State
    const [newSubtask, setNewSubtask] = useState("");

    // Comments State
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");

    // Goals State
    const [goals, setGoals] = useState<Goal[]>([]);

    // Subscribe to data
    useEffect(() => {
        if (isDetailsOpen) {
            const unsubComments = subscribeToTaskComments(task.id, (data) =>
                setComments(data)
            );
            const unsubGoals = subscribeToGoals((data) => setGoals(data));
            return () => {
                unsubComments();
                unsubGoals();
            };
        }
    }, [isDetailsOpen, task.id]);

    const openDetails = (edit: boolean = false) => {
        setIsEditMode(edit);
        setIsDetailsOpen(true);
    };

    const handleSaveDetails = async () => {
        try {
            await updateTask(task.id, {
                title,
                description,
                dueDate: date ? date.toISOString() : null,
                priority,
                tag,
                goalId: goalId === "none" || goalId === undefined ? null : goalId,
                assigneeId: assigneeIds.length > 0 ? assigneeIds[0] : null,
                assigneeIds: assigneeIds,
                groupIds: groupIds,
            });
            setIsEditMode(false);
        } catch (error: any) {
            console.error("Failed to update task", error);
            toast.error("Failed to save task: " + error.message);
        }
    };

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;

        try {
            const subtask: SubTask = {
                id: Math.random().toString(36).substr(2, 9),
                title: newSubtask,
                completed: false,
            };

            const updatedSubtasks = [...(task.subtasks || []), subtask];
            await updateTask(task.id, { subtasks: updatedSubtasks });
            setNewSubtask("");
        } catch (error: any) {
            console.error("Failed to add subtask", error);
            toast.error("Failed to add subtask: " + error.message);
        }
    };

    const toggleSubtask = async (subtaskId: string) => {
        try {
            const updatedSubtasks = (task.subtasks || []).map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
            );
            await updateTask(task.id, { subtasks: updatedSubtasks });
        } catch (error: any) {
            console.error("Failed to toggle subtask", error);
            toast.error("Failed to toggle subtask: " + error.message);
        }
    };

    const deleteSubtask = async (subtaskId: string) => {
        try {
            const updatedSubtasks = (task.subtasks || []).filter(
                (st) => st.id !== subtaskId
            );
            await updateTask(task.id, { subtasks: updatedSubtasks });
        } catch (error: any) {
            console.error("Failed to delete subtask", error);
            toast.error("Failed to delete subtask: " + error.message);
        }
    };

    const handleToggleTask = async () => {
        try {
            await updateTask(task.id, { completed: !task.completed });
        } catch (error: any) {
            console.error("Failed to toggle task", error);
            toast.error("Failed to toggle task: " + error.message);
        }
    };

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
                // Append to existing
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

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        await addTaskComment(task.id, newComment);
        setNewComment("");
    };

    // Calculate progress
    const subtasksTotal = task.subtasks?.length || 0;
    const subtasksCompleted =
        task.subtasks?.filter((st) => st.completed).length || 0;
    const progress =
        subtasksTotal === 0
            ? 0
            : Math.round((subtasksCompleted / subtasksTotal) * 100);

    return (
        <>
            <div
                {...(dragHandleProps || {})}
                className={cn(
                    "group flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 transition-all duration-300",
                    compact ? "py-2 pr-2 pl-1.5 gap-1" : "p-3 gap-1.5",
                    "hover:shadow-md hover:scale-[1.01] hover:border-primary/20 dark:hover:border-primary/20",
                    isDragging ? "transition-none shadow-xl border-primary/50 z-50 scale-105" : "",
                    "border-l-[4px]",
                    priorityConfig[task.priority as keyof typeof priorityConfig]?.borderColor || "border-l-indigo-500",
                    task.completed &&
                    "opacity-75 bg-gray-50/50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-none hover:scale-100 border-l-gray-300 dark:border-l-slate-700 contrast-75 saturate-50",
                    dragHandleProps && "cursor-grab active:cursor-grabbing",
                )}
            >
                <div className="flex items-center justify-between mb-0.5 min-h-[20px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* Tags */}
                        {(() => {
                            const availableTags = tags.length > 0 ? tags : defaultTags;
                            const currentTag =
                                availableTags.find((t) => t.id === (task.tag || "")) ||
                                availableTags.find(
                                    (t) =>
                                        t.label.toLowerCase() ===
                                        (task.tag || "").toLowerCase(),
                                ) ||
                                (availableTags.length > 0 ? availableTags[0] : null);

                            if (!currentTag) return null;

                            return (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "rounded-md border-0 px-1.5 py-0 font-medium capitalize h-5 text-[10px] max-w-[80px] truncate",
                                        currentTag.color || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                                    )}
                                >
                                    <TagIcon className="h-2.5 w-2.5 mr-1 opacity-70 shrink-0" />
                                    <span className="truncate">{currentTag.label}</span>
                                </Badge>
                            );
                        })()}

                        {/* Due Date */}
                        {task.dueDate && (
                            <span
                                className={cn(
                                    "px-1.5 py-0 rounded-full font-medium flex items-center gap-1 transition-colors h-5 text-[10px] whitespace-nowrap shrink-0",
                                    new Date(task.dueDate) < new Date() && !task.completed
                                        ? "text-rose-600 bg-rose-50 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900"
                                        : "text-slate-500 bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
                                )}
                            >
                                <CalendarIcon className="h-2.5 w-2.5" />
                                {new Date(task.dueDate) < new Date() && !task.completed && "!"}
                                {format(
                                    new Date(task.dueDate),
                                    "MMM d"
                                )}
                            </span>
                        )}

                        {/* Assignees */}
                        <AssigneeDisplay
                            assigneeIds={
                                task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])
                            }
                            groupIds={task.groupIds}
                            members={members}
                            groups={groups}
                            className="scale-90 origin-left ml-1"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                openDetails(true);
                            }}
                            title="Edit Task"
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground h-6 w-6"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDetails(true);
                                    }}
                                >
                                    <Edit2 className="h-4 w-4 mr-2" /> {t("edit_task")}
                                </DropdownMenuItem>
                                {columns && onMove && !dragHandleProps && (
                                    <>
                                        <DropdownMenuSeparator />
                                        {columns.map((col) => (
                                            <DropdownMenuItem
                                                key={col.id}
                                                onClick={() => onMove(task.id, col.id)}
                                            >
                                                {t("move_to")} {col.title}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await deleteTask(task.id);
                                            toast.success(t("task_deleted") || "Task deleted");
                                        } catch (error: any) {
                                            console.error("Failed to delete task", error);
                                            toast.error(t("failed_delete_task") || "Failed to delete task");
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> {t("delete_task")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <Checkbox
                        checked={task.completed}
                        onCheckedChange={handleToggleTask}
                        className={cn(
                            "mt-1 rounded-full border-2 h-5 w-5 transition-all data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",
                            priorityConfig[task.priority as keyof typeof priorityConfig]?.color.split(" ")[0].replace("text-", "border-") || "border-indigo-500"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex-1 min-w-0 pt-0.5 cursor-pointer" onClick={() => openDetails(false)}>
                        <div className="flex items-start justify-between gap-2">
                            <span className={cn(
                                "font-medium leading-snug break-words line-clamp-2",
                                compact ? "text-xs" : "text-sm",
                                task.completed && "line-through text-muted-foreground"
                            )}>
                                {task.title}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Interactive Subtasks List */}
                {
                    task.subtasks && task.subtasks.length > 0 && (
                        <div className="w-full mt-1 space-y-0.5 px-0.5 pl-8">
                            <div className="space-y-0">
                                {task.subtasks.map((subtask) => (
                                    <div
                                        key={subtask.id}
                                        className="flex items-center gap-2 group/subtask px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md -mx-1 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSubtask(subtask.id);
                                        }}
                                    >
                                        <div className={cn(
                                            "h-4 w-4 rounded-sm border flex items-center justify-center transition-all shrink-0",
                                            subtask.completed
                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover/subtask:border-indigo-400"
                                        )}>
                                            {subtask.completed && <Check className="h-3 w-3 stroke-[3]" />}
                                        </div>
                                        <span className={cn(
                                            "text-slate-600 dark:text-slate-300 line-clamp-1 flex-1 select-none leading-none",
                                            compact ? "text-[10px]" : "text-xs",
                                            subtask.completed && "line-through text-slate-400"
                                        )}>
                                            {subtask.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {/* Minimal Progress line */}
                            <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1 opacity-50">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500",
                                        progress === 100 ? "bg-emerald-500" : "bg-indigo-500/50"
                                    )}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
            </div>

            {/* Task Details Dialog */}
            < Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen} >
                <DialogContent
                    showCloseButton={false}
                    className="w-[95vw] md:w-[80vw] lg:!w-[95vw] !max-w-[1000px] h-[80vh] md:h-[80vh] overflow-hidden flex flex-col p-0 gap-0"
                >
                    <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-muted/50 to-transparent">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                                {isEditMode ? (
                                    <>
                                        <DialogTitle className="sr-only">
                                            Edit Task: {title}
                                        </DialogTitle>
                                        <Input
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="font-bold text-xl border-transparent px-0 h-auto focus-visible:ring-0 hover:bg-white/50 transition-colors bg-transparent placeholder:text-muted-foreground/80"
                                            placeholder="Task title"
                                            autoFocus
                                        />
                                    </>
                                ) : (
                                    <DialogTitle className="text-xl font-bold leading-tight py-1">
                                        {title}
                                    </DialogTitle>
                                )}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    In{" "}
                                    <Badge variant="secondary" className="rounded-sm font-normal">
                                        {columns?.find((c) => c.id === task.status)?.title ||
                                            t("backlog")}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditMode && (
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
                                    onClick={() => setIsDetailsOpen(false)}
                                    className="rounded-full hover:bg-black/5"
                                >
                                    <X className="h-5 w-5 opacity-70" />
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Responsive Content Layout */}
                    {(() => {
                        // We can't use hooks inside the render callback if we put this in a separate function
                        // so we'll use the check here. But wait, we need to bring useMediaQuery to the top component.
                        // Let's assume we pass isMobile from the parent component logic below.
                        return (
                            <TaskDetailsContent
                                task={task}
                                title={title}
                                description={description}
                                date={date}
                                priority={priority}
                                tag={tag}
                                goalId={goalId}
                                assigneeIds={assigneeIds}
                                groupIds={groupIds}
                                isEditMode={isEditMode}
                                columns={columns}
                                goals={goals}
                                members={members}
                                tags={tags}
                                role={role}
                                orgId={orgId}
                                t={t}
                                setDescription={setDescription}
                                updateTaskStatus={updateTaskStatus}
                                setDate={setDate}
                                setPriority={setPriority}
                                setTag={setTag}
                                setGoalId={setGoalId}
                                setAssigneeIds={setAssigneeIds}
                                setGroupIds={setGroupIds}
                                subtasksCompleted={subtasksCompleted}
                                subtasksTotal={subtasksTotal}
                                toggleSubtask={toggleSubtask}
                                deleteSubtask={deleteSubtask}
                                handleAddSubtask={handleAddSubtask}
                                newSubtask={newSubtask}
                                setNewSubtask={setNewSubtask}
                                comments={comments}
                                handleAddComment={handleAddComment}
                                newComment={newComment}
                                setNewComment={setNewComment}
                                onEditTag={onEditTag}
                                onDeleteTag={onDeleteTag}
                                onCreateTag={onCreateTag}
                                handleGenerateSubtasks={handleGenerateSubtasks}
                                isGenerating={isGenerating}
                            />
                        );
                    })()}

                    <DialogFooter className="px-6 py-4 border-t bg-muted/5 shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsDetailsOpen(false)}
                            className="rounded-full"
                        >
                            Close
                        </Button>
                        {isEditMode && (
                            <Button
                                onClick={handleSaveDetails}
                                className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
                            >
                                Save Changes
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </>
    );
}

// Extracted Content Component for cleaner logic and responsive handling
import { useMediaQuery } from "@/hooks/use-media-query";

function TaskDetailsContent({
    task, title, description, date, priority, tag, goalId, assigneeIds, groupIds, isEditMode,
    columns, goals, members, tags, role, orgId, t,
    setDescription, updateTaskStatus, setDate, setPriority, setTag, setGoalId, setAssigneeIds, setGroupIds,
    subtasksCompleted, subtasksTotal, toggleSubtask, deleteSubtask, handleAddSubtask, newSubtask, setNewSubtask,
    comments, handleAddComment, newComment, setNewComment,
    onEditTag, onDeleteTag, onCreateTag, handleGenerateSubtasks, isGenerating
}: any) {
    const isMobile = useMediaQuery("(max-width: 768px)");

    const MainContent = (
        <div className="space-y-8">
            {/* Metadata moved to Sidebar */}


            <div className="space-y-3 group/desc">
                <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    Description
                </Label>
                {isEditMode ? (
                    <Textarea
                        placeholder="Add a more detailed description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[120px] resize-none bg-Card/50"
                    />
                ) : (
                    <div
                        className={cn(
                            "min-h-[80px] text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap",
                            !description && "italic text-muted-foreground/50",
                        )}
                    >
                        {description || "No description provided."}
                    </div>
                )}
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
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
                        <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                            {subtasksCompleted}/{subtasksTotal}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    {(task.subtasks || []).length === 0 && !isEditMode && (
                        <p className="text-xs text-muted-foreground italic">
                            No subtasks.
                        </p>
                    )}

                    {(task.subtasks || []).map((st: any) => (
                        <div
                            key={st.id}
                            className="flex items-center gap-3 group/st p-2 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            <Checkbox
                                checked={st.completed}
                                onCheckedChange={() => toggleSubtask(st.id)}
                                className="rounded-full h-5 w-5"
                            />
                            <span
                                className={cn(
                                    "flex-1 text-sm block transition-all",
                                    st.completed &&
                                    "line-through text-muted-foreground",
                                )}
                            >
                                {st.title}
                            </span>
                            {isEditMode && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover/st:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                    onClick={() => deleteSubtask(st.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {isEditMode && (
                    <form
                        onSubmit={handleAddSubtask}
                        className="flex items-center gap-2 mt-4"
                    >
                        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/50 shrink-0">
                            <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                            placeholder="Add a step..."
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            className="border-none shadow-none focus-visible:ring-0 px-2 h-9 bg-transparent hover:bg-muted/30 transition-colors rounded-lg placeholder:text-muted-foreground/70"
                        />
                    </form>
                )}
            </div>
        </div>
    );

    const CommentInputSection = (
        <div className="p-3 border-t bg-background/80 backdrop-blur z-10">
            <form
                onSubmit={handleAddComment}
                className="flex gap-2 relative"
            >
                <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="h-10 text-xs pl-3 pr-10 rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all placeholder:text-muted-foreground/80"
                />
                <Button
                    type="submit"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 rounded-full shrink-0"
                    disabled={!newComment.trim()}
                >
                    <Send className="h-3.5 w-3.5" />
                </Button>
            </form>
        </div>
    );

    const CommentsListSection = (
        <div className="space-y-4">
            {comments.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-2 opacity-50">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                        No comments yet.
                    </span>
                </div>
            ) : (
                comments.map((comment: any) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        taskId={task.id}
                    />
                ))
            )}
        </div>
    );

    const MetadataSection = (
        <div className="space-y-6 pt-1">
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("status")}
                </Label>
                {isEditMode ? (
                    <Select
                        value={task.status || "backlog"}
                        onValueChange={(v) => updateTaskStatus(task.id, v)}
                    >
                        <SelectTrigger className="h-8 w-full text-xs bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {columns?.map((col: any) => (
                                <SelectItem key={col.id} value={col.id}>
                                    {col.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="flex items-center h-8 text-sm font-medium">
                        {columns?.find((c: any) => c.id === task.status)?.title ||
                            t("backlog")}
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("priority")}
                </Label>
                {isEditMode ? (
                    <Select
                        value={priority}
                        onValueChange={(v: any) => setPriority(v)}
                    >
                        <SelectTrigger className="h-8 w-full text-xs bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="flex items-center h-8">
                        <Badge
                            variant="outline"
                            className={cn(
                                "font-normal capitalize",
                                priorityConfig[priority as keyof typeof priorityConfig]?.color,
                            )}
                        >
                            {priority}
                        </Badge>
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("due_date")}
                </Label>
                {isEditMode ? (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 justify-start text-left font-normal w-full text-xs bg-background",
                                    !date && "text-muted-foreground",
                                )}
                            >
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {date ? format(date, "MMM d") : t("set_date")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                ) : (
                    <div className="flex items-center h-8 text-sm font-medium">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {date ? (
                            format(date, "MMM d, yyyy")
                        ) : (
                            <span className="text-muted-foreground text-xs italic">{t("no_due_date")}</span>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("tag")}
                </Label>
                {isEditMode ? (
                    <TagSelector
                        value={tag}
                        onChange={setTag}
                        tags={tags.length > 0 ? tags : defaultTags}
                        role={role}
                        onEditTag={onEditTag}
                        onDeleteTag={onDeleteTag}
                        onCreateTag={onCreateTag}
                    />
                ) : (
                    <div className="flex items-center h-8">
                        {(() => {
                            const availableTags =
                                tags.length > 0 ? tags : defaultTags;
                            const currentTag =
                                availableTags.find(
                                    (t: any) => t.id === (tag || "general"),
                                ) ||
                                availableTags.find(
                                    (t: any) =>
                                        t.label.toLowerCase() ===
                                        (tag || "general").toLowerCase(),
                                ) ||
                                availableTags[0];
                            return (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "font-normal capitalize",
                                        currentTag?.color,
                                    )}
                                >
                                    {currentTag?.label || tag || "General"}
                                </Badge>
                            );
                        })()}
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("linked_goal")}
                </Label>
                {isEditMode ? (
                    <Select
                        value={goalId || "none"}
                        onValueChange={(v) => setGoalId(v)}
                    >
                        <SelectTrigger className="h-8 w-full text-xs bg-background">
                            <div className="flex items-center gap-2 truncate">
                                <Target className="h-3 w-3 opacity-50" />
                                <span className="truncate">
                                    {goals.find((g: any) => g.id === goalId)?.title ||
                                        "None"}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {goals.map((g: any) => (
                                <SelectItem
                                    key={g.id}
                                    value={g.id}
                                    className="max-w-[200px] truncate"
                                >
                                    {g.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="flex items-center h-8 text-sm">
                        {goalId ? (
                            <Badge
                                variant="secondary"
                                className="font-normal truncate max-w-[200px]"
                            >
                                <Target className="h-3 w-3 mr-1.5 opacity-50" />
                                {goals.find((g: any) => g.id === goalId)?.title ||
                                    "Unknown Goal"}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground italic text-xs">
                                No goal linked
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Assignees
                </Label>
                {isEditMode ? (
                    orgId && (
                        <UserGroupSelect
                            orgId={orgId}
                            assigneeIds={assigneeIds}
                            groupIds={groupIds}
                            onAssigneeChange={setAssigneeIds}
                            onGroupChange={setGroupIds}
                            members={members}
                        />
                    )
                ) : (
                    <div className="flex items-center h-8 text-sm">
                        {(task.assigneeIds && task.assigneeIds.length > 0) ||
                            task.assigneeId ? (
                            <div className="flex -space-x-2">
                                {(task.assigneeIds?.length
                                    ? task.assigneeIds
                                    : task.assigneeId
                                        ? [task.assigneeId]
                                        : []
                                ).map((id: any) => {
                                    const m = members?.find((mem: any) => mem.id === id);
                                    if (!m) return null;
                                    return (
                                        <Avatar
                                            key={id}
                                            className="h-6 w-6 border-2 border-background ring-0"
                                            title={m.displayName}
                                        >
                                            <AvatarImage src={m.photoURL} />
                                            <AvatarFallback>
                                                {m.displayName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                    );
                                })}
                            </div>
                        ) : (
                            <span className="text-muted-foreground italic text-xs">
                                Unassigned
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const SidebarContent = (
        <div className={cn(
            "bg-muted/10 flex flex-col shrink-0 border-l h-full",
            isMobile ? "w-full border-t border-l-0 mt-6 h-auto" : "w-[380px]"
        )}>
            {/* Desktop Sidebar Layout */}
            {!isMobile ? (
                <>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-4 space-y-6">
                            {/* Properties Section */}
                            <div>
                                <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                                    Properties
                                </div>
                                {MetadataSection}
                            </div>

                            <Separator />

                            {/* Activity Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare className="h-3.5 w-3.5" /> Activity
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                        {comments.length}
                                    </Badge>
                                </div>
                                {CommentsListSection}
                            </div>
                        </div>
                    </div>
                    <div className="sticky bottom-0 bg-background/50 backdrop-blur border-t p-3">
                        {CommentInputSection}
                    </div>
                </>
            ) : (
                // Mobile Layout
                <div className="p-4 space-y-6">
                    <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                            Properties
                        </div>
                        {MetadataSection}
                    </div>
                </div>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <div className="flex flex-col flex-1 overflow-hidden bg-background/50">
                {/* Native scrolling for mobile for better touch experience */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {MainContent}

                    {/* Mobile Properties Section (SidebarContent handles mobile layout internally) */}
                    {SidebarContent}

                    {/* Mobile Comments Section */}
                    <div className="mt-8 pt-6 border-t">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 font-medium text-sm text-foreground/80">
                                <MessageSquare className="h-4 w-4" /> Activity
                            </div>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                {comments.length}
                            </Badge>
                        </div>
                        {CommentsListSection}
                    </div>
                </div>

                {/* Fixed Comment Input for Mobile */}
                {CommentInputSection}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-row">
            <ScrollArea className="flex-1 p-6 bg-background/50">
                {MainContent}
            </ScrollArea>
            {SidebarContent}
        </div>
    );
}
