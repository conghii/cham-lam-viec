"use client"

import { useEffect, useState } from "react"
import { subscribeToGoals, type Goal, type Attachment } from "@/lib/firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Target } from "lucide-react"

interface GoalsSelectorProps {
    onSelect: (type: Attachment['type'], item: Goal) => void
}

export function GoalsSelector({ onSelect }: GoalsSelectorProps) {
    const [myGoals, setMyGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = subscribeToGoals((data) => {
            setMyGoals(data)
            setLoading(false)
        })
        return () => unsub()
    }, [])

    return (
        <div className="flex-1 flex flex-col h-full mt-0">
            <div className="p-4 bg-emerald-50/30 dark:bg-emerald-900/10 border-b border-emerald-100/50 dark:border-emerald-900/20">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <Target className="h-3 w-3" /> Select a goal to link
                </p>
            </div>
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {loading && (
                        <div className="p-4 text-center text-xs text-slate-400">Loading goals...</div>
                    )}
                    {!loading && myGoals.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">No goals found</div>
                    )}
                    {myGoals.map(g => (
                        <button
                            key={g.id}
                            onClick={() => onSelect('goal', g)}
                            className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800 text-sm flex items-center gap-3 transition-all group"
                        >
                            <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate flex-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{g.title}</span>
                            <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">{g.progress}%</span>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
