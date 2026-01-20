"use client";

import { format, getDay } from "date-fns";
import { Activity, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";
import { useHabits, ICON_MAP } from "@/components/dashboard/habit-context";

export function HabitTodayView() {
    const { t } = useLanguage();
    const { habits, toggleHabit } = useHabits();

    const todayHabits = habits
        .filter(h => h.frequency.includes(getDay(new Date()))) // Filter for today
        .sort((a, b) => {
            const aDone = !!a.history[format(new Date(), 'yyyy-MM-dd')];
            const bDone = !!b.history[format(new Date(), 'yyyy-MM-dd')];
            return Number(aDone) - Number(bDone); // Incomplete first
        });

    return (
        <div className="bg-white rounded-[40px] shadow-sm p-4 md:p-8 max-w-3xl mx-auto">
            <div className="space-y-4">
                {todayHabits.map(habit => {
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
                {todayHabits.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <p>{t("no_habits_today")}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
