"use client";

import { useState } from "react";
import { format, subDays, addDays } from "date-fns";
import { Activity } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";
import { useHabits, ICON_MAP } from "@/components/dashboard/habit-context";
import { getDailyCompletion } from "./habit-utils";

export function HabitHeatmap() {
    const { t } = useLanguage();
    const { habits } = useHabits();
    const [heatmapHabitId, setHeatmapHabitId] = useState<string>("all");

    return (
        <TooltipProvider>
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
                                    const stats = getDailyCompletion(habits, date, heatmapHabitId === 'all' ? undefined : heatmapHabitId);
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
        </TooltipProvider>
    );
}
