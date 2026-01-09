"use client";

import { createPortal } from "react-dom";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

import { useEffect, useState } from "react";

import {
    subscribeToTasks,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    updateTaskStatus,
    updateTask,
    type Task,
    subscribeToTaskColumns,
    addTaskColumn,
    updateTaskColumn,
    deleteTaskColumn,
    batchUpdateColumnOrders,
    type TaskColumn,
    type SubTask,
    type Comment,
    addTaskComment,
    subscribeToTaskComments,
    deleteTaskComment,
    updateTaskComment,
    subscribeToGoals,
    type Goal,
    getOrganizationMembers,
    getUserOrganization,
    subscribeToOrganization,
    Organization,
    Tag,
    addTagToOrganization,
    updateTagInOrganization,
    deleteTagFromOrganization,
} from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Trash2,
    Plus,
    Calendar as CalendarIcon,
    LayoutList,
    Kanban,
    Grid2X2,
    Loader2,
    ArrowRight,
    GripVertical,
    Pencil,
    MoreHorizontal,
    MessageSquare,
    Send,
    CheckCircle2,
    Circle,
    MoreVertical,
    Edit2,
    X,
    Check,
    Target,
    User,
    Tag as TagIcon,
    Settings2,
    Palette,
    AlertCircle,
} from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { TasksMetrics } from "./tasks-metrics";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { format, isBefore, addDays, isToday, isSameWeek } from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    DragDropContext,
    Draggable,
    DropResult,
    Droppable,
} from "@hello-pangea/dnd";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { auth } from "@/lib/firebase/auth";
import { UserGroupSelect } from "@/components/dashboard/user-group-select";
import { TagSelector } from "@/components/dashboard/tag-selector";
import { AssigneeDisplay } from "@/components/dashboard/assignee-display";
import { subscribeToGroups, type Group } from "@/lib/firebase/firestore";
import { toast } from "sonner";
import { useLanguage } from "@/components/shared/language-context";
import { CreateTaskDialog } from "@/components/dashboard/create-task-dialog";

// Default tags if none exist
const defaultTags: Tag[] = [];

