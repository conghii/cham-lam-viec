"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import {
    Play, Pause, RotateCcw, Plus, Coffee,
    Layout, Calendar as CalendarIcon, Clock,
    MoreHorizontal, CheckCircle2, ChevronDown
} from "lucide-react";
import { subscribeToTasks, Task, addTask, deleteTask, updateTaskTime } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase/auth";
import { toast } from "sonner"; // Assuming sonner is used for toasts

export default function FocusPage() {
    // Timer State
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
    const [duration, setDuration] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Check screen size on mount
    useEffect(() => {
        const checkScreen = () => {
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
            }
        };
        checkScreen();
    }, []);

    // Task State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    // Add Task State
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Tasks
    useEffect(() => {
        const unsubscribe = subscribeToTasks((allTasks) => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');

            // cleanup bad data
            allTasks.forEach(t => {
                if (typeof t.title !== 'string') {
                    console.log("Deleting corrupt task:", t);
                    deleteTask(t.id).catch(err => console.error("Failed to delete corrupt task", err));
                }
            });

            const relevantTasks = allTasks.filter(t =>
                !t.completed &&
                typeof t.title === 'string' && // Filter out corrupt data
                (
                    !t.dueDate ||
                    t.dueDate.startsWith(todayStr) ||
                    new Date(t.dueDate) < new Date()
                )
            );
            setTasks(relevantTasks);
        });
        return () => unsubscribe();
    }, []);

    // Timer Logic
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);

            // Play Completion Sound
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
            audio.play().catch(e => console.error("Audio play failed", e));

            // Save time!
            if (activeTaskId) {
                // If it finished normally, we add the full duration (or remaining time if we want to be precise)
                // But simpler: we just track elapsed seconds in the interval.
                // Actually, let's just save the increment when the timer stops.
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, timeLeft]);

    // Track elapsed time to save on pause/stop
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        if (isRunning) {
            startTimeRef.current = Date.now();
        } else {
            // Timer stopped (paused or finished)
            if (startTimeRef.current && activeTaskId) {
                const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
                if (elapsedSeconds > 0) {
                    updateTaskTime(activeTaskId, elapsedSeconds).catch(err => console.error("Failed to save time", err));
                    toast.success(`Saved ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s focus time`);
                }
            }
            startTimeRef.current = null;
        }
    }, [isRunning, activeTaskId]);

    // Title Sync
    useEffect(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
        if (isRunning) {
            document.title = `⏱️ ${timeStr} - Focus`;
        } else {
            document.title = "Stitch Focus";
        }
    }, [timeLeft, isRunning]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const toggleTimer = () => {
        if (!isRunning) {
            // Starting the timer - Close Sidebar
            setIsSidebarOpen(false);
        }
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(25 * 60);
        setDuration(25 * 60);
    };
    const addTime = () => {
        setTimeLeft((prev) => prev + 5 * 60);
        setDuration((prev) => prev + 5 * 60); // Extend duration so bar doesn"t jump
    };
    const setShortBreak = () => {
        setIsRunning(false);
        setTimeLeft(5 * 60);
        setDuration(5 * 60);
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const user = auth.currentUser;
        if (!user) {
            toast.error("You must be logged in to add tasks");
            return;
        }

        try {
            // Correctly calling addTask with positional arguments: title, tag, dueDate, priority
            await addTask(
                newTaskTitle,
                "general",
                format(new Date(), 'yyyy-MM-dd'), // Due Date
                "medium" // Priority
            );
            setNewTaskTitle("");
            setIsAddTaskOpen(false);
            toast.success("Task added to Focus Queue");
        } catch (error) {
            console.error("Error adding task:", error);
            toast.error("Failed to add task");
        }
    };

    const activeTask = tasks.find(t => t.id === activeTaskId);

    // Progress Calculation
    const progress = (timeLeft / duration) * 100;
    const radius = 160;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (timeLeft / duration) * circumference;

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full bg-[#FAFBFC] dark:bg-slate-950/20 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">

            {/* 1. Sidebar (25%ish - Fixed Width) */}
            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* 1. Sidebar (Responsive: Overlay on mobile, Push on desktop) */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-80 border-r border-slate-200 dark:border-slate-800 bg-[#F8F9FA] dark:bg-slate-950 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
                !isSidebarOpen && "-translate-x-full md:-ml-80 md:translate-x-0"
            )}>
                {/* Sidebar Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/50 dark:border-slate-800">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 -ml-2">
                                <CalendarIcon className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                                Today
                                <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem>Today</DropdownMenuItem>
                            <DropdownMenuItem>Tomorrow</DropdownMenuItem>
                            <DropdownMenuItem>Next 7 Days</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <Layout className="w-4 h-4" />
                    </Button>
                </div>

                {/* Daily Progress */}
                <div className="px-6 py-6 border-b border-slate-200/50 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Daily Progress</span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">0/4 Sessions</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-0 rounded-full" />
                    </div>
                </div>

                {/* Task List */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 py-4">
                        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">In Progress</h3>
                    </div>

                    <ScrollArea className="flex-1 px-4">
                        <div className="space-y-2 pb-4">
                            {tasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => setActiveTaskId(task.id)}
                                    className={cn(
                                        "p-3 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                                        activeTaskId === task.id
                                            ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50 shadow-sm border-l-4 border-l-blue-500 dark:border-l-blue-500"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={cn(
                                            "text-sm font-semibold truncate pr-2",
                                            activeTaskId === task.id ? "text-blue-900 dark:text-blue-100" : "text-slate-700 dark:text-slate-300"
                                        )}>
                                            {typeof task.title === 'string' ? task.title : "Invalid Task Data"}
                                        </span>
                                        {activeTaskId === task.id && (
                                            <span className="text-[10px] items-center flex font-bold text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>25m</span>
                                        </div>
                                        {task.tag && (
                                            <>
                                                <span>•</span>
                                                <span className="uppercase">{task.tag}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 dark:hover:text-blue-400 rounded-xl justify-center h-12">
                                        <Plus className="w-4 h-4 mr-2" /> Add Task
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Task</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleAddTask} className="space-y-4">
                                        <Input
                                            placeholder="What do you want to focus on?"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            autoFocus
                                        />
                                        <Button type="submit" className="w-full">Create Task</Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* 2. Main Focus Zone (75%) */}
            <div className="flex-1 relative flex flex-col items-center justify-center bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-950 dark:to-slate-900">
                {/* Floating Open Sidebar Button */}
                {/* Floating Open Sidebar Button */}
                {!isSidebarOpen && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 left-4 z-30 text-slate-400 hover:text-slate-600 md:hidden"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Layout className="w-5 h-5" />
                    </Button>
                )}
                {/* Desktop Toggle (When closed) */}
                {!isSidebarOpen && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex absolute top-4 left-4 z-30 text-slate-400 hover:text-slate-600"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Layout className="w-5 h-5" />
                    </Button>
                )}

                {/* Visual Timer */}
                <div className="relative mb-8 md:mb-12">
                    {/* Ring SVG */}
                    <div className="relative w-72 h-72 md:w-[400px] md:h-[400px]">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 400 400">
                            {/* Track */}
                            <circle
                                cx="200"
                                cy="200"
                                r={radius}
                                className="stroke-slate-200 dark:stroke-slate-800 fill-transparent"
                                strokeWidth="8"
                            />
                            {/* Progress */}
                            <circle
                                cx="200"
                                cy="200"
                                r={radius}
                                stroke="#3B82F6" // blue-500
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-linear"
                            />
                        </svg>

                        {/* Center Content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl md:text-8xl font-bold text-slate-900 dark:text-white tracking-tighter tabular-nums">
                                {formatTime(timeLeft)}
                            </span>
                            <span className="text-xs md:text-sm font-bold text-slate-400 dark:text-slate-500 tracking-[0.3em] uppercase mt-2 md:mt-4">
                                Focus Mode
                            </span>
                        </div>
                    </div>
                </div>

                {/* Task Context */}
                <div className="flex flex-col items-center space-y-4 mb-12 md:mb-16 max-w-2xl px-8 text-center">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-wide uppercase">
                        <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mr-2 animate-pulse" />
                        In Progress
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
                        {activeTask
                            ? (typeof activeTask.title === 'string' ? activeTask.title : "Invalid Task Data")
                            : "Select a task to begin"
                        }
                    </h1>
                </div>

                {/* Control Dock */}
                <div className="flex items-center gap-4 md:gap-6 pb-8 md:pb-0">
                    {/* Break */}
                    <Button
                        size="icon"
                        className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                        onClick={setShortBreak}
                        title="Take a Break"
                    >
                        <Coffee className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>

                    {/* Reset */}
                    <Button
                        size="icon"
                        className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:text-red-500 dark:hover:text-red-400 transition-all"
                        onClick={resetTimer}
                        title="Reset Timer"
                    >
                        <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>

                    {/* Play/Pause Main Action */}
                    <Button
                        size="lg"
                        className={cn(
                            "h-16 w-16 md:h-20 md:w-20 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center",
                            isRunning
                                ? "bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-95"
                                : "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/25 dark:shadow-blue-900/20 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/40 hover:scale-105"
                        )}
                        onClick={toggleTimer}
                    >
                        {isRunning ? (
                            <Pause className="h-6 w-6 md:h-8 md:w-8 fill-current" />
                        ) : (
                            <Play className="h-6 w-6 md:h-8 md:w-8 fill-current ml-1" />
                        )}
                    </Button>

                    {/* Add Time */}
                    <Button
                        size="icon"
                        className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:text-green-500 dark:hover:text-green-400 transition-all"
                        onClick={addTime}
                        title="Add 5 Minutes"
                    >
                        <Plus className="h-5 w-5 md:h-6 md:w-6" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
