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
import { Calendar, TrendingUp, Clock, Flame, ChevronDown } from "lucide-react";
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
        <div className="space-y-4">
            {/* Header with Time Filter */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{t("overview")}</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Completion Rate Card */}
                <Card className="p-4 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200/50 dark:border-emerald-900/50 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                {t("completion_rate")}
                            </p>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                {completionRate}%
                            </p>
                        </div>
                        <div className="relative h-12 w-12">
                            {/* Radial Progress */}
                            <svg className="transform -rotate-90" width="48" height="48">
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    className="text-emerald-100 dark:text-emerald-900/30"
                                />
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 20}`}
                                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionRate / 100)}`}
                                    className="text-emerald-500 transition-all duration-500"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {completedTasks.length} / {totalTasks} {t("tasks").toLowerCase()}
                    </p>
                </Card>

                {/* Productivity Velocity Card */}
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900 border-blue-200/50 dark:border-blue-900/50 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                {t("productivity")}
                            </p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {completedTasks.length}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        velocityChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                        {velocityChange >= 0 ? "↑" : "↓"} {Math.abs(velocityChange)}% {
                            timeFilter === "today" ? t("vs_yesterday") :
                                timeFilter === "week" ? t("vs_last_week") :
                                    t("vs_last_month")
                        }
                    </p>
                </Card>

                {/* Time Focus Card (Real Data) */}
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-slate-900 border-purple-200/50 dark:border-purple-900/50 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                {t("focus_time")}
                            </p>
                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                {(() => {
                                    const totalSeconds = completedTasks.reduce((acc, t) => acc + (t.totalTimeSpent || 0), 0);
                                    const hours = (totalSeconds / 3600).toFixed(1);
                                    return `${hours}h`;
                                })()}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {(() => {
                            const totalSeconds = completedTasks.reduce((acc, t) => acc + (t.totalTimeSpent || 0), 0);
                            const avgMinutes = completedTasks.length > 0 ? Math.round((totalSeconds / 60) / completedTasks.length) : 0;
                            return `~${avgMinutes} ${t("minutes_per_task")}`;
                        })()}
                    </p>
                </Card>

                {/* Streak Card */}
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-slate-900 border-orange-200/50 dark:border-orange-900/50 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                {t("streak")}
                            </p>
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                                {streak}
                                <Flame className="h-6 w-6 text-orange-500" />
                            </p>
                        </div>
                        <div className="text-4xl">
                            🔥
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {streak > 0 ? t("keep_it_up") : t("start_streak")}
                    </p>
                </Card>
            </div>
        </div>
    );
}
