"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { addDays, format, isSameDay } from "date-fns"
import { Droplets, Activity, Footprints, BookOpen, Carrot } from "lucide-react"

// Types
export type Habit = {
    id: string;
    name: string;
    icon: any;
    streak: number;
    goal: number;
    unit: string;
    completed: boolean; // "today" status (legacy use mostly)
    color: string;
    iconColor: string;
    frequency: number[]; // 0 for Sunday...
    history: { [dateStr: string]: boolean }; // 'YYYY-MM-DD': true/false
};

// Helper to generate mock history
const generateMockHistory = () => {
    const history: { [key: string]: boolean } = {};
    const today = new Date();
    // Generate for the last 365 days
    for (let i = 0; i < 365; i++) {
        const date = addDays(today, -i);
        history[format(date, 'yyyy-MM-dd')] = Math.random() > 0.4;
    }
    return history;
};

// Initial Mock Data
const INITIAL_HABITS: Habit[] = [
    {
        id: "1",
        name: "Drink Water (2L)",
        icon: Droplets,
        streak: 12,
        goal: 2,
        unit: "L",
        completed: false,
        color: "bg-cyan-50 text-cyan-500",
        iconColor: "bg-cyan-100 text-cyan-600",
        frequency: [0, 1, 2, 3, 4, 5, 6],
        history: generateMockHistory()
    },
    {
        id: "2",
        name: "Meditate (15 min)",
        icon: Activity,
        streak: 5,
        goal: 15,
        unit: "min",
        completed: true,
        color: "bg-purple-50 text-purple-500",
        iconColor: "bg-purple-100 text-purple-600",
        frequency: [1, 2, 3, 4, 5],
        history: generateMockHistory()
    },
    {
        id: "3",
        name: "5km Morning Run",
        icon: Footprints,
        streak: 3,
        goal: 5,
        unit: "km",
        completed: false,
        color: "bg-orange-50 text-orange-500",
        iconColor: "bg-orange-100 text-orange-600",
        frequency: [1, 3, 5],
        history: generateMockHistory()
    },
    {
        id: "4",
        name: "Read 20 Pages",
        icon: BookOpen,
        streak: 20,
        goal: 20,
        unit: "pages",
        completed: true,
        color: "bg-emerald-50 text-emerald-500",
        iconColor: "bg-emerald-100 text-emerald-600",
        frequency: [0, 1, 2, 3, 4, 5, 6],
        history: generateMockHistory()
    }
];

interface HabitContextType {
    habits: Habit[];
    addHabit: (habit: Habit) => void;
    updateHabit: (id: string, updates: Partial<Habit>) => void;
    deleteHabit: (id: string) => void;
    toggleHabit: (id: string, date: Date) => void;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

export function HabitProvider({ children }: { children: React.ReactNode }) {
    const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);

    const addHabit = (habit: Habit) => {
        setHabits(prev => [...prev, habit]);
    };

    const updateHabit = (id: string, updates: Partial<Habit>) => {
        setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    };

    const deleteHabit = (id: string) => {
        setHabits(prev => prev.filter(h => h.id !== id));
    };

    const toggleHabit = (id: string, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setHabits(prev => prev.map(h => {
            if (h.id === id) {
                const wasCompleted = !!h.history[dateStr];
                const newHistory = { ...h.history, [dateStr]: !wasCompleted };

                let newStreak = h.streak;
                if (isSameDay(date, new Date())) {
                    newStreak = !wasCompleted ? h.streak + 1 : Math.max(0, h.streak - 1);
                }

                return {
                    ...h,
                    streak: newStreak,
                    history: newHistory,
                    completed: isSameDay(date, new Date()) ? !wasCompleted : h.completed
                };
            }
            return h;
        }));
    };

    return (
        <HabitContext.Provider value={{ habits, addHabit, updateHabit, deleteHabit, toggleHabit }}>
            {children}
        </HabitContext.Provider>
    );
}

export function useHabits() {
    const context = useContext(HabitContext);
    if (context === undefined) {
        throw new Error("useHabits must be used within a HabitProvider");
    }
    return context;
}
