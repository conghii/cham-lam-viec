"use client";

import { useEffect, useState } from "react";
import { Target, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";
import { useHabits, Habit, ICON_MAP } from "@/components/dashboard/habit-context";

const SUGGESTIONS = [
    { label: "Drink Water", icon: "Droplets", color: "bg-cyan-100 text-cyan-600" },
    { label: "Run", icon: "Activity", color: "bg-cyan-100 text-cyan-600" },
    { label: "Meditate", icon: "Activity", color: "bg-teal-100 text-teal-600" },
    { label: "Read", icon: "BookOpen", color: "bg-cyan-100 text-cyan-600" },
    { label: "Eat Healthy", icon: "Carrot", color: "bg-emerald-100 text-emerald-600" },
];

const DAYS = [
    { label: "S", value: 0 },
    { label: "M", value: 1 },
    { label: "T", value: 2 },
    { label: "W", value: 3 },
    { label: "T", value: 4 },
    { label: "F", value: 5 },
    { label: "S", value: 6 },
];

interface HabitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    habitToEdit: Habit | null;
}

export function HabitDialog({ open, onOpenChange, habitToEdit }: HabitDialogProps) {
    const { t } = useLanguage();
    const { addHabit, updateHabit } = useHabits();

    const [formData, setFormData] = useState({
        name: "",
        goal: "1",
        unit: "times",
        frequency: [0, 1, 2, 3, 4, 5, 6] as number[],
        icon: "Activity"
    });

    useEffect(() => {
        if (open) {
            if (habitToEdit) {
                setFormData({
                    name: habitToEdit.name,
                    goal: habitToEdit.goal.toString(),
                    unit: habitToEdit.unit,
                    frequency: habitToEdit.frequency,
                    icon: habitToEdit.icon
                });
            } else {
                setFormData({
                    name: "",
                    goal: "1",
                    unit: "times",
                    frequency: [0, 1, 2, 3, 4, 5, 6],
                    icon: "Activity"
                });
            }
        }
    }, [open, habitToEdit]);

    const handleSuggestionClick = (suggestion: typeof SUGGESTIONS[0]) => {
        setFormData(prev => ({
            ...prev,
            name: suggestion.label,
            icon: suggestion.icon
        }));
    };

    const toggleDay = (dayValue: number) => {
        setFormData(prev => {
            const exists = prev.frequency.includes(dayValue);
            if (exists) {
                if (prev.frequency.length === 1) return prev;
                return { ...prev, frequency: prev.frequency.filter(d => d !== dayValue) };
            } else {
                return { ...prev, frequency: [...prev.frequency, dayValue].sort() };
            }
        });
    };

    const handleSave = () => {
        if (!formData.name) return;

        if (habitToEdit) {
            updateHabit(habitToEdit.id, {
                name: formData.name,
                goal: parseInt(formData.goal) || 1,
                unit: formData.unit,
                frequency: formData.frequency,
                icon: formData.icon
            });
        } else {
            addHabit({
                name: formData.name,
                icon: formData.icon,
                goal: parseInt(formData.goal) || 1,
                unit: formData.unit,
                frequency: formData.frequency,
            });
        }
        onOpenChange(false);
    };

    const isEveryday = formData.frequency.length === 7;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[32px] p-0 overflow-hidden bg-white border-none shadow-2xl">
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        <Target className="h-6 w-6 text-emerald-500" />
                        {habitToEdit ? t("edit_habit_dialog") : t("new_habit_dialog")}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    {/* Name Input */}
                    <div className="space-y-3">
                        <Label className="uppercase text-xs font-bold text-gray-400 tracking-wider">{t("habit_name_label")}</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Drink Water..."
                            className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-emerald-200 transition-all font-bold text-lg"
                        />
                        {/* Quick Suggestions */}
                        {!habitToEdit && <div className="flex flex-wrap gap-2 pt-1">
                            {SUGGESTIONS.map((s) => {
                                const Icon = ICON_MAP[s.icon] || Activity;
                                return (
                                    <button
                                        key={s.label}
                                        type="button"
                                        onClick={() => handleSuggestionClick(s)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95",
                                            s.color
                                        )}
                                    >
                                        <Icon className="h-3 w-3" />
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>}
                    </div>

                    {/* Goal & Unit Input Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label className="uppercase text-xs font-bold text-gray-400 tracking-wider">{t("goal_label")}</Label>
                            <Input
                                type="number"
                                value={formData.goal}
                                onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                                placeholder="e.g. 5"
                                className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-emerald-200 transition-all font-bold text-lg"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="uppercase text-xs font-bold text-gray-400 tracking-wider">{t("unit_label")}</Label>
                            <Input
                                value={formData.unit}
                                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                placeholder="e.g. mins"
                                className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white focus:border-emerald-200 transition-all font-bold text-lg"
                            />
                        </div>
                    </div>


                    {/* Frequency Selector */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="uppercase text-xs font-bold text-gray-400 tracking-wider">{t("frequency_label")}</Label>
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">
                                {isEveryday ? t("everyday") : `${formData.frequency.length} ${t("days_week")}`}
                            </span>
                        </div>
                        <div className="flex justify-between gap-1">
                            {DAYS.map((day) => {
                                const isSelected = formData.frequency.includes(day.value);
                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleDay(day.value)}
                                        className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300",
                                            isSelected
                                                ? "bg-emerald-400 text-white shadow-lg shadow-emerald-200"
                                                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                        )}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>

                <div className="p-8 pt-0 flex gap-3">
                    <Button onClick={() => onOpenChange(false)} variant="ghost" className="flex-1 h-12 rounded-xl font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-50">
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSave} className="flex-[2] h-12 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white font-bold text-lg shadow-xl shadow-emerald-200/50">
                        {habitToEdit ? t("save_changes") : t("create_habit")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
