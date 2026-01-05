"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { ProofOfWorkDialog } from "@/components/dashboard/proof-of-work-dialog"
import { subscribeToTasks, toggleTaskCompletion, type Task } from "@/lib/firebase/firestore"
import Link from "next/link"

const tagColors: Record<string, string> = {
    coding: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
    learning: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    writing: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
    general: "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20",
}

export function TaskList() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)

    useEffect(() => {
        const unsubscribe = subscribeToTasks((data) => {
            // Show only top 5 tasks for widget
            setTasks(data.slice(0, 5))
        })
        return () => unsubscribe()
    }, [])

    const handleCheck = async (taskId: string, checked: boolean, task: Task) => {
        if (checked && (task.tag === 'learning' || task.tag === 'reading')) {
            // Trigger Proof of Work
            setSelectedTask(task)
            setDialogOpen(true)
            // Don't toggle yet
        } else {
            // Toggle immediately
            await toggleTaskCompletion(taskId, task.completed)
        }
    }

    const handleProofComplete = async (note: string) => {
        console.log("Proof of work saved:", note)
        if (selectedTask) {
            await toggleTaskCompletion(selectedTask.id, selectedTask.completed)
            // Ideally we save the note to a separate collection or field
        }
    }

    return (
        <>
            <Card className="col-span-1 md:col-span-2 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Today&apos;s Tasks</CardTitle>
                    <Link href="/dashboard/tasks">
                        <Button size="sm" variant="outline">View All</Button>
                    </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                    {tasks.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-4">
                            No tasks for today.
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="group flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-secondary/50">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id={`task-${task.id}`}
                                        checked={task.completed}
                                        onCheckedChange={(checked) => handleCheck(task.id, checked as boolean, task)}
                                    />
                                    <div className="space-y-1">
                                        <label
                                            htmlFor={`task-${task.id}`}
                                            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.completed ? "text-muted-foreground line-through opacity-50" : ""}`}
                                        >
                                            {task.title}
                                        </label>
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className={tagColors[task.tag || 'general']}>
                                                {task.tag || 'general'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                {!task.completed && (
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary">
                                        <Play className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )))}
                </CardContent>
            </Card>

            <ProofOfWorkDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                taskTitle={selectedTask?.title || ""}
                onComplete={handleProofComplete}
            />
        </>
    )
}
