"use client";

import { type Task } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, TrendingUp, Clock, Flame, ChevronDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isToday, isThisWeek, isThisMonth, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { useLanguage } from "@/components/shared/language-context";

interface TasksMetricsProps {
    tasks: Task[];
    timeFilter: "today" | "week" | "month";
    onTimeFilterChange: (filter: "today" | "week" | "month") => void;
}

export function TasksMetrics({ tasks, timeFilter, onTimeFilterChange }: TasksMetricsProps) {
    // Helper to safely convert Timestamp/string/number to Date
    const getDate = (dateField: any): Date => {
        if (!dateField) return new Date();
        if (dateField.toDate && typeof dateField.toDate === 'function') {
            return dateField.toDate();
        }
        return new Date(dateField);
    };

    // Filter tasks based on time period
    const getFilteredTasks = () => {
        return tasks.filter((task) => {
            if (!task.createdAt) return false;
            const taskDate = getDate(task.createdAt);

            switch (timeFilter) {
                case "today":
                    return isToday(taskDate);
                case "week":
                    return isThisWeek(taskDate, { weekStartsOn: 1 });
                case "month":
                    return isThisMonth(taskDate);
                default:
                    return false;
            }
        });
    };

    const filteredTasks = getFilteredTasks();
    const completedTasks = filteredTasks.filter((t) => t.completed);
    const totalTasks = filteredTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    // Calculate productivity velocity (comparison with previous period)
    const getPreviousPeriodTasks = () => {
        const now = new Date();
        return tasks.filter((task) => {
            if (!task.createdAt) return false;
            const taskDate = getDate(task.createdAt);

            switch (timeFilter) {
                case "today": {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0));
                    const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999));
                    return taskDate >= yesterdayStart && taskDate <= yesterdayEnd;
                }
                case "week": {
                    const lastWeekStart = new Date(startOfWeek(now, { weekStartsOn: 1 }));
                    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
                    const lastWeekEnd = new Date(endOfWeek(now, { weekStartsOn: 1 }));
                    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
                    return taskDate >= lastWeekStart && taskDate <= lastWeekEnd;
                }
                case "month": {
                    const lastMonth = new Date(now);
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    return taskDate.getMonth() === lastMonth.getMonth() &&
                        taskDate.getFullYear() === lastMonth.getFullYear();
                }
                default:
                    return false;
            }
        });
    };

    const previousPeriodCompleted = getPreviousPeriodTasks().filter((t) => t.completed).length;
    const velocityChange = previousPeriodCompleted > 0
        ? Math.round(((completedTasks.length - previousPeriodCompleted) / previousPeriodCompleted) * 100)
        : completedTasks.length > 0 ? 100 : 0;

    // Calculate streak (consecutive days with completed tasks)
    const calculateStreak = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let streak = 0;
        let currentDate = new Date(today);

        for (let i = 0; i < 365; i++) {
            const hasCompletedTask = tasks.some((task) => {
                if (!task.createdAt || !task.completed) return false;
                const createdDate = getDate(task.createdAt);
                createdDate.setHours(0, 0, 0, 0);
                return createdDate.getTime() === currentDate.getTime();
            });

            if (!hasCompletedTask) break;
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    };

    const { t } = useLanguage();

    const streak = calculateStreak();

    return (
        <div className="space-y-6">
            {/* Header with Time Filter */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        {t("overview")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Track your productivity
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 h-9 rounded-full bg-white/50 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                            <Calendar className="h-4 w-4" />
                            {t(timeFilter)}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onTimeFilterChange("today")}>
                            {t("today")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTimeFilterChange("week")}>
                            {t("week")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTimeFilterChange("month")}>
                            {t("month")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Stats Cards - Premium Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Focus Time Cards */}
                <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <div className="h-24 w-24 bg-blue-500 rounded-full blur-3xl" />
                    </div>

                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-1">
                                {t("focus_time")}
                            </p>
                            <h3 className="text-4xl font-bold text-foreground tracking-tight">
                                {(() => {
                                    const totalSeconds = completedTasks.reduce((acc, t) => acc + (t.totalTimeSpent || 0), 0);
                                    const hours = (totalSeconds / 3600).toFixed(1);
                                    return `${hours}h`;
                                })()}
                            </h3>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center">
                            <Clock className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            {(() => {
                                const totalSeconds = completedTasks.reduce((acc, t) => acc + (t.totalTimeSpent || 0), 0);
                                const avgMinutes = completedTasks.length > 0 ? Math.round((totalSeconds / 60) / completedTasks.length) : 0;
                                return `~${avgMinutes}m / task`;
                            })()}
                        </span>
                    </div>
                </Card>

                {/* Task Completion Card */}
                <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <div className="h-24 w-24 bg-emerald-500 rounded-full blur-3xl" />
                    </div>

                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-1">
                                {t("tasks")}
                            </p>
                            <h3 className="text-4xl font-bold text-foreground tracking-tight">
                                {completedTasks.length}/{totalTasks}
                            </h3>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${completionRate}%` }}
                        />
                    </div>
                </Card>

                {/* Streak/OKR Card */}
                <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <div className="h-24 w-24 bg-orange-500 rounded-full blur-3xl" />
                    </div>

                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-1">
                                {t("streak")}
                            </p>
                            <h3 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-2">
                                {streak}
                                <span className="text-lg text-muted-foreground font-normal">days</span>
                            </h3>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center">
                            <Flame className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-lg flex items-center gap-1">
                            {streak > 0 ? t("keep_it_up") : t("start_streak")}
                        </span>
                    </div>
                </Card>
            </div>
        </div>
    );
}
