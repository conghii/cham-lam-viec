"use client";

import { format, isSameDay } from "date-fns";
import { Check, MoreVertical, Edit2, Trash2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";
import { useHabits, Habit, ICON_MAP } from "@/components/dashboard/habit-context";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HabitMatrixProps {
    weekDays: Date[];
    onEdit: (habit: Habit) => void;
    onDelete: (id: string) => void;
}

export function HabitMatrix({ weekDays, onEdit, onDelete }: HabitMatrixProps) {
    const { t } = useLanguage();
    const { habits, toggleHabit } = useHabits();

    return (
        <div className="bg-white rounded-[40px] shadow-sm p-4 overflow-hidden mx-4 pb-8">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] md:min-w-[800px]">
                    <thead>
                        <tr className="border-b border-gray-50">
                            <th className="text-left py-3 px-2 md:py-6 md:px-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider w-[140px] md:w-[250px]">{t("habit_name")}</th>
                            {weekDays.map((date, i) => {
                                const isTodayVal = isSameDay(date, new Date());
                                return (
                                    <th key={i} className="text-center py-3 px-1 md:py-6 md:px-2">
                                        <div className={cn(
                                            "flex flex-col items-center gap-1",
                                            isTodayVal ? "text-emerald-500" : "text-gray-400"
                                        )}>
                                            {/* Desktop Date */}
                                            <span className="hidden md:inline text-[10px] font-bold uppercase">{format(date, "EEE")} {format(date, "d")}</span>
                                            {/* Mobile Compact Date */}
                                            <span className="md:hidden text-[10px] font-bold uppercase">{format(date, "EEE")[0]} {format(date, "d")}</span>

                                            {isTodayVal && <span className="text-[8px] md:text-[9px] font-extrabold bg-emerald-100 px-1 md:px-1.5 rounded text-emerald-600">{t("today").toUpperCase()}</span>}
                                        </div>
                                    </th>
                                );
                            })}
                            <th className="text-right py-3 px-2 md:py-6 md:px-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider w-[80px] md:w-[100px]">{t("score")}</th>
                            <th className="py-3 px-1 md:py-6 md:px-4 w-[40px] md:w-[50px]" />
                        </tr>
                    </thead>
                    <tbody>
                        {habits.map((habit) => {
                            // Calculate weekly score for this habit
                            const weeklyCompleted = weekDays.filter(d => habit.history[format(d, 'yyyy-MM-dd')]).length;
                            const weeklyTarget = weekDays.filter(d => habit.frequency.includes(d.getDay())).length || 7;
                            const scoreColor = (weeklyCompleted / weeklyTarget) === 1 ? "bg-emerald-400" : "bg-emerald-400"; // Can vary based on logic

                            return (
                                <tr key={habit.id} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 border-dashed">
                                    <td className="py-3 px-2 md:py-6 md:px-4">
                                        <div className="flex items-center gap-2 md:gap-4">
                                            <div className={cn("h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center bg-gray-50 shrink-0", habit.iconColor && "bg-opacity-20")}>
                                                {(() => {
                                                    const IconComponent = ICON_MAP[habit.icon] || Activity;
                                                    return <IconComponent className={cn("h-4 w-4 md:h-5 md:w-5", habit.color?.split(' ')[1] || "text-gray-500")} />;
                                                })()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-800 text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{habit.name}</p>
                                                {habit.goal > 0 && <p className="text-[10px] md:text-xs text-gray-400 font-medium truncate">{habit.goal} {habit.unit}</p>}
                                            </div>
                                        </div>
                                    </td>

                                    {weekDays.map((date, i) => {
                                        const dateStr = format(date, 'yyyy-MM-dd');
                                        const isCompleted = !!habit.history[dateStr];
                                        const isTodayVal = isSameDay(date, new Date());
                                        const dayOfWeek = date.getDay();
                                        const isScheduled = habit.frequency.includes(dayOfWeek);

                                        return (
                                            <td key={i} className="py-3 px-1 md:py-4 md:px-2 text-center">
                                                <div className="flex justify-center">
                                                    {!isScheduled ? (
                                                        <span className="text-gray-200 text-sm md:text-2xl font-light">-</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => toggleHabit(habit.id, date)}
                                                            className={cn(
                                                                "h-7 w-7 md:h-10 md:w-10 rounded-full flex items-center justify-center transition-all duration-300",
                                                                isCompleted
                                                                    ? "bg-emerald-400 shadow-lg shadow-emerald-200 scale-100"
                                                                    : isTodayVal
                                                                        ? "border-2 border-dashed border-emerald-400 bg-emerald-50 animate-pulse"
                                                                        : "border border-gray-200 hover:border-emerald-200"
                                                            )}
                                                        >
                                                            {isCompleted && <Check className="h-4 w-4 md:h-5 md:w-5 text-white" strokeWidth={3} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}

                                    <td className="py-3 px-2 md:py-6 md:px-4">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] md:text-xs font-bold text-gray-900">{weeklyCompleted}/{weeklyTarget}</span>
                                            <div className="h-1 md:h-1.5 w-16 md:w-24 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", scoreColor)}
                                                    style={{ width: `${Math.min(100, (weeklyCompleted / weeklyTarget) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-3 px-2 md:py-6 md:px-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-6 w-6 md:h-8 md:w-8 p-0 rounded-full hover:bg-gray-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onEdit(habit)}>
                                                    <Edit2 className="mr-2 h-4 w-4" /> {t("edit_habit")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(habit.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> {t("delete_habit")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
