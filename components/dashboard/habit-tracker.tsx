"use client";

import { useState } from "react";
import { addDays, startOfWeek } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLanguage } from "@/components/shared/language-context";
import { useHabits, type Habit } from "@/components/dashboard/habit-context";

import { HabitHeader } from "@/components/dashboard/habits/habit-header";
import { HabitStats } from "@/components/dashboard/habits/habit-stats";
import { HabitMatrix } from "@/components/dashboard/habits/habit-matrix";
import { HabitMonthlyView } from "@/components/dashboard/habits/habit-monthly-view";
import { HabitHeatmap } from "@/components/dashboard/habits/habit-heatmap";
import { HabitTodayView } from "@/components/dashboard/habits/habit-today-view";
import { HabitDialog } from "@/components/dashboard/habits/habit-dialog";

type ViewMode = 'weekly' | 'monthly' | 'annual' | 'today';

export function HabitTracker() {
    const { t } = useLanguage();
    const { deleteHabit } = useHabits();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

    // Calendar Generation for Matrix
    const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

    // Actions
    const handleDelete = (id: string) => {
        deleteHabit(id);
    };

    const handleEdit = (habit: Habit) => {
        setEditingHabit(habit);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingHabit(null);
        setIsDialogOpen(true);
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-[#F8FAFC] p-0 font-sans text-gray-900 space-y-6">

                <HabitHeader
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                />

                <HabitStats />

                {/* Matrix Table (Only show if viewMode is weekly) */}
                {viewMode === 'weekly' && (
                    <HabitMatrix
                        weekDays={weekDays}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}

                {/* Monthly View */}
                {viewMode === 'monthly' && (
                    <HabitMonthlyView selectedDate={selectedDate} />
                )}

                {/* Annual Heatmap */}
                {viewMode === 'annual' && (
                    <HabitHeatmap />
                )}

                {/* Today View */}
                {viewMode === 'today' && (
                    <HabitTodayView />
                )}

                {/* Bottom Action */}
                <div className="flex justify-center pt-8 pb-12">
                    <Button
                        size="lg"
                        className="h-14 px-8 rounded-full bg-emerald-400 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-200/50 text-lg font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                        onClick={handleAddNew}
                    >
                        <Plus className="h-6 w-6" strokeWidth={3} />
                        {t("add_habit_btn")}
                    </Button>
                </div>

                <HabitDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    habitToEdit={editingHabit}
                />
            </div>
        </TooltipProvider>
    );
}
