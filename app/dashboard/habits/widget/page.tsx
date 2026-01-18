"use client";

import { useHabits, ICON_MAP } from "@/components/dashboard/habit-context";
import { format, getDay, isSameDay } from "date-fns";
import { Check, Flame, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";

export default function HabitsWidgetPage() {
    const { t } = useLanguage();
    const { habits, toggleHabit } = useHabits();
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const dayOfWeek = getDay(today);

    // Filter habits scheduled for today
    const activeHabits = habits.filter(h => h.frequency.includes(dayOfWeek));

    const completedCount = activeHabits.filter(h => h.history[todayStr]).length;
    const progress = activeHabits.length > 0 ? (completedCount / activeHabits.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-black p-4 flex flex-col font-sans">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-500 rounded-lg p-1.5 shadow-sm shadow-emerald-200">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-xs font-black uppercase tracking-widest text-slate-400">{t("habits_title")}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">
                            {completedCount}/{activeHabits.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today&apos;s Goal</span>
                    <span className="text-[10px] font-black text-emerald-500">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-3 pb-4">
                    {activeHabits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 border-dashed">
                            <div className="text-4xl mb-3 opacity-50">☀️</div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("no_habits_today")}</p>
                        </div>
                    ) : (
                        activeHabits.map((habit) => {
                            const isCompleted = !!habit.history[todayStr];
                            const Icon = ICON_MAP[habit.icon] || Sparkles;

                            return (
                                <div
                                    key={habit.id}
                                    className={cn(
                                        "group flex items-center justify-between p-4 rounded-[28px] border transition-all duration-300",
                                        isCompleted
                                            ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30"
                                            : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                            isCompleted ? "bg-emerald-500 text-white rotate-[360deg] scale-110 shadow-lg shadow-emerald-200" : "bg-slate-50 text-slate-400 dark:bg-slate-800"
                                        )}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className={cn(
                                                "text-sm font-black tracking-tight transition-all",
                                                isCompleted ? "text-emerald-900 dark:text-emerald-100 opacity-60 line-through" : "text-slate-800 dark:text-white"
                                            )}>
                                                {habit.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex items-center gap-1">
                                                    <Flame className={cn("w-3 h-3", habit.streak > 0 ? "text-orange-500 fill-orange-500" : "text-slate-300")} />
                                                    <span className="text-[10px] font-bold text-slate-400">{habit.streak} {t("days")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggleHabit(habit.id, today)}
                                        className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                                            isCompleted
                                                ? "bg-emerald-100 text-emerald-600"
                                                : "border-2 border-emerald-400/30 text-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100 transition-colors"
                                        )}
                                    >
                                        <Check className={cn("w-5 h-5 transition-transform", isCompleted ? "scale-100" : "scale-0")} strokeWidth={4} />
                                        {!isCompleted && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            <div className="pt-2">
                <Button
                    variant="outline"
                    className="w-full h-12 rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 dark:hover:border-emerald-900 transition-all font-bold text-xs gap-2"
                    onClick={() => window.open('/dashboard/habits', '_blank')}
                >
                    <Plus className="w-4 h-4" />
                    {t("add_habit_btn")}
                </Button>
            </div>
        </div>
    );
}
