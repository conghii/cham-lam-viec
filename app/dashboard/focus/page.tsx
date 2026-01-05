"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Play, Pause, RotateCcw, Plus, Music } from "lucide-react";
import { subscribeToTasks, Task } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const PLAYLISTS = [
    { id: "lofi", name: "Lo-Fi Beats", src: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wqsS?utm_source=generator&theme=0" },
    { id: "piano", name: "Peaceful Piano", src: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0" },
    { id: "deep", name: "Deep Focus", src: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0" },
    { id: "nature", name: "Nature Sounds", src: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4wta20PHgwo?utm_source=generator&theme=0" },
];

export default function FocusPage() {
    // Timer State
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [showMusic, setShowMusic] = useState(false);
    const [selectedPlaylist, setSelectedPlaylist] = useState(PLAYLISTS[0]);

    // Task State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Tasks
    useEffect(() => {
        const unsubscribe = subscribeToTasks((allTasks) => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');

            const relevantTasks = allTasks.filter(t =>
                !t.completed && (
                    !t.dueDate || // No due date (backlog but maybe focusable)
                    t.dueDate.startsWith(todayStr) || // Due today
                    new Date(t.dueDate) < new Date() // Overdue
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
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, timeLeft]);

    // Title Sync
    useEffect(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

        if (isRunning) {
            document.title = `🔴 ${timeStr}`;
        } else {
            document.title = "Focus";
        }

        return () => {
            document.title = "Stitch";
        }
    }, [timeLeft, isRunning]);


    // Format Time Display
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const toggleTimer = () => setIsRunning(!isRunning);
    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(25 * 60);
    };
    const addTime = () => setTimeLeft((prev) => prev + 5 * 60);

    const activeTask = tasks.find(t => t.id === activeTaskId);

    return (
        <div className="flex h-screen w-full bg-background">
            {/* Left Sidebar: Task List */}
            <div className="w-80 border-r bg-card/50 flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        Today's Focus
                    </h2>
                    <p className="text-xs text-muted-foreground">Select a task to focus on</p>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => setActiveTaskId(activeTaskId === task.id ? null : task.id)}
                                className={cn(
                                    "p-3 rounded-xl border cursor-pointer transition-all hover:border-primary/50 text-sm",
                                    activeTaskId === task.id
                                        ? "bg-primary/5 border-primary shadow-sm"
                                        : "bg-card border-border/50 hover:bg-accent/50"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                                        activeTaskId === task.id ? "border-primary" : "border-muted-foreground/30"
                                    )}>
                                        {activeTaskId === task.id && <div className="h-2 w-2 bg-primary rounded-full" />}
                                    </div>
                                    <div className="space-y-1">
                                        <p className={cn("font-medium leading-snug", activeTaskId === task.id && "text-primary")}>
                                            {task.title}
                                        </p>
                                        {task.tag && (
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                {task.tag}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground text-sm italic">
                                No tasks for today.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Area: Timer */}
            <div className="flex-1 flex flex-col items-center justify-center relative bg-background transition-colors duration-1000">
                {/* Active Task (Minimalist) */}
                <div className="absolute top-12 left-0 right-0 text-center px-4">
                    {activeTask ? (
                        <h1 className="text-xl md:text-2xl font-medium text-muted-foreground/50 animate-in fade-in slide-in-from-top-4">
                            {activeTask.title}
                        </h1>
                    ) : (
                        <p className="text-muted-foreground/30 text-lg">Select a task</p>
                    )}
                </div>

                {/* Timer & Controls */}
                <div className="flex flex-col items-center gap-12 z-10">
                    {/* Time Display */}
                    <div className="text-[10rem] md:text-[14rem] font-bold tabular-nums tracking-tighter text-foreground leading-none select-none">
                        {formatTime(timeLeft)}
                    </div>

                    {/* Main Control - Red Button */}
                    <div className="relative group">
                        <Button
                            size="lg"
                            className={cn(
                                "h-24 w-24 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center",
                                isRunning
                                    ? "bg-muted text-foreground hover:bg-muted/80 scale-90"
                                    : "bg-red-500 hover:bg-red-600 hover:scale-110 text-white"
                            )}
                            style={{ backgroundColor: isRunning ? undefined : '#ef4444' }}
                            onClick={toggleTimer}
                        >
                            {isRunning ? (
                                <Pause className="h-8 w-8 fill-current" />
                            ) : (
                                <Play className="h-8 w-8 fill-current ml-1" />
                            )}
                        </Button>

                        {/* Secondary Controls (Reveal on Hover) */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-full pl-8 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground" onClick={resetTimer} title="Reset">
                                <RotateCcw className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground" onClick={addTime} title="Add 5m">
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Music Toggle (Minimal) */}
                <div className="absolute bottom-10 right-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-10 w-10 text-muted-foreground/50 hover:text-foreground transition-colors"
                        onClick={() => setShowMusic(!showMusic)}
                    >
                        <Music className="h-5 w-5" />
                    </Button>

                    {showMusic && (
                        <div className="absolute bottom-16 right-0 w-80 bg-card/80 backdrop-blur-xl border rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-5 space-y-4">
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {PLAYLISTS.map(playlist => (
                                    <button
                                        key={playlist.id}
                                        onClick={() => setSelectedPlaylist(playlist)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                                            selectedPlaylist.id === playlist.id
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {playlist.name}
                                    </button>
                                ))}
                            </div>

                            <iframe
                                key={selectedPlaylist.id}
                                style={{ borderRadius: '12px' }}
                                src={selectedPlaylist.src}
                                width="100%"
                                height="152"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