const presetColors = [
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

interface TaskCardProps {
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

function TaskCard({
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
    const { t } = useLanguage()
    const priorityStyle =
        priorityConfig[task.priority as keyof typeof priorityConfig] ||
        priorityConfig.medium;
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Viewer Check
    const isReadOnly = role === "viewer";

    // Edit State
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || "");
    const [date, setDate] = useState<Date | undefined>(
        task.dueDate && task.dueDate !== "" ? new Date(task.dueDate) : undefined, // Handle empty string
    );
    const [priority, setPriority] = useState<"low" | "medium" | "high">(
        task.priority || "medium",
    );
    const [tag, setTag] = useState(task.tag || "");
    const [goalId, setGoalId] = useState<string | null | undefined>(task.goalId);
    const [assigneeId, setAssigneeId] = useState<string | null | undefined>(
        task.assigneeId,
    );
    const [assigneeIds, setAssigneeIds] = useState<string[]>(
        task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []),
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
                setComments(data),
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
                dueDate: date ? date.toISOString() : null, // Send null to clear
                priority,
                tag,
                goalId: goalId === "none" || goalId === undefined ? null : goalId,
                assigneeId: assigneeIds.length > 0 ? assigneeIds[0] : null, // Backward compatible
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
                st.id === subtaskId ? { ...st, completed: !st.completed } : st,
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
                (st) => st.id !== subtaskId,
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
                    "group flex flex-col gap-1.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 transition-all duration-300",
                    "hover:shadow-md hover:scale-[1.01] hover:border-primary/20 dark:hover:border-primary/20",
                    isDragging ? "transition-none shadow-xl border-primary/50 z-50 scale-105" : "",
                    "border-l-[4px]",
                    priorityConfig[task.priority as keyof typeof priorityConfig]?.borderColor || "border-l-indigo-500",
                    task.completed &&
                    "opacity-75 bg-gray-50/50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-none hover:scale-100 border-l-gray-300 dark:border-l-slate-700 contrast-75 saturate-50",
                    dragHandleProps && "cursor-grab active:cursor-grabbing",
                )}
            >
                <div className="flex items-center justify-between mb-0.5 pl-0.5 min-h-[20px]">
                    <div className="flex items-center gap-2">
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
                                        "rounded-md border-0 px-1.5 py-0 font-medium capitalize h-5 text-[10px]",
                                        currentTag.color || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                                    )}
                                >
                                    <TagIcon className="h-2.5 w-2.5 mr-1 opacity-70" />
                                    {currentTag.label}
                                </Badge>
                            );
                        })()}

                        {/* Due Date */}
                        {task.dueDate && (
                            <span
                                className={cn(
                                    "px-1.5 py-0 rounded-full font-medium flex items-center gap-1 transition-colors h-5 text-[10px]",
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

                        {/* Assignees (Moved Here) */}
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

                    {/* Quick Actions (Moved Here) */}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTask(task.id);
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
                                "font-medium text-sm leading-snug break-words line-clamp-2",
                                task.completed && "line-through text-muted-foreground"
                            )}>
                                {task.title}
                            </span>
                        </div>
                    </div>
                </div >

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
                                            "text-xs text-slate-600 dark:text-slate-300 line-clamp-1 flex-1 select-none leading-none",
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
                    className="!w-[60vw] !max-w-[60vw] h-[80vh] overflow-hidden flex flex-col p-0 gap-0"
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

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Main Content: Description & Subtasks */}
                        <ScrollArea className="flex-1 p-6 h-[500px] md:h-auto bg-background/50">
                            <div className="space-y-8">
                                {/* Metadata Row */}
                                <div className="flex flex-wrap gap-6 p-4 bg-muted/20 rounded-xl border border-border/40">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {t("status")}
                                        </Label>
                                        {isEditMode ? (
                                            <Select
                                                value={task.status || "backlog"}
                                                onValueChange={(v) => updateTaskStatus(task.id, v)}
                                            >
                                                <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {columns?.map((col) => (
                                                        <SelectItem key={col.id} value={col.id}>
                                                            {col.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex items-center h-8 text-sm font-medium">
                                                {columns?.find((c) => c.id === task.status)?.title ||
                                                    t("backlog")}
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
                                                            "h-8 justify-start text-left font-normal w-[140px] text-xs bg-background",
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
                                                    <span className="text-foreground">{t("no_due_date")}</span>
                                                )}
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
                                                <SelectTrigger className="h-8 w-[100px] text-xs bg-background">
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
                                                        priorityConfig[priority]?.color,
                                                    )}
                                                >
                                                    {priority}
                                                </Badge>
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
                                                            (t) => t.id === (tag || "general"),
                                                        ) ||
                                                        availableTags.find(
                                                            (t) =>
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
                                                <SelectTrigger className="h-8 w-[160px] text-xs bg-background">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Target className="h-3 w-3 opacity-50" />
                                                        <span className="truncate">
                                                            {goals.find((g) => g.id === goalId)?.title ||
                                                                "None"}
                                                        </span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    {goals.map((g) => (
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
                                                        {goals.find((g) => g.id === goalId)?.title ||
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
                                                        {/* Handle legacy single assigneeId if assigneeIds is empty */}
                                                        {(task.assigneeIds?.length
                                                            ? task.assigneeIds
                                                            : task.assigneeId
                                                                ? [task.assigneeId]
                                                                : []
                                                        ).map((id) => {
                                                            const m = members?.find((mem) => mem.id === id);
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
                                        <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                                            {subtasksCompleted}/{subtasksTotal}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {(task.subtasks || []).length === 0 && !isEditMode && (
                                            <p className="text-xs text-muted-foreground italic">
                                                No subtasks.
                                            </p>
                                        )}

                                        {(task.subtasks || []).map((st) => (
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
                        </ScrollArea>

                        {/* Sidebar: Activity/Comments */}
                        <div className="w-full md:w-[400px] bg-muted/10 border-l flex flex-col h-[400px] md:h-auto">
                            <div className="p-4 border-b font-medium flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground bg-muted/5">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5" /> Activity
                                </div>
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                    {comments.length}
                                </Badge>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {comments.length === 0 ? (
                                        <div className="text-center py-12 flex flex-col items-center gap-2 opacity-50">
                                            <MessageSquare className="h-8 w-8 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                No comments yet.
                                            </span>
                                        </div>
                                    ) : (
                                        comments.map((comment) => (
                                            <CommentItem
                                                key={comment.id}
                                                comment={comment}
                                                taskId={task.id}
                                            />
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="p-3 border-t bg-background/80 backdrop-blur">
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
                        </div>
                    </div>

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

function CommentItem({
    comment,
    taskId,
}: {
    comment: Comment;
    taskId: string;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(comment.content);
    const currentUser = auth.currentUser;
    const isOwner = currentUser?.uid === comment.userId;

    const handleUpdate = async () => {
        if (!content.trim()) return;
        await updateTaskComment(taskId, comment.id, content);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        await deleteTaskComment(taskId, comment.id);
    };

    return (
        <div className="flex gap-3 text-sm group/comment">
            <Avatar className="h-8 w-8">
                <AvatarImage src={comment.userPhotoURL} />
                <AvatarFallback>{comment.userDisplayName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-xs">
                        {comment.userDisplayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {comment.createdAt
                            ? format(comment.createdAt.toDate(), "MMM d, h:mm a")
                            : "Just now"}
                    </span>
                </div>

                {isEditing ? (
                    <div className="space-y-2">
                        <Input
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={handleUpdate}
                                className="h-6 text-xs px-2"
                            >
                                Save
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsEditing(false)}
                                className="h-6 text-xs px-2"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="group relative">
                        <p className="text-muted-foreground leading-snug text-xs bg-muted/40 p-2 rounded-lg pr-8">
                            {comment.content}
                        </p>
                        {isOwner && (
                            <div className="absolute top-1 right-1 opacity-100 md:opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:bg-background/80"
                                        >
                                            <MoreVertical className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                            <Edit2 className="h-3 w-3 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={handleDelete}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-3 w-3 mr-2" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface TasksViewProps {
    compact?: boolean;
    className?: string;
}

export function TasksView({ compact = false, className }: TasksViewProps) {
    const { t } = useLanguage()
    const [tasks, setTasks] = useState<Task[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [columns, setColumns] = useState<TaskColumn[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskTag, setNewTaskTag] = useState("general");
    const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);
    const [newTaskPriority, setNewTaskPriority] = useState<
        "low" | "medium" | "high"
    >("medium");
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("list");
    const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month">("today");
    const [members, setMembers] = useState<any[]>([]);
    const [role, setRole] = useState<"owner" | "member" | "viewer">("member");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [orgId, setOrgId] = useState<string | undefined>(undefined);
    const [groups, setGroups] = useState<Group[]>([]);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

    // Tag Manager State
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState(presetColors[0].value);

    const orgTags = organization?.tags || [];
    const availableTags = orgTags.length > 0 ? orgTags : defaultTags;

    // Column Management state
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState("");

    // Column Resizing State
    const [resizingColId, setResizingColId] = useState<string | null>(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidth, setResizeStartWidth] = useState(0);
    const [resizeContainerWidth, setResizeContainerWidth] = useState(0); // New state for container width
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

    // Create Task Modal State
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [createTaskStatus, setCreateTaskStatus] = useState<string>("backlog");

    const handleCreateTaskFromModal = async (data: any) => {
        try {
            await addTask(
                data.title,
                data.tag || "general",
                data.dueDate ? data.dueDate.toISOString() : undefined,
                data.priority,
                data.assigneeId || undefined, // assigneeId
                [], // assigneeIds
                [], // groupIds
                createTaskStatus,
                data.goalId
            );
            toast.success(t("task_created") || "Task created");
            setIsCreateTaskOpen(false);
        } catch (error: any) {
            console.error("Failed to add task", error);
            toast.success("Failed to add task");
        }
    };

    // Initialize/Sync column widths from Firestore
    useEffect(() => {
        const widths: Record<string, number> = {};
        columns.forEach(col => {
            if (col.width) widths[col.id] = col.width;
        });
        setColumnWidths(prev => ({ ...prev, ...widths }));
    }, [columns]);

    // Handle Resize Events
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingColId) return;

            const diff = e.clientX - resizeStartX;

            // Calculate new width in pixels first
            let newWidthPx = resizeStartWidth;

            // If starting width was percentage (<=1), convert to px first
            if (resizeStartWidth <= 1) {
                newWidthPx = resizeStartWidth * resizeContainerWidth;
            }

            newWidthPx += diff;

            // Enforce min width of 250px
            if (newWidthPx < 250) newWidthPx = 250;

            // Convert to percentage
            const newWidthPercent = newWidthPx / resizeContainerWidth;

            setColumnWidths(prev => ({
                ...prev,
                [resizingColId]: newWidthPercent
            }));
        };

        const handleMouseUp = () => {
            if (resizingColId) {
                // Save to Firestore
                const finalWidth = columnWidths[resizingColId];
                if (finalWidth) {
                    updateTaskColumn(resizingColId, { width: finalWidth });
                }
                setResizingColId(null);
                setResizeContainerWidth(0);
                document.body.style.cursor = 'default';
            }
        };

        if (resizingColId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [resizingColId, resizeStartX, resizeStartWidth, resizeContainerWidth, columnWidths]);

    const startResize = (e: React.MouseEvent, col: TaskColumn) => {
        e.preventDefault();
        e.stopPropagation();

        // Find the board container to get total width
        const boardContainer = e.currentTarget.closest('.board-container');
        if (!boardContainer) return;

        const containerWidth = boardContainer.getBoundingClientRect().width;

        setResizingColId(col.id);
        setResizeStartX(e.clientX);
        setResizeContainerWidth(containerWidth);
        const currentWidth = columnWidths[col.id] || col.width || 300;
        setResizeStartWidth(currentWidth);
    };

    useEffect(() => {
        const loadMembers = async () => {
            const user = auth.currentUser;
            setCurrentUser(user);
            if (user) {
                const org = await getUserOrganization(user.uid);
                if (org) {
                    setOrgId(org.id);
                    const orgMembers = await getOrganizationMembers(org.id);
                    setMembers(orgMembers);

                    // Determine current user's role
                    const myMemberInfo = orgMembers.find((m: any) => m.id === user.uid);
                    if (myMemberInfo) {
                        setRole(myMemberInfo.role || "member");
                    } else if (org.ownerId === user.uid) {
                        setRole("owner");
                    }
                }
            }
        };

        loadMembers();

        const unsubscribeTasks = subscribeToTasks((data) => setTasks(data));
        const unsubscribeGoals = subscribeToGoals((data) => setGoals(data));
        const unsubscribeColumns = subscribeToTaskColumns((data) => {
            setColumns(data);
        });
        const unsubscribeGroups = subscribeToGroups((data) => {
            setGroups(data);
        });

        let unsubscribeOrg: () => void = () => { };
        if (orgId) {
            unsubscribeOrg = subscribeToOrganization(orgId, (data) => {
                setOrganization(data);
            });
        }

        setLoading(false);
        return () => {
            unsubscribeTasks();
            unsubscribeGoals();
            unsubscribeColumns();
            unsubscribeGroups();
            unsubscribeOrg();
        };
    }, [orgId]); // Added orgId dependency to re-subscribe if it changes

    // Filter tasks based on Role and Visibility
    const filteredTasks = tasks.filter((task) => {
        if (role === "owner") return true; // Owner sees all

        // If no current user loaded yet, default to hidden or wait
        if (!currentUser) return false;

        const isCreator = task.userId === currentUser.uid;
        // Check both single assignee (legacy) and multi-assignee array
        const isAssigned =
            (task.assigneeIds && task.assigneeIds.includes(currentUser.uid)) ||
            task.assigneeId === currentUser.uid;

        // Check group assignments (Need to fetch user's groups or check if user is in task.groupIds if we have that logic locally)
        // Ideally we fetch user's groups. For now, we assumed we don't have user's groups in memory easily without fetching.
        // But we can check if any of task.groupIds are in the groups the user belongs to.
        // Since we don't have user's groups loaded here efficiently yet, we might skip or do a simple check if we had list of all groups.
        // For now, let's assume we need to implement group visibility logic properly.
        // We need to fetch groups for the user or all groups and check membership?
        // Let's implement full fetching of groups in TasksView or store user's groupIds in user profile/session?

        // For this iteration, let's keep it simple: visible if creator or directly assigned.
        // Full group visibility logic might require fetching user's groups.
        // We will add `task.groupIds` check later when we implement group fetching in TasksView.
        return isCreator || isAssigned;
    });

    // Effect for Auto-Migration of Tasks based on Date
    useEffect(() => {
        if (tasks.length === 0 || columns.length === 0) return;

        const todayCol = columns.find((c) => c.title === "Today");
        const thisWeekCol = columns.find((c) => c.title === "This Week");
        const doneCol = columns.find((c) => c.title === "Done");
        const backlogCol = columns.find((c) => c.title === "Backlog");

        if (!todayCol && !thisWeekCol && !doneCol) return;

        tasks.forEach((task) => {
            // Migration should probably run on all tasks, or maybe just filtered? Should be careful.
            // If user can't see task, they probably shouldn't migrate it, but migration is system logic.
            // Let's leave migration on 'tasks' for now as it's often an owner/system action,
            // BUT if 'member' triggers it, it might update tasks they don't own?
            // Actually, `updateTaskStatus` checks permission? Not really, Firestore rules usually handle it.
            // For now, leave as is.

            // Rule 0: Completed tasks -> Move to Done
            if (task.completed && doneCol && task.status !== doneCol.id) {
                updateTaskStatus(task.id, doneCol.id);
                return;
            }
            // ... (rest of migration logic)

            if (task.completed) return;

            // Don't auto-migrate tasks in Backlog - they are intentionally unscheduled
            if (backlogCol && task.status === backlogCol.id) return;

            if (!task.dueDate) return;

            const date = new Date(task.dueDate);

            // Rule 1: Task is due Today -> Move to Today Column
            if (isToday(date) && todayCol && task.status !== todayCol.id) {
                updateTaskStatus(task.id, todayCol.id);
            }
            // Rule 2: Task is due This Week (and NOT Today) -> Move to This Week Column
            else if (
                isSameWeek(date, new Date(), { weekStartsOn: 1 }) &&
                !isToday(date) &&
                thisWeekCol &&
                task.status !== thisWeekCol.id &&
                task.status !== todayCol?.id
            ) {
                updateTaskStatus(task.id, thisWeekCol.id);
            }
        });
    }, [tasks, columns]);

    const handleCreateDefaultColumns = async () => {
        setLoading(true);
        await addTaskColumn("Backlog", 0);
        await addTaskColumn("This Week", 1);
        await addTaskColumn("Today", 2);
        await addTaskColumn("Done", 3);
        setLoading(false);
    };

    const [newTaskStatus, setNewTaskStatus] = useState<string>("backlog");

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            await addTask(
                newTaskTitle,
                newTaskTag,
                newTaskDate ? newTaskDate.toISOString() : undefined,
                newTaskPriority,
                undefined,
                undefined,
                undefined,
                newTaskStatus
            );
            setNewTaskTitle("");
            setNewTaskDate(undefined);
            setNewTaskPriority("medium");
            setNewTaskTag("general");
            setNewTaskStatus("backlog"); // Reset to backlog after adding (or keep it?) - let's reset for now
        } catch (error: any) {
            console.error("Failed to add task", error);
            toast.error(`Failed to add task: ${error.message} `);
        }
    };

    const handleAddColumn = async () => {
        if (!newColumnTitle.trim()) return;
        await addTaskColumn(newColumnTitle, columns.length);
        setNewColumnTitle("");
        setIsAddingColumn(false);
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Reordering Columns
        if (type === "MATRIX_TASK") {
            // Matrix logic already handled by destination.droppableId.startsWith("matrix-")
            // falling through is fine if we keep the checks below.
        }

        if (type === "COLUMN") {
            const newColumns = Array.from(columns);
            const [reorderedItem] = newColumns.splice(source.index, 1);
            newColumns.splice(destination.index, 0, reorderedItem);

            // Optimistic update
            setColumns(newColumns.map((c, i) => ({ ...c, order: i })));

            // Async persist
            await batchUpdateColumnOrders(
                newColumns.map((c, i) => ({ id: c.id, order: i })),
            );
            return;
        }

        // Handle Matrix Drops
        if (destination.droppableId.startsWith("matrix-")) {
            const quadrant = destination.droppableId;
            let updates: Partial<Task> = {};
            const tomorrow = addDays(new Date(), 1);
            const nextWeek = addDays(new Date(), 7);

            switch (quadrant) {
                case "matrix-q1": // Do First
                    updates = { priority: "high", dueDate: tomorrow.toISOString() };
                    break;
                case "matrix-q2": // Schedule
                    updates = { priority: "high", dueDate: nextWeek.toISOString() };
                    break;
                case "matrix-q3": // Delegate
                    updates = { priority: "medium", dueDate: tomorrow.toISOString() };
                    break;
                case "matrix-q4": // Eliminate
                    updates = { priority: "low", dueDate: nextWeek.toISOString() };
                    break;
            }

            await updateTask(draggableId, updates);
            return;
        }

        // Moving Tasks between Columns (Board View)
        const startColumnId = source.droppableId;
        const finishColumnId = destination.droppableId;

        if (startColumnId !== finishColumnId) {
            // Find the destination column
            const destColumn = columns.find(c => c.id === finishColumnId);
            const sourceColumn = columns.find(c => c.id === startColumnId);

            // Check if moving to or from "Done" column
            const movingToDone = destColumn?.title === "Done";
            const movingFromDone = sourceColumn?.title === "Done";
            const movingToBacklog = destColumn?.title === "Backlog";

            // Update task status
            await updateTaskStatus(draggableId, finishColumnId);

            // Auto-complete/uncomplete based on Done column
            if (movingToDone) {
                // Mark as completed when moving to Done
                await toggleTaskCompletion(draggableId, false); // false = current state is not completed, so toggle to completed
            } else if (movingFromDone) {
                // Mark as uncompleted when moving out of Done
                await toggleTaskCompletion(draggableId, true); // true = current state is completed, so toggle to uncompleted
            }

            // Clear dueDate when moving to Backlog
            if (movingToBacklog) {
                await updateTask(draggableId, { dueDate: null });
            }
        }
    };

    // Helper for Matrix View
    const getTasksForMatrix = (urgent: boolean, important: boolean) => {
        const urgerntThreshold = addDays(new Date(), 2);
        return filteredTasks.filter((t) => {
            if (t.completed) return false;
            const isImportant = t.priority === "high";
            const date = t.dueDate && t.dueDate !== "" ? new Date(t.dueDate) : null;
            const isUrgent = date ? isBefore(date, urgerntThreshold) : false; // Due within 2 days = Urgent

            return isImportant === important && isUrgent === urgent;
        });
    };

    // Helper to group tasks by column with sorting
    const getTasksByColumn = (columnId: string, columnTitle: string) => {
        const tasksInColumn = filteredTasks.filter((t) => {
            // Use filteredTasks declared above
            // If task status matches column ID
            if (t.status === columnId) return true;
            // Backward compatibility/Default: if task has "backlog" and this is "Backlog" column
            if ((!t.status || t.status === "backlog") && columnTitle === "Backlog")
                return true;
            return false;
        });

        // Current sorting rule:
        // 1. Uncompleted first
        // 2. Nearest Due Date first
        return tasksInColumn.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    };

    // Sorting Helper for List View
    const sortedTasksForList = filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className={cn("space-y-6 p-6 bg-slate-50/30 dark:bg-slate-950/30 rounded-2xl", className)}>
                {/* Tasks Metrics Dashboard */}
                {!compact && (
                    <TasksMetrics
                        tasks={tasks}
                        goals={goals}
                    />
                )}

                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        {/* Title removed as per user request */}
                    </div>

                    <Tabs
                        value={view}
                        onValueChange={setView}
                        className="w-full md:w-auto"
                    >
                        <TabsList className="grid w-full md:w-auto grid-cols-3 gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
                            <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all duration-200">
                                <LayoutList className="h-4 w-4 mr-2" /> {t("list_view")}
                            </TabsTrigger>
                            <TabsTrigger value="board" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all duration-200">
                                <Kanban className="h-4 w-4 mr-2" /> {t("board_view")}
                            </TabsTrigger>
                            <TabsTrigger value="matrix" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all duration-200">
                                <Grid2X2 className="h-4 w-4 mr-2" /> {t("matrix_view")}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>



                {/* Add Task Bar */}
                <div className="bg-white dark:bg-slate-900 border border-border/40 dark:border-slate-800 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/10 transition-all rounded-2xl p-2 md:p-3 relative z-10">
                    <form
                        onSubmit={handleAddTask}
                        className="flex flex-col md:flex-row gap-2 items-center"
                    >
                        <div className="flex-1 w-full">
                            <Input
                                id="main-task-input"
                                placeholder={
                                    newTaskStatus === "backlog"
                                        ? t("add_task_placeholder")
                                        : columns.find(c => c.id === newTaskStatus)?.title
                                            ? `${t("add_task")} to ${columns.find(c => c.id === newTaskStatus)?.title}...`
                                            : t("add_task_placeholder")
                                }
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="h-12 border-transparent bg-transparent text-lg focus-visible:ring-0 px-4 placeholder:text-muted-foreground/60 dark:text-slate-100 shadow-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto px-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        size="sm"
                                        className={cn(
                                            "h-9 w-[130px] justify-start text-left font-normal border-blue-200/50 bg-blue-50/50 hover:bg-blue-100/50 hover:border-blue-300/50 transition-colors dark:bg-blue-900/20 dark:border-blue-800/50 dark:hover:bg-blue-900/30",
                                            !newTaskDate && "text-muted-foreground",
                                            newTaskDate && "text-blue-700 border-blue-300/70 bg-blue-100/70 dark:text-blue-400 dark:bg-blue-900/40"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                        {newTaskDate ? (
                                            format(newTaskDate, "MMM d")
                                        ) : (
                                            <span>{t("no_date")}</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={newTaskDate}
                                        onSelect={setNewTaskDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <Select
                                value={newTaskPriority}
                                onValueChange={(v: any) => setNewTaskPriority(v)}
                            >
                                <SelectTrigger className={cn(
                                    "h-9 w-[100px] border transition-colors",
                                    newTaskPriority === "low" && "border-slate-200/50 bg-slate-50/50 hover:bg-slate-100/50 text-slate-700",
                                    newTaskPriority === "medium" && "border-amber-200/50 bg-amber-50/50 hover:bg-amber-100/50 text-amber-700",
                                    newTaskPriority === "high" && "border-rose-200/50 bg-rose-50/50 hover:bg-rose-100/50 text-rose-700"
                                )}>
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2">
                                <TagSelector
                                    value={newTaskTag}
                                    onChange={setNewTaskTag}
                                    tags={availableTags}
                                    role={role}
                                    onEditTag={(tag) => {
                                        setEditingTag(tag);
                                        setNewTagName(tag.label);
                                        setNewTagColor(tag.color || presetColors[0].value);
                                        setIsTagManagerOpen(true);
                                    }}
                                    onDeleteTag={(tagId) => {
                                        if (orgId) deleteTagFromOrganization(orgId, tagId);
                                    }}
                                    onCreateTag={() => {
                                        setEditingTag(null);
                                        setNewTagName("");
                                        setNewTagColor(presetColors[0].value);
                                        setIsTagManagerOpen(true);
                                    }}
                                />

                                <Dialog
                                    open={isTagManagerOpen}
                                    onOpenChange={setIsTagManagerOpen}
                                >
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
                                                    {orgTags.length === 0 ? (
                                                        <p className="text-sm text-center text-muted-foreground py-8">
                                                            No custom tags yet.
                                                        </p>
                                                    ) : (
                                                        orgTags.map((tag) => (
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
                            </div>

                            <Button
                                type="submit"
                                size="icon"
                                className="h-9 w-9 bg-primary text-primary-foreground shrink-0 rounded-lg shadow-md hover:shadow-lg transition-all ml-1"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Views Content */}
                {loading ? (
                    <div
                        className={cn(
                            "container mx-auto max-w-7xl pt-6 space-y-4",
                            className,
                        )}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <Skeleton className="h-8 w-48" />
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-24" />
                                <Skeleton className="h-9 w-24" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-xl" />
                            ))}
                        </div>
                    </div>
                ) : tasks.length === 0 && columns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-primary/20 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="text-6xl mb-4">🎯</div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Chào mừng đến với Tasks!</h3>
                        <p className="text-muted-foreground max-w-sm text-center mb-4">
                            Hãy bắt đầu hành trình quản lý công việc hiệu quả của bạn
                        </p>
                        <Button
                            size="sm"
                            className="shadow-md"
                            onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="What needs to be done?"]')?.focus()}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Tạo task đầu tiên
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* List View */}
                        {view === "list" && (
                            <div className="space-y-3">
                                {sortedTasksForList.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        columns={columns}
                                        onMove={updateTaskStatus}
                                        members={members}
                                        groups={groups}
                                        role={role}
                                        orgId={orgId}
                                        tags={availableTags}
                                        onEditTag={(tag) => {
                                            setEditingTag(tag);
                                            setNewTagName(tag.label);
                                            setNewTagColor(tag.color || presetColors[0].value);
                                            setIsTagManagerOpen(true);
                                        }}
                                        onDeleteTag={(tagId) => {
                                            if (orgId) deleteTagFromOrganization(orgId, tagId);
                                        }}
                                        onCreateTag={() => {
                                            setEditingTag(null);
                                            setNewTagName("");
                                            setNewTagColor(presetColors[0].value);
                                            setIsTagManagerOpen(true);
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Board View */}
                        {view === "board" && (
                            <div className="min-h-[500px] overflow-x-auto">
                                {columns.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center w-full py-10 border-2 border-dashed rounded-xl">
                                        <p className="mb-4 text-muted-foreground">
                                            No columns configured.
                                        </p>
                                        <Button onClick={handleCreateDefaultColumns}>
                                            Create Default Columns
                                        </Button>
                                    </div>
                                ) : (
                                    <Droppable
                                        droppableId="board"
                                        direction="horizontal"
                                        type="COLUMN"
                                    >
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className="flex gap-6 pb-6 items-start h-full board-container"
                                            >
                                                {columns.map((col, index) => (
                                                    <Draggable
                                                        key={col.id}
                                                        draggableId={col.id}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className="flex flex-col gap-2 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-md border border-slate-100 dark:border-slate-800 h-full max-h-[calc(100vh-220px)] border-t-[6px] relative"
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    width: (columnWidths[col.id] || col.width || 0) <= 1
                                                                        ? `${(columnWidths[col.id] || col.width || 0) * 100}%`
                                                                        : (columnWidths[col.id] || col.width || 300),
                                                                    minWidth: 250,
                                                                    flexShrink: 0,
                                                                    borderColor: col.title === "Backlog" ? "#9ca3af" :
                                                                        col.title === "This Week" ? "#3b82f6" :
                                                                            col.title === "Today" ? "#f97316" :
                                                                                col.title === "Done" ? "#a855f7" : "#10b981"
                                                                }}
                                                            >
                                                                <div
                                                                    {...provided.dragHandleProps}
                                                                    className="flex items-center justify-between px-2 cursor-grab active:cursor-grabbing group mb-2"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-bold text-base text-foreground">
                                                                            {col.title}
                                                                        </h3>
                                                                        <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                                                                            {
                                                                                getTasksByColumn(col.id, col.title)
                                                                                    .length
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-secondary"
                                                                            >
                                                                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent>
                                                                            <DropdownMenuItem
                                                                                className="text-destructive"
                                                                                onClick={() =>
                                                                                    deleteTaskColumn(col.id)
                                                                                }
                                                                            >
                                                                                Delete Column
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>

                                                                {/* Resize Handle */}
                                                                <div
                                                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
                                                                    onMouseDown={(e) => startResize(e, col)}
                                                                />

                                                                <Droppable droppableId={col.id} type="TASK">
                                                                    {(provided, snapshot) => {
                                                                        const columnTasks = getTasksByColumn(col.id, col.title);
                                                                        return (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.droppableProps}
                                                                                className={cn(
                                                                                    "flex-1 overflow-y-auto min-h-[150px] space-y-3 px-1 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-muted/20 hover:scrollbar-thumb-muted/50 flex flex-col",
                                                                                    snapshot.isDraggingOver && "bg-secondary/20 rounded-xl ring-2 ring-primary/10",
                                                                                    columnTasks.length === 0 && "justify-center"
                                                                                )}
                                                                            >
                                                                                {columnTasks.length === 0 && !snapshot.isDraggingOver ? (
                                                                                    <div className="text-center py-10 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl mx-2">
                                                                                        <p className="text-sm text-muted-foreground font-medium">No tasks</p>
                                                                                    </div>
                                                                                ) : (
                                                                                    columnTasks.map((task, index) => (
                                                                                        <Draggable
                                                                                            key={task.id}
                                                                                            draggableId={task.id}
                                                                                            index={index}
                                                                                        >
                                                                                            {(provided, snapshot) => {
                                                                                                const child = (
                                                                                                    <div
                                                                                                        ref={provided.innerRef}
                                                                                                        {...provided.draggableProps}
                                                                                                        {...provided.dragHandleProps}
                                                                                                        style={{
                                                                                                            ...provided.draggableProps.style,
                                                                                                        }}
                                                                                                    >
                                                                                                        <TaskCard
                                                                                                            task={task}
                                                                                                            columns={columns}
                                                                                                            onMove={updateTaskStatus}
                                                                                                            members={members}
                                                                                                            groups={groups}
                                                                                                            role={role}
                                                                                                            orgId={orgId}
                                                                                                            tags={availableTags}
                                                                                                            onEditTag={(tag) => {
                                                                                                                setEditingTag(tag);
                                                                                                                setNewTagName(tag.label);
                                                                                                                setNewTagColor(tag.color || presetColors[0].value);
                                                                                                                setIsTagManagerOpen(true);
                                                                                                            }}
                                                                                                            onDeleteTag={(tagId) => {
                                                                                                                if (orgId) deleteTagFromOrganization(orgId, tagId);
                                                                                                            }}
                                                                                                            onCreateTag={() => {
                                                                                                                setEditingTag(null);
                                                                                                                setNewTagName("");
                                                                                                                setNewTagColor(presetColors[0].value);
                                                                                                                setIsTagManagerOpen(true);
                                                                                                            }}
                                                                                                            compact={true}
                                                                                                        />
                                                                                                    </div>
                                                                                                );
                                                                                                return child;
                                                                                            }}
                                                                                        </Draggable>
                                                                                    ))
                                                                                )}
                                                                                {provided.placeholder}
                                                                            </div>
                                                                        );
                                                                    }}
                                                                </Droppable>

                                                                <div className="mt-2 pt-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="w-full justify-center text-muted-foreground hover:text-primary hover:bg-secondary/50 h-9"
                                                                        onClick={() => {
                                                                            setCreateTaskStatus(col.id);
                                                                            setIsCreateTaskOpen(true);
                                                                        }}
                                                                    >
                                                                        <Plus className="h-4 w-4 mr-2" />
                                                                        Add Task
                                                                    </Button>
                                                                </div>


                                                                {/* Add Task Button - Stick to Bottom */}

                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))
                                                }
                                                {provided.placeholder}

                                                {/* Add Column Button (Icon Only) */}
                                                <div className="min-w-[50px] pt-1">
                                                    {isAddingColumn ? (
                                                        <div className="bg-background border rounded-lg p-2 space-y-2 shadow-sm w-[200px]">
                                                            <Input
                                                                autoFocus
                                                                placeholder="Column Title"
                                                                value={newColumnTitle}
                                                                onChange={(e) =>
                                                                    setNewColumnTitle(e.target.value)
                                                                }
                                                                className="h-8 text-sm"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6"
                                                                    onClick={() => setIsAddingColumn(false)}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-primary"
                                                                    onClick={handleAddColumn}
                                                                >
                                                                    <ArrowRight className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            className="h-[50px] w-[50px] rounded-xl border-2 border-dashed border-muted hover:border-primary/50 hover:bg-secondary/50 text-muted-foreground"
                                                            onClick={() => setIsAddingColumn(true)}
                                                        >
                                                            <Plus className="h-6 w-6" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>
                                )
                                }
                            </div >
                        )}

                        {/* Matrix View */}
                        {
                            view === "matrix" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto min-h-[600px]">
                                    {/* Q1: Do First (Urgent & Important) */}
                                    <Droppable droppableId="matrix-q1" type="MATRIX_TASK">
                                        {(provided, snapshot) => (
                                            <div
                                                className={cn(
                                                    "bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4",
                                                    snapshot.isDraggingOver &&
                                                    "bg-rose-100/50 ring-2 ring-rose-500/20",
                                                )}
                                            >
                                                <h3 className="text-rose-700 dark:text-rose-400 font-bold mb-4 flex items-center gap-2">
                                                    <span className="bg-rose-100 dark:bg-rose-900/50 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                                        1
                                                    </span>
                                                    Do First{" "}
                                                    <span className="text-xs font-normal opacity-70">
                                                        (Urgent & Important)
                                                    </span>
                                                </h3>
                                                <div
                                                    className="space-y-2 min-h-[100px]"
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {getTasksForMatrix(true, true).map((task, index) => (
                                                        <Draggable
                                                            key={task.id}
                                                            draggableId={task.id}
                                                            index={index}
                                                        >
                                                            {(provided, snapshot) => {
                                                                const child = (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        style={provided.draggableProps.style}
                                                                    >
                                                                        <TaskCard
                                                                            task={task}
                                                                            compact
                                                                            dragHandleProps={
                                                                                role !== "viewer"
                                                                                    ? provided.dragHandleProps
                                                                                    : undefined
                                                                            }
                                                                            members={members}
                                                                            groups={groups}
                                                                            role={role}
                                                                            orgId={orgId}
                                                                            tags={availableTags}
                                                                            onEditTag={(tag) => {
                                                                                setEditingTag(tag);
                                                                                setNewTagName(tag.label);
                                                                                setNewTagColor(
                                                                                    tag.color || presetColors[0].value,
                                                                                );
                                                                                setIsTagManagerOpen(true);
                                                                            }}
                                                                            onDeleteTag={(tagId) => {
                                                                                if (orgId)
                                                                                    deleteTagFromOrganization(orgId, tagId);
                                                                            }}
                                                                            onCreateTag={() => {
                                                                                setEditingTag(null);
                                                                                setNewTagName("");
                                                                                setNewTagColor(presetColors[0].value);
                                                                                setIsTagManagerOpen(true);
                                                                            }}
                                                                            isDragging={snapshot.isDragging}
                                                                        />
                                                                    </div>
                                                                );
                                                                return child;
                                                            }}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>

                                    {/* Q2: Schedule (Not Urgent & Important) */}
                                    <Droppable droppableId="matrix-q2" type="MATRIX_TASK">
                                        {(provided, snapshot) => (
                                            <div
                                                className={cn(
                                                    "bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4",
                                                    snapshot.isDraggingOver &&
                                                    "bg-blue-100/50 ring-2 ring-blue-500/20",
                                                )}
                                            >
                                                <h3 className="text-blue-700 dark:text-blue-400 font-bold mb-4 flex items-center gap-2">
                                                    <span className="bg-blue-100 dark:bg-blue-900/50 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                                        2
                                                    </span>
                                                    Schedule{" "}
                                                    <span className="text-xs font-normal opacity-70">
                                                        (Not Urgent & Important)
                                                    </span>
                                                </h3>
                                                <div
                                                    className="space-y-2 min-h-[100px]"
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {getTasksForMatrix(false, true).map((task, index) => (
                                                        <Draggable
                                                            key={task.id}
                                                            draggableId={task.id}
                                                            index={index}
                                                        >
                                                            {(provided, snapshot) => {
                                                                const child = (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        style={provided.draggableProps.style}
                                                                    >
                                                                        <TaskCard
                                                                            task={task}
                                                                            compact
                                                                            dragHandleProps={
                                                                                role !== "viewer"
                                                                                    ? provided.dragHandleProps
                                                                                    : undefined
                                                                            }
                                                                            members={members}
                                                                            groups={groups}
                                                                            role={role}
                                                                            orgId={orgId}
                                                                            tags={availableTags}
                                                                            onEditTag={(tag) => {
                                                                                setEditingTag(tag);
                                                                                setNewTagName(tag.label);
                                                                                setNewTagColor(
                                                                                    tag.color || presetColors[0].value,
                                                                                );
                                                                                setIsTagManagerOpen(true);
                                                                            }}
                                                                            onDeleteTag={(tagId) => {
                                                                                if (orgId)
                                                                                    deleteTagFromOrganization(orgId, tagId);
                                                                            }}
                                                                            onCreateTag={() => {
                                                                                setEditingTag(null);
                                                                                setNewTagName("");
                                                                                setNewTagColor(presetColors[0].value);
                                                                                setIsTagManagerOpen(true);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                );
                                                                return child;
                                                            }}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>

                                    {/* Q3: Delegate (Urgent & Not Important) */}
                                    <Droppable droppableId="matrix-q3" type="MATRIX_TASK">
                                        {(provided, snapshot) => (
                                            <div
                                                className={cn(
                                                    "bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-4",
                                                    snapshot.isDraggingOver &&
                                                    "bg-amber-100/50 ring-2 ring-amber-500/20",
                                                )}
                                            >
                                                <h3 className="text-amber-700 dark:text-amber-400 font-bold mb-4 flex items-center gap-2">
                                                    <span className="bg-amber-100 dark:bg-amber-900/50 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                                        3
                                                    </span>
                                                    Delegate{" "}
                                                    <span className="text-xs font-normal opacity-70">
                                                        (Urgent & Not Important)
                                                    </span>
                                                </h3>
                                                <div
                                                    className="space-y-2 min-h-[100px]"
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {getTasksForMatrix(true, false).map((task, index) => (
                                                        <Draggable
                                                            key={task.id}
                                                            draggableId={task.id}
                                                            index={index}
                                                        >
                                                            {(provided, snapshot) => {
                                                                const child = (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        style={provided.draggableProps.style}
                                                                    >
                                                                        <TaskCard
                                                                            task={task}
                                                                            compact
                                                                            dragHandleProps={
                                                                                role !== "viewer"
                                                                                    ? provided.dragHandleProps
                                                                                    : undefined
                                                                            }
                                                                            members={members}
                                                                            groups={groups}
                                                                            role={role}
                                                                            orgId={orgId}
                                                                            tags={availableTags}
                                                                            onEditTag={(tag) => {
                                                                                setEditingTag(tag);
                                                                                setNewTagName(tag.label);
                                                                                setNewTagColor(
                                                                                    tag.color || presetColors[0].value,
                                                                                );
                                                                                setIsTagManagerOpen(true);
                                                                            }}
                                                                            onDeleteTag={(tagId) => {
                                                                                if (orgId)
                                                                                    deleteTagFromOrganization(orgId, tagId);
                                                                            }}
                                                                            onCreateTag={() => {
                                                                                setEditingTag(null);
                                                                                setNewTagName("");
                                                                                setNewTagColor(presetColors[0].value);
                                                                                setIsTagManagerOpen(true);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                );
                                                                return child;
                                                            }}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>

                                    {/* Q4: Eliminate (Not Urgent & Not Important) */}
                                    <Droppable droppableId="matrix-q4" type="MATRIX_TASK">
                                        {(provided, snapshot) => (
                                            <div
                                                className={cn(
                                                    "bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-4",
                                                    snapshot.isDraggingOver &&
                                                    "bg-slate-100/50 ring-2 ring-slate-500/20",
                                                )}
                                            >
                                                <h3 className="text-slate-700 dark:text-slate-400 font-bold mb-4 flex items-center gap-2">
                                                    <span className="bg-slate-100 dark:bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                                        4
                                                    </span>
                                                    Eliminate{" "}
                                                    <span className="text-xs font-normal opacity-70">
                                                        (Not Urgent & Not Important)
                                                    </span>
                                                </h3>
                                                <div
                                                    className="space-y-2 min-h-[100px]"
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {getTasksForMatrix(false, false).map((task, index) => (
                                                        <Draggable
                                                            key={task.id}
                                                            draggableId={task.id}
                                                            index={index}
                                                        >
                                                            {(provided, snapshot) => {
                                                                const child = (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        style={provided.draggableProps.style}
                                                                    >
                                                                        <TaskCard
                                                                            task={task}
                                                                            compact
                                                                            dragHandleProps={
                                                                                role !== "viewer"
                                                                                    ? provided.dragHandleProps
                                                                                    : undefined
                                                                            }
                                                                            members={members}
                                                                            groups={groups}
                                                                            role={role}
                                                                            orgId={orgId}
                                                                            tags={availableTags}
                                                                            onEditTag={(tag) => {
                                                                                setEditingTag(tag);
                                                                                setNewTagName(tag.label);
                                                                                setNewTagColor(
                                                                                    tag.color || presetColors[0].value,
                                                                                );
                                                                                setIsTagManagerOpen(true);
                                                                            }}
                                                                            onDeleteTag={(tagId) => {
                                                                                if (orgId)
                                                                                    deleteTagFromOrganization(orgId, tagId);
                                                                            }}
                                                                            onCreateTag={() => {
                                                                                setEditingTag(null);
                                                                                setNewTagName("");
                                                                                setNewTagColor(presetColors[0].value);
                                                                                setIsTagManagerOpen(true);
                                                                            }}
                                                                            isDragging={snapshot.isDragging}
                                                                        />
                                                                    </div>
                                                                );
                                                                return child;
                                                            }}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            )
                        }
                    </>
                )
                }
            </div >
            {/* Create Task Dialog */}
            <CreateTaskDialog
                open={isCreateTaskOpen}
                onOpenChange={setIsCreateTaskOpen}
                initialStatus={createTaskStatus}
                statusLabel={columns.find(c => c.id === createTaskStatus)?.title || "Backlog"}
                onSubmit={handleCreateTaskFromModal}
                goals={goals}
                tags={availableTags}
                members={members}
            />
        </DragDropContext>
    );
}

