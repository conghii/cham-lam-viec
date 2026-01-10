"use client";

import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, subDays, isToday, getDay } from "date-fns";
import {
    Check,
    Plus,
    Flame,
    BookOpen,
    Droplets,
    Activity,
    Pill,
    Footprints,
    MoreVertical,
    Trash2,
    Edit2,
    Target,
    ListTodo,
    CheckCircle2,
    Trophy,
    X,
    Sparkles,
    Carrot,
    Apple,
    Calendar as CalendarIcon,
    LayoutGrid,
    List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { useLanguage } from "@/components/shared/language-context";
import { useHabits, type Habit, ICON_MAP } from "@/components/dashboard/habit-context";

const SUGGESTIONS = [
    { label: "Drink Water", icon: "Droplets", color: "bg-cyan-100 text-cyan-600" },
    { label: "Run", icon: "Activity", color: "bg-cyan-100 text-cyan-600" },
    { label: "Meditate", icon: "Activity", color: "bg-teal-100 text-teal-600" },
    { label: "Read", icon: "BookOpen", color: "bg-cyan-100 text-cyan-600" },
    { label: "Eat Healthy", icon: "Carrot", color: "bg-emerald-100 text-emerald-600" },
];

const DAYS = [
    { label: "S", value: 0 },
    { label: "M", value: 1 },
    { label: "T", value: 2 },
    { label: "W", value: 3 },
    { label: "T", value: 4 },
    { label: "F", value: 5 },
    { label: "S", value: 6 },
];

type ViewMode = 'weekly' | 'monthly' | 'annual' | 'today';

export function HabitTracker() {
    const { t } = useLanguage();
    const { habits, addHabit, updateHabit, deleteHabit, toggleHabit } = useHabits();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');
    const [heatmapHabitId, setHeatmapHabitId] = useState<string>("all");

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        goal: "1",
        unit: "times",
        frequency: [0, 1, 2, 3, 4, 5, 6] as number[],
        icon: "Activity" // Default icon name
    });

    // Calendar Generation for Matrix
    const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

    // Stats Calculations (Aggregate for the week/all time)
    const totalPossible = habits.length * 7;
    const totalCompleted = habits.reduce((acc, h) => {
        return acc + Object.values(h.history).filter(Boolean).length;
    }, 0);
    const completionRate = totalPossible > 0 ? Math.round((totalCompleted / (habits.length * 365)) * 100) : 0; // rough all time
    const bestStreak = Math.max(...habits.map(h => h.streak), 0);
    const dailyAverage = (totalCompleted / 365).toFixed(1);

    // Actions
    const handleDelete = (id: string) => {
        deleteHabit(id);
    };

    const handleEdit = (habit: Habit) => {
        setEditingHabit(habit);
        setFormData({
            name: habit.name,
            goal: habit.goal.toString(),
            unit: habit.unit,
            frequency: habit.frequency,
            icon: habit.icon
        });
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingHabit(null);
        setFormData({
            name: "",
            goal: "1",
            unit: "times",
            frequency: [0, 1, 2, 3, 4, 5, 6],
            icon: "Activity"
        });
        setIsDialogOpen(true);
    };

    const handleSuggestionClick = (suggestion: typeof SUGGESTIONS[0]) => {
        setFormData(prev => ({
            ...prev,
            name: suggestion.label,
            icon: suggestion.icon
        }));
    };

    const toggleDay = (dayValue: number) => {
        setFormData(prev => {
            const exists = prev.frequency.includes(dayValue);
            if (exists) {
                if (prev.frequency.length === 1) return prev;
                return { ...prev, frequency: prev.frequency.filter(d => d !== dayValue) };
            } else {
                return { ...prev, frequency: [...prev.frequency, dayValue].sort() };
            }
        });
    };

    const handleSave = () => {
        if (!formData.name) return;

        if (editingHabit) {
            updateHabit(editingHabit.id, {
                name: formData.name,
                goal: parseInt(formData.goal) || 1,
                unit: formData.unit,
                frequency: formData.frequency,
                icon: formData.icon
            });
        } else {
            const newHabit: Habit = {
                id: Math.random().toString(36).slice(2),
                name: formData.name,
                icon: formData.icon,
                streak: 0,
                goal: parseInt(formData.goal) || 1,
                unit: formData.unit,
                completed: false,
                color: "bg-cyan-50 text-cyan-500",
                iconColor: "bg-cyan-100 text-cyan-600",
                frequency: formData.frequency,
                history: {}
            };
            addHabit(newHabit);
        }
        setIsDialogOpen(false);
    };

    const isEveryday = formData.frequency.length === 7;

    // --- VIEW GENERATION HELPERS ---

    // Monthly View Helpers
    const getMonthDays = () => {
        const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    };

    // Annual View Helpers
    const getAnnualDays = () => {
        const today = new Date();
        const start = subDays(today, 364); // Last 365 days
        return eachDayOfInterval({ start, end: today });
    };

    // Calculate daily completion status for a given date across ALL habits or specific habit
    const getDailyCompletion = (date: Date, habitId?: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        // Filter habits that are scheduled for this day
        const dayOfWeek = getDay(date); // 0-6
        let scheduledHabits = habits.filter(h => h.frequency.includes(dayOfWeek));

        if (habitId) {
            scheduledHabits = scheduledHabits.filter(h => h.id === habitId);
        }

        if (scheduledHabits.length === 0) return { rate: 0, count: 0, total: 0 };

        const completedCount = scheduledHabits.filter(h => h.history[dateStr]).length;
        return {
            rate: completedCount / scheduledHabits.length,
            count: completedCount,
            total: scheduledHabits.length
        };
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-[#F8FAFC] p-0 font-sans text-gray-900 space-y-6">

                {/* Header / Navigation */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hidden">
                    {/* ... (Hidden for now as requested by user logic inference, or just removing padding around it) -> Actually I will keep header but remove p-4 from container */}
                </div>
                {/* Re-rendering header properly */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 px-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                            <button
                                className="hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                onClick={() => setSelectedDate(curr => addDays(curr, viewMode === 'monthly' ? -30 : -7))}
                            >
                                &lt;
                            </button>
                            <span>{format(selectedDate, "MMMM yyyy")}</span>
                            <button
                                className="hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                onClick={() => setSelectedDate(curr => addDays(curr, viewMode === 'monthly' ? 30 : 7))}
                            >
                                &gt;
                            </button>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900">
                            {viewMode === 'weekly' && `${format(startOfCurrentWeek, "MMM d")} — ${format(addDays(startOfCurrentWeek, 6), "MMM d")}`}
                            {viewMode === 'monthly' && format(selectedDate, "MMMM yyyy")}
                            {viewMode === 'annual' && t("past_365_days")}
                            {viewMode === 'today' && t("todays_focus")}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 font-medium">{t("visualization_desc")}</p>
                    </div>

                    <div className="bg-white rounded-full p-1 shadow-sm border border-gray-100 flex items-center">
                        <button
                            onClick={() => setViewMode('weekly')}
                            className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all", viewMode === 'weekly' ? "bg-emerald-400 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50")}
                        >
                            {t("weekly_matrix")}
                        </button>
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={cn("px-4 py-2 rounded-full text-xs font-semibold transition-all", viewMode === 'monthly' ? "bg-emerald-400 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50")}
                        >
                            {t("monthly_view")}
                        </button>
                        <button
                            onClick={() => setViewMode('annual')}
                            className={cn("px-4 py-2 rounded-full text-xs font-semibold transition-all", viewMode === 'annual' ? "bg-emerald-400 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50")}
                        >
                            {t("annual_heatmap")}
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button
                            onClick={() => setViewMode('today')}
                            className={cn("px-4 py-2 rounded-full text-xs font-semibold transition-all", viewMode === 'today' ? "bg-emerald-400 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50")}
                        >
                            {t("today")}
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                    {/* Completion Rate */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm flex items-center justify-between relative overflow-hidden group">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t("completion_rate")}</p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-4xl font-extrabold text-gray-900">{completionRate}%</span>
                                <span className="text-sm font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">~12%</span>
                            </div>
                        </div>
                        <div className="h-12 w-12 rounded-full border-[6px] border-emerald-400 border-t-emerald-100 animate-spin-slow"></div>
                    </div>

                    {/* Longest Streak */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t("longest_streak")}</p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-4xl font-extrabold text-gray-900">{bestStreak} {t("days")}</span>
                                <span className="text-sm font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">~2%</span>
                            </div>
                        </div>
                        <Flame className="h-8 w-8 text-orange-500 fill-orange-500" />
                    </div>

                    {/* Daily Average */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t("daily_average")}</p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-4xl font-extrabold text-gray-900">{dailyAverage} {t("habits_count")}</span>
                                <span className="text-sm font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">~5%</span>
                            </div>
                        </div>
                        <Activity className="h-8 w-8 text-blue-500" />
                    </div>
                </div>

                {/* Matrix Table (Only show if viewMode is weekly) */}
                {viewMode === 'weekly' && (
                    <div className="bg-white rounded-[40px] shadow-sm p-4 overflow-hidden mx-4 pb-8">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-gray-50">
                                        <th className="text-left py-6 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-[250px]">{t("habit_name")}</th>
                                        {weekDays.map((date, i) => {
                                            const isToday = isSameDay(date, new Date());
                                            return (
                                                <th key={i} className="text-center py-6 px-2">
                                                    <div className={cn(
                                                        "flex flex-col items-center gap-1",
                                                        isToday ? "text-emerald-500" : "text-gray-400"
                                                    )}>
                                                        <span className="text-[10px] font-bold uppercase">{format(date, "EEE")} {format(date, "d")}</span>
                                                        {isToday && <span className="text-[9px] font-extrabold bg-emerald-100 px-1.5 rounded text-emerald-600">{t("today").toUpperCase()}</span>}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        <th className="text-right py-6 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-[100px]">{t("score")}</th>
                                        <th className="py-6 px-4 w-[50px]" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {habits.map((habit) => {
                                        // Calculate weekly score for this habit
                                        const weeklyCompleted = weekDays.filter(d => habit.history[format(d, 'yyyy-MM-dd')]).length;
                                        // Fix: weeklyTarget should be based on how many days the habit is actually scheduled for in this week
                                        const weeklyTarget = weekDays.filter(d => habit.frequency.includes(d.getDay())).length || 7;
                                        const scoreColor = (weeklyCompleted / weeklyTarget) === 1 ? "bg-emerald-400" : "bg-emerald-400"; // Can vary

                                        return (
                                            <tr key={habit.id} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 border-dashed">
                                                <td className="py-6 px-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-gray-50", habit.iconColor && "bg-opacity-20")}>
                                                            {(() => {
                                                                const IconComponent = ICON_MAP[habit.icon] || Activity;
                                                                return <IconComponent className={cn("h-5 w-5", habit.color.split(' ')[1] || "text-gray-500")} />;
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-sm">{habit.name}</p>
                                                            {habit.goal > 0 && <p className="text-xs text-gray-400 font-medium">{habit.goal} {habit.unit}</p>}
                                                        </div>
                                                    </div>
                                                </td>

                                                {weekDays.map((date, i) => {
                                                    const dateStr = format(date, 'yyyy-MM-dd');
                                                    const isCompleted = !!habit.history[dateStr];
                                                    const isToday = isSameDay(date, new Date());
                                                    const dayOfWeek = date.getDay();
                                                    const isScheduled = habit.frequency.includes(dayOfWeek);

                                                    return (
                                                        <td key={i} className="py-4 px-2 text-center">
                                                            <div className="flex justify-center">
                                                                {!isScheduled ? (
                                                                    <span className="text-gray-200 text-2xl font-light">-</span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => toggleHabit(habit.id, date)}
                                                                        className={cn(
                                                                            "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                                                                            isCompleted
                                                                                ? "bg-emerald-400 shadow-lg shadow-emerald-200 scale-100"
                                                                                : isToday
                                                                                    ? "border-2 border-dashed border-emerald-400 bg-emerald-50 animate-pulse"
                                                                                    : "border border-gray-200 hover:border-emerald-200"
                                                                        )}
                                                                    >
                                                                        {isCompleted && <Check className="h-5 w-5 text-white" strokeWidth={3} />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                <td className="py-6 px-4">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-bold text-gray-900">{weeklyCompleted}/{weeklyTarget}</span>
                                                        <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn("h-full rounded-full transition-all duration-500", scoreColor)}
                                                                style={{ width: `${Math.min(100, (weeklyCompleted / weeklyTarget) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-6 px-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreVertical className="h-4 w-4 text-gray-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(habit)}>
                                                                <Edit2 className="mr-2 h-4 w-4" /> {t("edit_habit")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(habit.id)}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> {t("delete_habit")}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Monthly View */}
                {viewMode === 'monthly' && (
                    <div className="bg-white rounded-[40px] shadow-sm p-6 max-w-4xl mx-auto">
                        <div className="grid grid-cols-7 mb-4">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider py-1">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {getMonthDays().map((day, i) => {
                                const { rate, count, total } = getDailyCompletion(day);
                                const isCurrentMonth = isSameDay(day, startOfMonth(selectedDate)) || (day >= startOfMonth(selectedDate) && day <= endOfMonth(selectedDate));

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "aspect-square rounded-2xl flex flex-col items-center justify-between py-2 relative group transition-all",
                                            isCurrentMonth ? "bg-gray-50 hover:bg-gray-100" : "bg-transparent opacity-30"
                                        )}
                                    >
                                        <span className={cn("text-xs font-bold", isToday(day) ? "text-emerald-500" : "text-gray-500")}>
                                            {format(day, "d")}
                                        </span>

                                        {/* Circular Progress or Dot */}
                                        {total > 0 && (
                                            <div className="relative h-9 w-9 flex items-center justify-center">
                                                <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                                                    {/* Background Circle */}
                                                    <path
                                                        className="text-gray-200"
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="3"
                                                    />
                                                    {/* Progress Circle */}
                                                    <path
                                                        className={cn("transition-all duration-500", rate === 1 ? "text-emerald-400" : "text-emerald-400")}
                                                        strokeDasharray={`${rate * 100}, 100`}
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <span className={cn(
                                                    "absolute text-[10px] font-bold",
                                                    rate === 1 ? "text-emerald-600" : "text-gray-600"
                                                )}>{count}/{total}</span>
                                            </div>
                                        )}
                                        {total === 0 && <div className="h-9 w-9" />} {/* Spacer */}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Annual Heatmap */}
                {viewMode === 'annual' && (
                    <div className="bg-white rounded-[40px] shadow-sm p-8 max-w-5xl mx-auto overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{t("annual_heatmap")}</h3>
                                <p className="text-gray-400 text-xs">{t("visualization_desc")}</p>
                            </div>
                            <div className="w-[200px]">
                                <Select value={heatmapHabitId} onValueChange={setHeatmapHabitId}>
                                    <SelectTrigger className="h-10 rounded-xl bg-gray-50 border-gray-200">
                                        <SelectValue placeholder={t("all_habits")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("all_habits")}</SelectItem>
                                        {habits.map(h => {
                                            const Icon = ICON_MAP[h.icon] || Activity;
                                            return (
                                                <SelectItem key={h.id} value={h.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4 opacity-50" />
                                                        {h.name}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex overflow-x-auto pb-4 gap-1 no-scrollbar">
                                {/* We loop through weeks roughly. Simple standard heatmap: 7 rows (days), ~52 cols (weeks) */}
                                {Array.from({ length: 53 }).map((_, weekIndex) => (
                                    <div key={weekIndex} className="flex flex-col gap-1">
                                        {Array.from({ length: 7 }).map((_, dayIndex) => {
                                            const today = new Date();
                                            // A simple approximation for now:
                                            const dayOffset = (weekIndex * 7) + dayIndex;
                                            const date = addDays(subDays(today, 365), dayOffset);

                                            if (date > today) return null;

                                            // Get stats based on filter
                                            const stats = getDailyCompletion(date, heatmapHabitId === 'all' ? undefined : heatmapHabitId);
                                            const { rate, count } = stats;
                                            const hasScheduled = stats.total > 0;

                                            // Color scales
                                            let bgClass = "bg-gray-100";
                                            if (!hasScheduled) {
                                                bgClass = "bg-gray-50"; // Not scheduled / Day off
                                            } else {
                                                if (rate > 0) bgClass = "bg-emerald-100";
                                                if (rate > 0.25) bgClass = "bg-emerald-200";
                                                if (rate > 0.5) bgClass = "bg-emerald-300";
                                                if (rate > 0.75) bgClass = "bg-emerald-400";
                                                if (rate === 1) bgClass = "bg-emerald-500";
                                                if (rate === 0) bgClass = "bg-gray-100";
                                            }

                                            return (
                                                <Tooltip key={dayIndex}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn("h-3 w-3 rounded-[3px] transition-colors hover:ring-2 hover:ring-emerald-200 hover:z-10", bgClass)}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs font-bold">{format(date, "MMM d, yyyy")}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {heatmapHabitId === 'all'
                                                                ? `${count} completed`
                                                                : (rate === 1 ? "Completed" : (hasScheduled ? "Missed" : "No goal"))}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-end gap-2 text-xs text-gray-400 mt-2">
                                <span>Less</span>
                                <div className="h-3 w-3 rounded-sm bg-gray-100"></div>
                                <div className="h-3 w-3 rounded-sm bg-emerald-200"></div>
                                <div className="h-3 w-3 rounded-sm bg-emerald-400"></div>
                                <div className="h-3 w-3 rounded-sm bg-emerald-500"></div>
                                <span>More</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Today View */}
                {viewMode === 'today' && (
                    <div className="bg-white rounded-[40px] shadow-sm p-4 md:p-8 max-w-3xl mx-auto">
                        <div className="space-y-4">
                            {habits
                                .filter(h => h.frequency.includes(getDay(new Date()))) // Filter for today
                                .sort((a, b) => {
                                    const aDone = !!a.history[format(new Date(), 'yyyy-MM-dd')];
                                    const bDone = !!b.history[format(new Date(), 'yyyy-MM-dd')];
                                    return Number(aDone) - Number(bDone); // Incomplete first
                                })
                                .map(habit => {
                                    const isCompleted = !!habit.history[format(new Date(), 'yyyy-MM-dd')];
                                    return (
                                        <div key={habit.id} className={cn(
                                            "flex items-center p-4 rounded-3xl transition-all border",
                                            isCompleted ? "bg-emerald-50/50 border-emerald-100 opacity-75" : "bg-white border-gray-100 hover:border-emerald-200 hover:shadow-sm"
                                        )}>
                                            <div className={cn(
                                                "h-14 w-14 rounded-2xl flex items-center justify-center mr-4 shrink-0 transition-colors",
                                                isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-gray-50 text-gray-500"
                                            )}>
                                                {(() => {
                                                    const Icon = ICON_MAP[habit.icon] || Activity;
                                                    return <Icon className="h-7 w-7" />;
                                                })()}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={cn("font-bold text-lg", isCompleted ? "text-gray-500 line-through" : "text-gray-900")}>{habit.name}</h3>
                                                <p className="text-sm text-gray-400 font-medium">{habit.goal} {habit.unit}</p>
                                            </div>
                                            <button
                                                onClick={() => toggleHabit(habit.id, new Date())}
                                                className={cn(
                                                    "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                                                    isCompleted
                                                        ? "bg-emerald-400 shadow-xl shadow-emerald-200 scale-100"
                                                        : "border-2 border-gray-100 hover:border-emerald-400 hover:bg-emerald-50"
                                                )}
                                            >
                                                {isCompleted && <Check className="h-6 w-6 text-white" strokeWidth={3} />}
                                            </button>
                                        </div>
                                    )
                                })
                            }
                            {habits.filter(h => h.frequency.includes(getDay(new Date()))).length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <p>{t("no_habits_today")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bottom Action */}
                <div className="flex justify-center pt-8 pb-12">
                    <Button
                        size="lg"
                        className="h-14 px-8 rounded-full bg-emerald-400 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-200/50 text-lg font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                        onClick={handleAddNew}
                    >
                        <Plus className="h-6 w-6" strokeWidth={3} />
                        {t("add_habit_btn")}
                    </Button>
                </div>

                {/* Add/Edit Modal */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[425px] rounded-[32px] p-0 overflow-hidden bg-white border-none shadow-2xl">
                        <DialogHeader className="p-8 pb-0">
                            <DialogTitle className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                                <Target className="h-6 w-6 text-emerald-500" />
                                {editingHabit ? t("edit_habit_dialog") : t("new_habit_dialog")}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="p-8 space-y-6">
                            {/* Name Input */}
                            <div className="space-y-3">
                                <Label className="uppercase text-xs font-bold text-gray-400 tracking-wider">{t("habit_name_label")}</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Drink Water..."
                                    className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-emerald-200 transition-all font-bold text-lg"
                                />
                                {/* Quick Suggestions */}
                                {!editingHabit && <div className="flex flex-wrap gap-2 pt-1">
                                    {SUGGESTIONS.map((s) => {
                                        const Icon = ICON_MAP[s.icon] || Activity;
                                        return (
                                            <button
                                                key={s.label}
                                                type="button"
                                                onClick={() => handleSuggestionClick(s)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95",
                                                    s.color
                                                )}
                                            >
                                                <Icon className="h-3 w-3" />
                                                {s.label}
                                            </button>
                                        );
                                    })}
                                </div>}
                            </div>

                            {/* Goal & Unit Input Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="uppercase text-xs font-bold text-gray-400 tracking-wider">{t("goal_label")}</Label>
                                    <Input
                                        type="number"
                                        value={formData.goal}
                                        onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                                        placeholder="e.g. 5"
                                        className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-emerald-200 transition-all font-bold text-lg"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="uppercase text-xs font-bold text-gray-400 tracking-wider">{t("unit_label")}</Label>
                                    <Input
                                        value={formData.unit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                        placeholder="e.g. mins"
                                        className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-emerald-200 transition-all font-bold text-lg"
                                    />
                                </div>
                            </div>


                            {/* Frequency Selector */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="uppercase text-xs font-bold text-gray-400 tracking-wider">{t("frequency_label")}</Label>
                                    <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">
                                        {isEveryday ? t("everyday") : `${formData.frequency.length} ${t("days_week")}`}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-1">
                                    {DAYS.map((day) => {
                                        const isSelected = formData.frequency.includes(day.value);
                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(day.value)}
                                                className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300",
                                                    isSelected
                                                        ? "bg-emerald-400 text-white shadow-lg shadow-emerald-200"
                                                        : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                )}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        <div className="p-8 pt-0 flex gap-3">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="h-12 rounded-xl border-gray-200 font-bold hover:bg-gray-50 text-gray-500"
                                    onClick={() => setIsDialogOpen(false)}
                                >
                                    {t("cancel")}
                                </Button>
                                <Button
                                    className="h-12 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-200 font-bold"
                                    onClick={handleSave}
                                >
                                    {editingHabit ? t("save_habit") : t("add_habit_btn")}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </TooltipProvider>
    );
}
