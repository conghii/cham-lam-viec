"use client";

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useHabits } from "@/components/dashboard/habit-context";
import { getDailyCompletion } from "./habit-utils";

interface HabitMonthlyViewProps {
    selectedDate: Date;
}

export function HabitMonthlyView({ selectedDate }: HabitMonthlyViewProps) {
    const { habits } = useHabits();

    const getMonthDays = () => {
        const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    };

    return (
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
                    const { rate, count, total } = getDailyCompletion(habits, day);
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
    );
}
