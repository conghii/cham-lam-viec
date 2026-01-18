"use client";

import { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { CheckCircle2, Circle, ListTodo, Plus, Calendar as CalendarIcon, Tag as TagIcon, GripVertical } from "lucide-react";
import { subscribeToTasks, toggleTaskCompletion, addTask, type Task, getUser, subscribeToOrganization, type Tag as FirestoreTag } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function TasksWidgetPage() {
    const { t } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);
    const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
    const [newTaskTag, setNewTaskTag] = useState("general");
    const [availableTags, setAvailableTags] = useState<FirestoreTag[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Fetch Org & Tags
    useEffect(() => {
        const unsubscribeUser = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userData = await getUser(user.uid);
                if (userData?.orgId) {
                    setOrgId(userData.orgId);
                    subscribeToOrganization(userData.orgId, (org) => {
                        if (org.tags) {
                            setAvailableTags(org.tags);
                        }
                    });
                }
            }
        });
        return () => unsubscribeUser();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToTasks((data) => {
            const today = new Date();
            const todayTasks = data.filter(task => {
                if (task.completed) return false;
                if (!task.dueDate) return true;
                const taskDate = new Date(task.dueDate);
                return isSameDay(taskDate, today) || taskDate < today;
            });

            // Initial sort by priority if not manually reordered (local state handling is complex without backend support, simplified here)
            const priorityMap = { high: 0, medium: 1, low: 2 };
            todayTasks.sort((a, b) => {
                const pA = priorityMap[a.priority as keyof typeof priorityMap] ?? 3;
                const pB = priorityMap[b.priority as keyof typeof priorityMap] ?? 3;
                return pA - pB;
            });

            setTasks(todayTasks);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleToggle = async (taskId: string, currentStatus: boolean) => {
        await toggleTaskCompletion(taskId, currentStatus);
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(tasks);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setTasks(items);
        // Note: Logic to persist order is omitted as typical task sorting relies on multiple factors (date, priority).
        // This visual reordering is local for the session/view until refresh.
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            setLoading(true);
            await addTask(
                newTaskTitle,
                newTaskTag,
                newTaskDate ? newTaskDate.toISOString() : new Date().toISOString(),
                newTaskPriority
            );
            setNewTaskTitle("");
            setNewTaskDate(undefined);
            setNewTaskPriority("medium");
            setNewTaskTag("general");
            toast.success(t("task_created"));
        } catch (error) {
            console.error("Failed to add task", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-black p-4 flex flex-col font-sans">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-500 rounded-lg p-1.5">
                        <ListTodo className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-xs font-black uppercase tracking-widest text-slate-400">{t("tasks_title")}</h1>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                    {tasks.length}
                </Badge>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="widget-tasks">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2 pb-4"
                            >
                                {loading ? (
                                    [1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-16 bg-white dark:bg-slate-900 animate-pulse rounded-xl border border-slate-100 dark:border-slate-800" />
                                    ))
                                ) : tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-full mb-3">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">All caught up!</p>
                                        <p className="text-[10px] text-slate-400 mt-1">No pending tasks for today.</p>
                                    </div>
                                ) : (
                                    tasks.map((task, index) => (
                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={cn(
                                                        "group flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border transition-all hover:shadow-sm",
                                                        task.priority === 'high' ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/10" :
                                                            task.priority === 'medium' ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/10" :
                                                                "border-slate-100 dark:border-slate-800"
                                                    )}
                                                >
                                                    <div {...provided.dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-500">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <Checkbox
                                                        id={`task-${task.id}`}
                                                        checked={task.completed}
                                                        onCheckedChange={() => handleToggle(task.id, task.completed)}
                                                        className="rounded-full w-5 h-5"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <label
                                                            htmlFor={`task-${task.id}`}
                                                            className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed cursor-pointer"
                                                        >
                                                            {task.title}
                                                        </label>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {task.tag && (
                                                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide truncate max-w-[120px]">
                                                                    #{availableTags.find(t => t.id === task.tag)?.label || task.tag}
                                                                </span>
                                                            )}
                                                            {task.dueDate && (
                                                                <>
                                                                    <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>
                                                                    <span className={cn(
                                                                        "text-[10px] font-medium tracking-wide flex items-center gap-1",
                                                                        isSameDay(new Date(task.dueDate), new Date()) ? "text-blue-500" :
                                                                            new Date(task.dueDate) < new Date() ? "text-rose-500" :
                                                                                "text-slate-400"
                                                                    )}>
                                                                        <CalendarIcon className="w-2.5 h-2.5" />
                                                                        {isSameDay(new Date(task.dueDate), new Date()) ? "Today" : format(new Date(task.dueDate), "MMM d")}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </ScrollArea>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <form
                    onSubmit={handleAddTask}
                    className="flex flex-col gap-2"
                >
                    <Input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder={t("add_task")}
                        className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {/* Date Picker */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn("h-8 w-8", newTaskDate && "text-blue-500")}>
                                        <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={newTaskDate}
                                        onSelect={setNewTaskDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Priority Select */}
                            <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
                                <SelectTrigger className="h-8 w-[90px] text-xs border-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 p-0 px-2">
                                    <div className="flex items-center gap-1">
                                        <Circle className={cn("w-2 h-2 fill-current",
                                            newTaskPriority === 'high' ? "text-rose-500" :
                                                newTaskPriority === 'medium' ? "text-amber-500" : "text-slate-400"
                                        )} />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Tag Select (Simplified) */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className={cn("h-8 text-xs font-normal", newTaskTag !== 'general' && "text-blue-500")}>
                                        <TagIcon className="h-3 w-3 mr-1" />
                                        <span className="max-w-[80px] truncate">
                                            {availableTags.find(t => t.id === newTaskTag)?.label || (newTaskTag === 'general' ? 'Tag' : newTaskTag)}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[180px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search tags..." className="h-8" />
                                        <CommandList>
                                            <CommandEmpty>No tags found.</CommandEmpty>
                                            <CommandGroup>
                                                {availableTags.length > 0 ? availableTags.map(tag => (
                                                    <CommandItem
                                                        key={tag.id}
                                                        onSelect={() => setNewTaskTag(tag.id)}
                                                        className="text-xs"
                                                    >
                                                        <div className={cn("w-2 h-2 rounded-full mr-2", tag.color?.split(" ")[0].replace("text-", "bg-"))} />
                                                        {tag.label}
                                                    </CommandItem>
                                                )) : (
                                                    <CommandItem value="general" onSelect={() => setNewTaskTag("general")}>General</CommandItem>
                                                )}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Button
                            type="submit"
                            size="icon"
                            className="h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                            disabled={!newTaskTitle.trim() || loading}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
