"use client";

import { format, addDays, startOfWeek } from "date-fns";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";

type ViewMode = 'weekly' | 'monthly' | 'annual' | 'today';

interface HabitHeaderProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    selectedDate: Date;
    setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
}

export function HabitHeader({ viewMode, setViewMode, selectedDate, setSelectedDate }: HabitHeaderProps) {
    const { t } = useLanguage();
    const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });

    const handlePrev = () => {
        setSelectedDate(curr => addDays(curr, viewMode === 'monthly' ? -30 : -7));
    };

    const handleNext = () => {
        setSelectedDate(curr => addDays(curr, viewMode === 'monthly' ? 30 : 7));
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 px-4">
            <div className="w-full md:w-auto">
                <div className="flex items-center justify-between md:justify-start gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    <button
                        className="hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        onClick={handlePrev}
                    >
                        &lt;
                    </button>
                    <span>{format(selectedDate, "MMMM yyyy")}</span>
                    <button
                        className="hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        onClick={handleNext}
                    >
                        &gt;
                    </button>
                </div>
                <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 truncate">
                    {viewMode === 'weekly' && `${format(startOfCurrentWeek, "MMM d")} — ${format(addDays(startOfCurrentWeek, 6), "MMM d")}`}
                    {viewMode === 'monthly' && format(selectedDate, "MMMM yyyy")}
                    {viewMode === 'annual' && t("past_365_days")}
                    {viewMode === 'today' && t("todays_focus")}
                </h1>
                <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium hidden md:block">{t("visualization_desc")}</p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-hidden">
                <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-gray-400 hover:text-gray-600 font-bold text-[10px] uppercase tracking-widest gap-2 bg-white rounded-full shadow-sm border border-gray-100 px-3 md:px-4 h-9 md:h-11"
                    onClick={() => window.open('/dashboard/habits/widget', 'HabitsWidget', 'width=380,height=600')}
                >
                    <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Mini Widget</span>
                </Button>

                <div className="bg-white rounded-full p-1 shadow-sm border border-gray-100 flex items-center overflow-x-auto no-scrollbar flex-1 md:flex-none">
                    <button
                        onClick={() => setViewMode('weekly')}
                        className={cn("px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold transition-all whitespace-nowrap", viewMode === 'weekly' ? "bg-emerald-400 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50")}
                    >
                        {t("weekly_matrix")}
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={cn("px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all whitespace-nowrap", viewMode === 'monthly' ? "bg-emerald-400 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50")}
                    >
                        {t("monthly_view")}
                    </button>
                    <button
                        onClick={() => setViewMode('annual')}
                        className={cn("px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all whitespace-nowrap", viewMode === 'annual' ? "bg-emerald-400 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50")}
                    >
                        {t("annual_heatmap")}
                    </button>
                    <div className="w-px h-3 md:h-4 bg-gray-200 mx-1 shrink-0"></div>
                    <button
                        onClick={() => setViewMode('today')}
                        className={cn("px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all whitespace-nowrap", viewMode === 'today' ? "bg-emerald-400 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50")}
                    >
                        {t("today")}
                    </button>
                </div>
            </div>
        </div>
    );
}
