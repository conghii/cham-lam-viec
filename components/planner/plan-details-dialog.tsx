"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SavedPlan, PlanPhase, updatePlan, addBatchTasks } from "@/lib/firebase/firestore"
import { Loader2, Plus, ArrowRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlanDetailsDialogProps {
    plan: SavedPlan | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function PlanDetailsDialog({ plan, open, onOpenChange }: PlanDetailsDialogProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState("")
    const [phases, setPhases] = useState<PlanPhase[]>([])
    const [loading, setLoading] = useState(false)
    const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (plan) {
            setTitle(plan.title)
            // Deep copy to avoid mutating props
            setPhases(JSON.parse(JSON.stringify(plan.phases)))
            setAddedTasks(new Set()) // Reset added state on new plan open
        }
    }, [plan, open])

    const handleSave = async () => {
        if (!plan) return
        setLoading(true)
        try {
            await updatePlan(plan.id, title, phases)
            setIsEditing(false)
        } catch (error) {
            console.error("Failed to update plan", error)
        } finally {
            setLoading(false)
        }
    }

    const handleTaskChange = (phaseIndex: number, taskIndex: number, newValue: string) => {
        const newPhases = [...phases]
        newPhases[phaseIndex].tasks[taskIndex] = newValue
        setPhases(newPhases)
    }

    const handlePhaseTitleChange = (phaseIndex: number, newValue: string) => {
        const newPhases = [...phases]
        newPhases[phaseIndex].title = newValue
        setPhases(newPhases)
    }

    const handleAddToBacklog = async (task: string, id: string) => {
        if (addedTasks.has(id)) return

        try {
            await addBatchTasks([{ title: task }])
            setAddedTasks(prev => new Set(prev).add(id))
        } catch (error) {
            console.error("Failed to add task", error)
        }
    }

    const handleAddAllPhaseToBacklog = async (phase: PlanPhase) => {
        const tasksToAdd = phase.tasks.filter((_, idx) => !addedTasks.has(`${phase.id}-${idx}`))
        if (tasksToAdd.length === 0) return

        setLoading(true)
        try {
            await addBatchTasks(tasksToAdd.map(t => ({ title: t })))

            setAddedTasks(prev => {
                const next = new Set(prev)
                phase.tasks.forEach((_, idx) => next.add(`${phase.id}-${idx}`))
                return next
            })
        } catch (error) {
            console.error("Failed to batch add tasks", error)
        } finally {
            setLoading(false)
        }
    }

    if (!plan) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        {isEditing ? (
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-xl font-bold h-auto py-1 px-2 -ml-2"
                            />
                        ) : (
                            <DialogTitle className="text-2xl">{title}</DialogTitle>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? "Cancel" : "Edit Plan"}
                        </Button>
                    </div>
                    <DialogDescription>
                        {plan.phases.reduce((acc, p) => acc + p.tasks.length, 0)} tasks across {plan.phases.length} phases.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-8">
                        {phases.map((phase, pIdx) => (
                            <div key={phase.id} className="relative pl-6 border-l-2 border-primary/20 space-y-3">
                                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />

                                <div className="flex items-center justify-between group/phase">
                                    <div className="space-y-1">
                                        {isEditing ? (
                                            <Input
                                                value={phase.title}
                                                onChange={(e) => handlePhaseTitleChange(pIdx, e.target.value)}
                                                className="font-semibold h-8"
                                            />
                                        ) : (
                                            <h4 className="font-semibold text-lg">{phase.title}</h4>
                                        )}
                                        <div className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded w-fit">
                                            {phase.duration}
                                        </div>
                                    </div>
                                    {!isEditing && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="opacity-0 group-hover/phase:opacity-100 transition-opacity h-7 text-xs"
                                            onClick={() => handleAddAllPhaseToBacklog(phase)}
                                            disabled={loading}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Phase Tasks
                                        </Button>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    {phase.tasks.map((task, tIdx) => {
                                        const taskId = `${phase.id}-${tIdx}`
                                        const isAdded = addedTasks.has(taskId)

                                        return (
                                            <div key={tIdx} className="flex items-start gap-3 group/task">
                                                {isEditing ? (
                                                    <Input
                                                        value={task}
                                                        onChange={(e) => handleTaskChange(pIdx, tIdx, e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                ) : (
                                                    <div className="flex-1 flex items-start justify-between p-2 rounded-md hover:bg-secondary/30 transition-colors border border-transparent hover:border-border/50">
                                                        <span className="text-sm leading-snug pt-0.5">{task}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "h-6 w-6 ml-2 shrink-0 transition-all",
                                                                isAdded ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-muted-foreground opacity-0 group-hover/task:opacity-100 hover:text-primary hover:bg-primary/10"
                                                            )}
                                                            onClick={() => handleAddToBacklog(task, taskId)}
                                                            disabled={isAdded || loading}
                                                            title={isAdded ? "Added to Tasks" : "Add to Backlog"}
                                                        >
                                                            {isAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/10">
                    {isEditing ? (
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Discard</Button>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                            Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
