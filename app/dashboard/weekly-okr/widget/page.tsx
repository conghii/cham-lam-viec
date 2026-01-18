"use client";

import { useEffect, useState, useRef } from "react";
import { startOfWeek, endOfWeek, getWeek, getYear } from "date-fns";
import {
    ensureWeeklyPlan,
    updateWeeklyObjective,
    subscribeToWeeklyPlan,
    type WeeklyPlan,
    type WeeklyObjective
} from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useLanguage } from "@/components/shared/language-context";

function MiniObjectiveCard({
    objective,
    index,
    onUpdate
}: {
    objective?: WeeklyObjective,
    index: number,
    onUpdate: (data: Partial<WeeklyObjective>) => void
}) {
    const { t } = useLanguage();
    const isCompleted = objective?.status === 'completed';
    const hasMetric = objective?.target !== undefined && objective?.target !== null;

    const handleMetricUpdate = (key: 'target' | 'current' | 'unit', val: any) => {
        const newData = { ...objective, [key]: val };
        if (key === 'current' && newData.target && Number(val) >= Number(newData.target)) {
            newData.status = 'completed';
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } else if (key === 'current' && newData.status === 'completed' && Number(val) < Number(newData.target)) {
            newData.status = 'pending';
        }
        onUpdate(newData);
    };

    const toggleComplete = () => {
        onUpdate({ status: isCompleted ? 'pending' : 'completed' });
        if (!isCompleted) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
    };

    if (!objective?.content) {
        return (
            <Card className="p-4 border-dashed border-2 flex items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/20">
                <span className="text-xs font-medium">#{index + 1} {t("empty")}</span>
            </Card>
        );
    }

    return (
        <Card className={cn(
            "p-3 transition-all relative overflow-hidden group",
            isCompleted ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100" : "bg-white dark:bg-slate-900"
        )}>
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleComplete}
                    className={cn(
                        "rounded-full p-0.5 transition-all shrink-0",
                        isCompleted ? "text-emerald-500" : "text-slate-200 hover:text-emerald-400"
                    )}
                >
                    <CheckCircle2 className={cn("h-5 w-5", isCompleted ? "fill-current" : "")} />
                </button>
                <div className="min-w-0 flex-1">
                    <p className={cn(
                        "text-sm font-bold leading-tight truncate",
                        isCompleted ? "text-emerald-800 dark:text-emerald-100 line-through decoration-emerald-500/50" : "text-slate-800 dark:text-white"
                    )}>
                        {objective.content}
                    </p>
                </div>
            </div>

            {hasMetric && (
                <div className="mt-4 flex flex-col items-center">
                    <div className="relative group/metrics flex items-center justify-center gap-4 w-full px-2 py-1 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">

                        {/* Minus Button - Floating Left */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-all opacity-0 group-hover/metrics:opacity-100"
                            onClick={() => handleMetricUpdate('current', Math.max(0, (objective.current || 0) - 1))}
                        >
                            <Minus className="h-5 w-5" />
                        </Button>

                        <div className="flex flex-col items-center justify-center z-10 -space-y-0.5">
                            {/* Main Number Row */}
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter tabular-nums">
                                    {objective.current || 0}
                                </span>
                                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
                                    / {objective.target || 0}
                                </span>
                            </div>

                            {/* Unit Below */}
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate max-w-[80px]">
                                {objective.unit || "unit"}
                            </span>
                        </div>

                        {/* Plus Button - Floating Right */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-90 transition-all opacity-0 group-hover/metrics:opacity-100"
                            onClick={() => handleMetricUpdate('current', (objective.current || 0) + 1)}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Minimal Progress Line */}
                    <div className="mt-2 w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500", isCompleted ? "bg-emerald-400" : "bg-blue-400/80")}
                            style={{ width: `${Math.min(100, ((objective.current || 0) / (objective.target || 1)) * 100)}%` }}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}

export default function MiniWidgetPage() {
    const { t } = useLanguage();
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date();
        const year = getYear(today);
        const week = getWeek(today, { weekStartsOn: 1 });
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const end = endOfWeek(today, { weekStartsOn: 1 });

        ensureWeeklyPlan(year, week, start, end).then(() => {
            return subscribeToWeeklyPlan(year, week, (updated) => {
                setPlan(updated);
                setLoading(false);
            });
        });
    }, []);

    const handleUpdate = async (index: number, data: Partial<WeeklyObjective>) => {
        if (!plan) return;
        const newObjs = [...(plan.objectives || [])];
        newObjs[index] = { ...newObjs[index], ...data };
        setPlan({ ...plan, objectives: newObjs });
        await updateWeeklyObjective(plan.id, newObjs);
    };

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-black p-3 space-y-3">
            <div className="flex items-center justify-between mb-1">
                <h1 className="text-[10px] uppercase tracking-widest font-black text-slate-400">{t("weekly_pulse_title")}</h1>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">W{plan?.weekNumber}</span>
            </div>

            <div className="space-y-2">
                {loading ? (
                    [0, 1, 2].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg" />)
                ) : (
                    [0, 1, 2].map(i => (
                        <MiniObjectiveCard
                            key={i}
                            index={i}
                            objective={plan?.objectives?.[i]}
                            onUpdate={(data) => handleUpdate(i, data)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
