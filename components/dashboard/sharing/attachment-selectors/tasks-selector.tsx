"use client"

import { useEffect, useState } from "react"
import { subscribeToTasks, type Task, type Attachment } from "@/lib/firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckSquare } from "lucide-react"

interface TasksSelectorProps {
    onSelect: (type: Attachment['type'], item: Task) => void
}

export function TasksSelector({ onSelect }: TasksSelectorProps) {
    const [myTasks, setMyTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = subscribeToTasks((data) => {
            setMyTasks(data)
            setLoading(false)
        })
        return () => unsub()
    }, [])

    return (
        <div className="flex-1 flex flex-col h-full mt-0">
            <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10 border-b border-blue-100/50 dark:border-blue-900/20">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                    <CheckSquare className="h-3 w-3" /> Select a task to link
                </p>
            </div>
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {loading && (
                        <div className="p-4 text-center text-xs text-slate-400">Loading tasks...</div>
                    )}
                    {!loading && myTasks.filter(t => !t.completed).length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">No active tasks found</div>
                    )}
                    {myTasks.filter(t => !t.completed).map(t => (
                        <button
                            key={t.id}
                            onClick={() => onSelect('task', t)}
                            className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800 text-sm flex items-center gap-3 transition-all group"
                        >
                            <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                            <span className="truncate flex-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{t.title}</span>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
