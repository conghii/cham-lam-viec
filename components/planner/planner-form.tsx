"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PlannerFormProps {
    onPlanGenerate: (data: any) => void
    isGenerating: boolean
}

export function PlannerForm({ onPlanGenerate, isGenerating }: PlannerFormProps) {
    const [goal, setGoal] = useState("")
    const [date, setDate] = useState<Date>()
    const [freeTime, setFreeTime] = useState([2])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onPlanGenerate({ goal, date, freeTime: freeTime[0] })
    }

    return (
        <Card className="mx-auto max-w-2xl bg-secondary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI Goal Planner
                </CardTitle>
                <CardDescription>
                    Tell me your goal, and I'll break it down into a step-by-step plan.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="goal">What is your main goal?</Label>
                        <Input
                            id="goal"
                            placeholder="e.g., Learn React Native in 2 months"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Desired Deadline</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Free time per day (hours)</Label>
                            <span className="font-mono text-sm">{freeTime[0]}h</span>
                        </div>
                        <Slider
                            defaultValue={[2]}
                            max={12}
                            step={1}
                            value={freeTime}
                            onValueChange={setFreeTime}
                        />
                    </div>

                    <Button type="submit" className="w-full gap-2" disabled={isGenerating}>
                        {isGenerating ? "Generating Plan..." : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate Plan
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
