"use client";

import { CheckCircle2, Circle, LayoutList, Target } from "lucide-react";
import { type Task, type Goal } from "@/lib/firebase/firestore";
import { useLanguage } from "@/components/shared/language-context";

interface TasksMetricsProps {
    tasks: Task[];
    goals: Goal[];
}

export function TasksMetrics({ tasks = [], goals = [] }: TasksMetricsProps) {
    const { t } = useLanguage();

    const activeTasks = tasks.filter((t) => !t.completed).length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const totalTasks = tasks.length;
    const completionRate =
        totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const activeGoals = goals.filter((g) => (g.progress || 0) < 100).length;
    const totalGoals = goals.length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Active Tasks Block */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <LayoutList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {activeTasks}
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("active_tasks") || "Active Tasks"}
                    </p>
                </div>
            </div>

            {/* Active Goals Block */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                    <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {activeGoals}
                        </span>
                        <span className="text-xs text-slate-400">
                            / {totalGoals} Total
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("active_goals") || "Active Goals"}
                    </p>
                </div>
            </div>

            {/* Completion Rate Block */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {completionRate}%
                        </span>
                        <span className="text-xs text-slate-400">
                            ({completedTasks} finished)
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("completion_rate") || "Completion Rate"}
                    </p>
                </div>
            </div>
        </div>
    );
}
