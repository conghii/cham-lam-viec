"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { addDays, format, isSameDay } from "date-fns"
import { Droplets, Activity, Footprints, BookOpen, Carrot, Flame, Pill, Target, Zap, Heart } from "lucide-react"

// Icon Mapping
export const ICON_MAP: { [key: string]: any } = {
    "Droplets": Droplets,
    "Activity": Activity,
    "Footprints": Footprints,
    "BookOpen": BookOpen,
    "Carrot": Carrot,
    "Flame": Flame,
    "Pill": Pill,
    "Target": Target,
    "Zap": Zap,
    "Heart": Heart
};

// Types
export type Habit = {
    id: string;
    name: string;
    icon: string; // Changed from any (component) to string (name)
    streak: number;
    goal: number;
    unit: string;
    completed: boolean; // "today" status (legacy use mostly)
    color: string;
    iconColor: string;
    frequency: number[]; // 0 for Sunday...
    history: { [dateStr: string]: boolean }; // 'YYYY-MM-DD': true/false
};

// Initial Mock Data Removed

interface HabitContextType {
    habits: Habit[];
    addHabit: (habit: Habit) => void;
    updateHabit: (id: string, updates: Partial<Habit>) => void;
    deleteHabit: (id: string) => void;
    toggleHabit: (id: string, date: Date) => void;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

const STORAGE_KEY = 'chamlam_habits';

export function HabitProvider({ children }: { children: React.ReactNode }) {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Basic validation could go here
                setHabits(parsed);
            }
        } catch (error) {
            console.error('Failed to load habits from storage:', error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save to localStorage whenever habits change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
        }
    }, [habits, isLoaded]);

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

    // Don't render until loaded to prevent hydration mismatch if we were using server-side rendering
    // or just to avoid flashing defaults (though we default to empty now)
    if (!isLoaded) {
        return null; // Or a loading spinner
    }

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
