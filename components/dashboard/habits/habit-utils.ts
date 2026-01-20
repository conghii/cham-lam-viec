import { format, getDay } from "date-fns";
import { Habit } from "@/components/dashboard/habit-context";

export const getDailyCompletion = (habits: Habit[], date: Date, habitId?: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Filter habits that are scheduled for this day
    const dayOfWeek = getDay(date); // 0-6
    let scheduledHabits = habits.filter(h => h.frequency.includes(dayOfWeek));

    if (habitId && habitId !== 'all') {
        scheduledHabits = scheduledHabits.filter(h => h.id === habitId);
    }

    if (scheduledHabits.length === 0) return { rate: 0, count: 0, total: 0 };

    const completedCount = scheduledHabits.filter(h => h.history[dateStr]).length;
    return {
        rate: completedCount / scheduledHabits.length,
        count: completedCount,
        total: scheduledHabits.length
    };
};
