"use client"

import { useState, useEffect } from "react"
import { PlannerForm } from "@/components/planner/planner-form"
import { PlannerTimeline, Phase } from "@/components/planner/planner-timeline"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { savePlan, subscribeToPlans, deletePlan, type SavedPlan, type PlanPhase } from "@/lib/firebase/firestore"
import { Button } from "@/components/ui/button"
import { Trash2, History } from "lucide-react"
import { PlanDetailsDialog } from "@/components/planner/plan-details-dialog"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function PlannerPage() {
    const [isGenerating, setIsGenerating] = useState(false)
    const [plan, setPlan] = useState<Phase[] | null>(null)
    const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([])
    const [selectedPlan, setSelectedPlan] = useState<SavedPlan | null>(null)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = subscribeToPlans((data) => {
            setSavedPlans(data)
        })
        return () => unsubscribe()
    }, [])

    const handleGenerate = async (data: any) => {
        setIsGenerating(true)
        try {
            const response = await fetch("/api/ai/generate-goal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goal: data.goal,
                    deadline: "As soon as possible", // You might want to add deadline to PlannerForm
                    hoursPerDay: data.hoursPerDay || 4
                })
            })

            if (!response.ok) throw new Error("Failed to generate plan")

            const result = await response.json()

            // Map API response to Phase format
            const generatedPlan: Phase[] = result.phases.map((p: any, index: number) => ({
                id: index + 1,
                title: p.title,
                duration: p.duration,
                tasks: p.tasks
            }))

            setPlan(generatedPlan)
        } catch (error) {
            console.error("Generation failed", error)
            toast.error("Failed to generate plan. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCommit = async () => {
        if (!plan) return
        try {
            await savePlan("New Generated Plan", plan as PlanPhase[])
            setPlan(null)
            toast.success("Plan saved successfully!")
        } catch (error) {
            console.error("Error saving plan:", error)
            toast.error("Failed to save plan.")
        }
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return ""
        return new Date(timestamp.toMillis()).toLocaleDateString()
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">AI Planner</h2>
                    <p className="text-muted-foreground">Generate actionable roadmaps for your goals.</p>
                </div>
            </div>

            {!plan ? (
                <>
                    <PlannerForm onPlanGenerate={handleGenerate} isGenerating={isGenerating} />

                    {savedPlans.length > 0 && (
                        <div className="space-y-4 pt-8">
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                <h3 className="text-xl font-semibold">Saved Plans</h3>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {savedPlans.map((saved) => (
                                    <Card
                                        key={saved.id}
                                        className="relative group cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                                        onClick={() => setSelectedPlan(saved)}
                                    >
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">{saved.title}</CardTitle>
                                            <div className="text-xs text-muted-foreground">{formatDate(saved.createdAt)}</div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {saved.phases.slice(0, 2).map((phase, i) => (
                                                    <div key={i} className="text-sm border-l-2 pl-2 border-primary/20">
                                                        <div className="font-medium truncate">{phase.title}</div>
                                                    </div>
                                                ))}
                                                {saved.phases.length > 2 && <div className="text-xs text-muted-foreground">+ {saved.phases.length - 2} more phases</div>}
                                            </div>
                                        </CardContent>
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deletePlan(saved.id)
                                                    toast.success("Plan deleted")
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <PlannerTimeline plan={plan} onCommit={handleCommit} />
            )}
            {/* Plan Details Dialog */}
            <PlanDetailsDialog
                plan={selectedPlan}
                open={!!selectedPlan}
                onOpenChange={(open) => !open && setSelectedPlan(null)}
            />
        </div>
    )
}
