"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Circle } from "lucide-react"

export interface Phase {
    id: number
    title: string
    duration: string
    tasks: string[]
}

interface PlannerTimelineProps {
    plan: Phase[]
    onCommit: () => void
}

export function PlannerTimeline({ plan, onCommit }: PlannerTimelineProps) {
    return (
        <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Your Generated Plan</h3>
                <Button onClick={onCommit} variant="default">Save Plan to Dashboard</Button>
            </div>

            <div className="relative space-y-8 pl-8 before:absolute before:item-left before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-border">
                {plan.map((phase, index) => (
                    <div key={phase.id} className="relative">
                        <div className="absolute -left-[29px] top-1 h-6 w-6 rounded-full border bg-background flex items-center justify-center">
                            <span className="text-xs font-bold">{index + 1}</span>
                        </div>

                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{phase.title}</CardTitle>
                                    <Badge variant="secondary">{phase.duration}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {phase.tasks.map((task, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <Circle className="mt-1 h-3 w-3 shrink-0" />
                                        <span>{task}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    )
}
