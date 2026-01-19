"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { addDays, format, isSameDay } from "date-fns"
import { Droplets, Activity, Footprints, BookOpen, Carrot, Flame, Pill, Target, Zap, Heart } from "lucide-react"
import { auth } from "@/lib/firebase/auth"
import {
    subscribeToHabits,
    createHabit,
    updateHabitDoc,
    deleteHabitDoc,
    type Habit as FirestoreHabit
} from "@/lib/firebase/firestore"

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

// Use the type from firestore but export it as Habit for compatibility
export type Habit = FirestoreHabit;

interface HabitContextType {
    habits: Habit[];
    addHabit: (habit: Omit<Habit, "id" | "userId" | "createdAt" | "history" | "streak" | "completed" | "color" | "iconColor">) => void;
    updateHabit: (id: string, updates: Partial<Habit>) => void;
    deleteHabit: (id: string) => void;
    toggleHabit: (id: string, date: Date) => void;
    loading: boolean;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

export function HabitProvider({ children }: { children: React.ReactNode }) {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(auth.currentUser);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((u) => {
            setUser(u);
            if (!u) {
                setHabits([]);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToHabits(user.uid, (data) => {
            setHabits(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const addHabit = async (habitData: any) => {
        if (!user) return;
        // Construct full habit object
        const newHabit = {
            ...habitData,
            streak: 0,
            completed: false,
            color: "bg-cyan-50 text-cyan-500",
            iconColor: "bg-cyan-100 text-cyan-600",
            history: {}
        };
        await createHabit(user.uid, newHabit);
    };

    const updateHabit = async (id: string, updates: Partial<Habit>) => {
        if (!user) return;
        await updateHabitDoc(user.uid, id, updates);
    };

    const deleteHabit = async (id: string) => {
        if (!user) return;
        await deleteHabitDoc(user.uid, id);
    };

    const toggleHabit = async (id: string, date: Date) => {
        if (!user) return;
        const habit = habits.find(h => h.id === id);
        if (!habit) return;

        const dateStr = format(date, 'yyyy-MM-dd');
        const wasCompleted = !!habit.history[dateStr];
        const newHistory = { ...habit.history };

        if (wasCompleted) {
            delete newHistory[dateStr];
        } else {
            newHistory[dateStr] = true;
        }

        // Calculate streak (basic logic, can be improved server-side or here)
        let newStreak = habit.streak;
        if (isSameDay(date, new Date())) {
            // Recalculating streak accurately requires traversing history backwards.
            // For now, simpler increment/decrement for today's toggle
            if (!wasCompleted) {
                newStreak += 1;
            } else {
                newStreak = Math.max(0, newStreak - 1);
            }
        }

        await updateHabitDoc(user.uid, id, {
            history: newHistory,
            streak: newStreak,
            completed: isSameDay(date, new Date()) ? !wasCompleted : habit.completed
        });
    };

    return (
        <HabitContext.Provider value={{ habits, addHabit, updateHabit, deleteHabit, toggleHabit, loading }}>
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
