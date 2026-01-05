"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface AiGoalPlannerProps {
    onPlanGenerated: (plan: any) => void;
}

export function AiGoalPlanner({ onPlanGenerated }: AiGoalPlannerProps) {
    const [goal, setGoal] = useState("");
    const [deadline, setDeadline] = useState<Date | undefined>(undefined);
    const [hoursPerDay, setHoursPerDay] = useState([2]);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!goal.trim() || !deadline) {
            alert("Please enter a goal and pick a deadline.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/ai/generate-goal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goal,
                    deadline: deadline.toISOString(),
                    hoursPerDay: hoursPerDay[0]
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate plan");

            onPlanGenerated(data);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-primary/20 shadow-xl bg-gradient-to-br from-card to-secondary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                    <CardTitle className="text-lg">AI Goal Planner</CardTitle>
                </div>
                <CardDescription>
                    Tell me your goal, and I'll break it down into a step-by-step plan.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">What is your main goal?</label>
                    <Input
                        placeholder="e.g., Learn React Native in 2 months"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className="bg-background/80 backdrop-blur"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Desired Deadline</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-background/80 backdrop-blur",
                                    !deadline && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={deadline}
                                onSelect={setDeadline}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between">
                        <label className="text-sm font-medium">Free time per day (hours)</label>
                        <span className="text-sm text-muted-foreground">{hoursPerDay[0]}h</span>
                    </div>
                    <Slider
                        value={hoursPerDay}
                        onValueChange={setHoursPerDay}
                        max={12}
                        step={0.5}
                        className="cursor-pointer"
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full bg-[#1a1b2e] hover:bg-[#2f3146] text-white transition-all shadow-md hover:shadow-lg"
                    onClick={handleGenerate}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Thinking...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Plan
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
