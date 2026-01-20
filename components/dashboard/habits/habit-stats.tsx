"use client";

import { useLanguage } from "@/components/shared/language-context";
import { useHabits } from "@/components/dashboard/habit-context";
import { Flame, Activity } from "lucide-react";

export function HabitStats() {
    const { t } = useLanguage();
    const { habits } = useHabits();

    // Stats Calculations
    const totalPossible = habits.length * 7; // Weekly approximation? Original code used this.
    const totalCompleted = habits.reduce((acc, h) => {
        return acc + Object.values(h.history).filter(Boolean).length;
    }, 0);
    // Note: completionRate in original was based on habits.length * 365. Let's keep it consistent.
    const completionRate = (habits.length > 0) ? Math.round((totalCompleted / (habits.length * 365)) * 100) : 0;
    const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak), 0) : 0;
    const dailyAverage = (totalCompleted / 365).toFixed(1);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 px-4">
            {/* Completion Rate */}
            <div className="bg-white rounded-2xl md:rounded-[32px] p-4 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden group">
                <div className="w-full">
                    <div className="flex justify-between w-full md:block mb-2 md:mb-0">
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-0 md:mb-2">{t("completion_rate")}</p>
                        <div className="md:hidden h-8 w-8 rounded-full border-[3px] border-emerald-400 border-t-emerald-100 flex-shrink-0"></div>
                    </div>
                    <div className="flex items-baseline gap-2 md:gap-3">
                        <span className="text-2xl md:text-4xl font-extrabold text-gray-900">{completionRate}%</span>
                        <span className="text-[10px] md:text-sm font-bold text-emerald-500 bg-emerald-50 px-1.5 md:px-2 py-0.5 rounded-full whitespace-nowrap">~12%</span>
                    </div>
                </div>
                <div className="hidden md:block h-12 w-12 rounded-full border-[6px] border-emerald-400 border-t-emerald-100 animate-spin-slow"></div>
            </div>

            {/* Longest Streak */}
            <div className="bg-white rounded-2xl md:rounded-[32px] p-4 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between">
                <div className="w-full">
                    <div className="flex justify-between w-full md:block mb-2 md:mb-0">
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-0 md:mb-2">{t("longest_streak")}</p>
                        <Flame className="h-5 w-5 text-orange-500 fill-orange-500 md:hidden" />
                    </div>
                    <div className="flex items-baseline gap-2 md:gap-3">
                        <span className="text-2xl md:text-4xl font-extrabold text-gray-900 whitespace-nowrap">{bestStreak} <span className="text-sm md:text-xl font-medium text-gray-400">{t("days")}</span></span>
                    </div>
                </div>
                <Flame className="hidden md:block h-8 w-8 text-orange-500 fill-orange-500" />
            </div>

            {/* Daily Average */}
            <div className="bg-white rounded-2xl md:rounded-[32px] p-4 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between col-span-2 md:col-span-1">
                <div className="w-full">
                    <div className="flex justify-between w-full md:block mb-2 md:mb-0">
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-0 md:mb-2">{t("daily_average")}</p>
                        <Activity className="h-5 w-5 text-blue-500 md:hidden" />
                    </div>
                    <div className="flex items-baseline gap-2 md:gap-3">
                        <span className="text-2xl md:text-4xl font-extrabold text-gray-900">{dailyAverage}</span>
                        <span className="text-[10px] md:text-sm font-medium text-gray-400 truncate max-w-[80px] md:max-w-none">{t("habits_count")}</span>
                    </div>
                </div>
                <Activity className="hidden md:block h-8 w-8 text-blue-500" />
            </div>
        </div>
    );
}
