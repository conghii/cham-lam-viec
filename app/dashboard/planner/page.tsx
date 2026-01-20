"use client"

import { useState, useEffect } from "react"
import { PlannerTimeline, Phase } from "@/components/planner/planner-timeline"
import { toast } from "sonner"
import { savePlan, subscribeToPlans, type SavedPlan, type PlanPhase } from "@/lib/firebase/firestore"
import { PlanDetailsDialog } from "@/components/planner/plan-details-dialog"
import { useLanguage } from "@/components/shared/language-context"
import { format } from "date-fns"
import { PlannerList } from "@/components/planner/planner-list"
import { PlannerChat } from "@/components/planner/planner-chat"
import { DeepDiveData } from "@/components/planner/deep-dive-flow"
import { Button } from "@/components/ui/button"
import { MoveRight } from "lucide-react"

export default function PlannerPage() {
    const { language, t } = useLanguage()
    const [isGenerating, setIsGenerating] = useState(false)
    const [plan, setPlan] = useState<Phase[] | null>(null)
    const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([])
    const [selectedPlan, setSelectedPlan] = useState<SavedPlan | null>(null)
    const [generatedGoal, setGeneratedGoal] = useState<string>("")

    useEffect(() => {
        const unsubscribe = subscribeToPlans((data) => {
            setSavedPlans(data)
        })
        return () => unsubscribe()
    }, [])

    const handleGenerateWithContext = async (data: {
        goal: string,
        deadline: Date | undefined,
        hoursPerDay: string,
        context: string,
        deepDiveData: DeepDiveData | null
    }) => {
        setIsGenerating(true)
        setGeneratedGoal(data.goal)

        try {
            const response = await fetch("/api/ai/generate-goal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goal: data.goal,
                    deadline: data.deadline ? format(data.deadline, 'yyyy-MM-dd') : "As soon as possible",
                    hoursPerDay: parseInt(data.hoursPerDay) || 2,
                    interviewContext: data.context,
                    deepDiveData: data.deepDiveData,
                    language: language
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.details || "Failed to generate plan");
            }

            const result = await response.json()

            // Map API response to Phase format
            const generatedPlan: Phase[] = result.phases.map((p: any, index: number) => ({
                id: index + 1,
                title: p.title,
                duration: p.duration,
                tasks: p.tasks
            }))

            setPlan(generatedPlan)
        } catch (error: any) {
            console.error("Generation failed", error)
            toast.error(error.message || "Failed to generate plan. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCommit = async () => {
        if (!plan) return
        try {
            await savePlan(generatedGoal || "New Plan", plan as PlanPhase[])
            setPlan(null)
            setGeneratedGoal("")
            toast.success("Plan saved successfully!")
        } catch (error) {
            console.error("Error saving plan:", error)
            toast.error("Failed to save plan.")
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] relative overflow-y-auto md:overflow-hidden overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30 transition-colors duration-500">
            {/* Aurora Background (Light Pastel) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[120px] animate-pulse delay-1000" />
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-cyan-100/60 dark:bg-cyan-900/10 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-12 h-auto lg:h-full flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">

                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
                        <div className="relative w-40 h-40">
                            <div className="absolute inset-0 bg-indigo-200/50 rounded-full blur-xl animate-pulse" />
                            <img
                                src="/images/ai-mascot.png"
                                alt="Generating"
                                className="relative w-full h-full object-contain animate-bounce"
                            />
                        </div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {t("crafting_plan")}
                        </h2>
                        <p className="text-slate-500 max-w-md text-center">
                            {t("analyzing_responses")}
                        </p>
                    </div>
                ) : !plan ? (
                    <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-12 w-full items-center">
                        {/* Left: My Plans List */}
                        <PlannerList
                            savedPlans={savedPlans}
                            onSelectPlan={setSelectedPlan}
                            selectedPlanId={selectedPlan?.id}
                        />

                        {/* Right: Conversational UI Form */}
                        <div className="w-full">
                            <PlannerChat
                                onGenerate={handleGenerateWithContext}
                                isGenerating={isGenerating}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <Button
                                variant="ghost"
                                onClick={() => setPlan(null)}
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <MoveRight className="h-4 w-4 mr-2 rotate-180" /> {t("back_to_planner")}
                            </Button>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{t("your_magic_plan")}</h2>
                                <p className="text-sm text-slate-500">{t("ready_to_conquer")} {generatedGoal}?</p>
                            </div>
                            <div className="w-24" /> {/* Spacer */}
                        </div>
                        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-1 shadow-xl shadow-indigo-100/50 dark:shadow-none">
                            <PlannerTimeline plan={plan} onCommit={handleCommit} />
                        </div>
                    </div>
                )}
            </div>

            {/* Existing Details Dialog (Hidden logic wrapper) */}
            <PlanDetailsDialog
                plan={selectedPlan}
                open={!!selectedPlan}
                onOpenChange={(open) => !open && setSelectedPlan(null)}
            />
        </div>
    )
}
