"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Play, Pause, RotateCcw, Coffee, Check, ChevronsUpDown, Plus } from "lucide-react";
import { subscribeToTasks, Task, updateTaskTime } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/components/shared/language-context";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export default function FocusWidgetPage() {
    const { t } = useLanguage();

    // Timer State
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [duration, setDuration] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);

    // Task State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);

    // Fetch Tasks
    useEffect(() => {
        const unsubscribe = subscribeToTasks((allTasks) => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const relevantTasks = allTasks.filter(t =>
                !t.completed &&
                typeof t.title === 'string' &&
                (!t.dueDate || t.dueDate.startsWith(todayStr) || new Date(t.dueDate) < new Date())
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
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
            audio.play().catch(e => console.error("Audio play failed", e));
            toast.success("Focus session complete!");
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, timeLeft]);

    // Save Time Logic
    useEffect(() => {
        if (isRunning) {
            startTimeRef.current = Date.now();
        } else {
            if (startTimeRef.current && activeTaskId) {
                const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
                if (elapsedSeconds > 0) {
                    updateTaskTime(activeTaskId, elapsedSeconds).catch(err => console.error("Failed to save time", err));
                }
            }
            startTimeRef.current = null;
        }
    }, [isRunning, activeTaskId]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const toggleTimer = () => {
        if (!activeTaskId && !isRunning) {
            toast.error(t("select_task_to_begin"));
            setOpenCombobox(true);
            return;
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
        setDuration((prev) => prev + 5 * 60);
    };

    const setShortBreak = () => {
        setIsRunning(false);
        setTimeLeft(5 * 60);
        setDuration(5 * 60);
    };

    const activeTask = tasks.find(t => t.id === activeTaskId);

    // Circle Progress Calculation
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (timeLeft / duration) * circumference;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-black p-4 flex flex-col items-center justify-center font-sans relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-500/5 to-transparent dark:from-blue-500/10 pointer-events-none" />

            {/* Timer Ring */}
            <div className="relative mb-8 transform scale-90 sm:scale-100 transition-transform">
                <div className="relative w-64 h-64">
                    {/* Outer Glow */}
                    <div className={cn(
                        "absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000",
                        isRunning ? "opacity-20 bg-blue-500" : "opacity-0"
                    )} />

                    <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 300 300">
                        {/* Track */}
                        <circle
                            cx="150"
                            cy="150"
                            r={radius}
                            className="stroke-slate-200 dark:stroke-slate-800 fill-transparent"
                            strokeWidth="6"
                        />
                        {/* Progress */}
                        <defs>
                            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3B82F6" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>
                        </defs>
                        <circle
                            cx="150"
                            cy="150"
                            r={radius}
                            stroke="url(#timerGradient)"
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear drop-shadow-lg"
                        />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                        <span className="text-6xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tighter">
                            {formatTime(timeLeft)}
                        </span>
                        <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                            {isRunning ? "Focusing" : "Paused"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Selector (Combobox) */}
            <div className="w-full max-w-[280px] mb-8 relative z-30">
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className={cn(
                                "w-full justify-between h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm transition-all hover:border-blue-200 hover:shadow-sm px-3",
                                !activeTaskId && "text-slate-400 border-dashed"
                            )}
                        >
                            <span className="truncate text-xs font-medium">
                                {activeTaskId
                                    ? tasks.find((task) => task.id === activeTaskId)?.title
                                    : t("select_task_to_begin")}
                            </span>
                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0 rounded-xl shadow-xl border-slate-100 dark:border-slate-800">
                        <Command>
                            <CommandInput placeholder="Search task..." className="text-xs" />
                            <CommandList>
                                <CommandEmpty className="py-2 text-xs text-center text-slate-500">No task found.</CommandEmpty>
                                <CommandGroup heading="Today's Tasks" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wider">
                                    {tasks.map((task) => (
                                        <CommandItem
                                            key={task.id}
                                            value={task.title}
                                            onSelect={() => {
                                                setActiveTaskId(task.id === activeTaskId ? null : task.id);
                                                setOpenCombobox(false);
                                            }}
                                            className="cursor-pointer py-2 px-2 aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-3.5 w-3.5",
                                                    activeTaskId === task.id ? "opacity-100 text-blue-500" : "opacity-0"
                                                )}
                                            />
                                            <span className={cn(
                                                "truncate text-xs",
                                                activeTaskId === task.id ? "font-medium text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"
                                            )}>
                                                {task.title}
                                            </span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all hover:scale-110"
                    onClick={setShortBreak}
                    title="Take a break"
                >
                    <Coffee className="h-5 w-5" />
                </Button>

                <Button
                    size="lg"
                    className={cn(
                        "h-20 w-20 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center",
                        isRunning
                            ? "bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                            : "bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-blue-500/30"
                    )}
                    onClick={toggleTimer}
                >
                    {isRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                </Button>

                <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-900 transition-all hover:scale-110"
                    onClick={resetTimer}
                    title="Reset timer"
                >
                    <RotateCcw className="h-5 w-5" />
                </Button>
            </div>

            <button
                onClick={addTime}
                className="mt-8 text-xs font-semibold text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-widest flex items-center gap-1 opacity-60 hover:opacity-100"
            >
                <Plus className="w-3 h-3" />
                Add 5 min
            </button>
        </div>
    );
}
