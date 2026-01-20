"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Clock, MoveRight } from "lucide-react"
import { SavedPlan, deletePlan } from "@/lib/firebase/firestore"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { useLanguage } from "@/components/shared/language-context"

interface PlannerListProps {
    savedPlans: SavedPlan[]
    onSelectPlan: (plan: SavedPlan) => void
    selectedPlanId?: string
}

export function PlannerList({ savedPlans, onSelectPlan, selectedPlanId }: PlannerListProps) {
    const { t } = useLanguage()

    const handleDeletePlan = async (e: React.MouseEvent, planId: string) => {
        e.stopPropagation()
        try {
            await deletePlan(planId)
            toast.success("Plan deleted")
        } catch (error) {
            console.error("Error deleting plan", error)
            toast.error("Failed to delete plan")
        }
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return ""
        return new Date(timestamp.toMillis()).toLocaleDateString()
    }

    return (
        <div className="space-y-6 h-full min-h-[300px] lg:min-h-[500px] flex flex-col justify-center">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {t("my_plans")} ({savedPlans.length})
                </h2>
            </div>

            <ScrollArea className="flex-1 h-[300px] lg:h-[500px]">
                <div className="space-y-4 pb-4 pt-1">
                    {savedPlans.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/30 dark:bg-slate-900/30">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">{t("no_plans_yet")}</p>
                        </div>
                    ) : (
                        savedPlans.map((saved) => (
                            <div
                                key={saved.id}
                                className={cn(
                                    "group relative p-3 md:p-5 rounded-2xl border transition-all duration-300 cursor-pointer",
                                    selectedPlanId === saved.id
                                        ? "bg-white dark:bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 ring-1 ring-indigo-500/20"
                                        : "bg-white/60 dark:bg-slate-900/60 border-white/50 dark:border-slate-800 backdrop-blur-md hover:bg-white hover:dark:bg-slate-900 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 hover:-translate-y-0.5"
                                )}
                                onClick={() => onSelectPlan(saved)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <h3 className={cn(
                                            "font-bold text-base md:text-lg transition-colors",
                                            selectedPlanId === saved.id
                                                ? "text-indigo-600 dark:text-indigo-400"
                                                : "text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                        )}>
                                            {saved.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                                            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                                <Clock className="w-3 h-3" /> {formatDate(saved.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 -mr-2 -mt-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                        onClick={(e) => handleDeletePlan(e, saved.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
