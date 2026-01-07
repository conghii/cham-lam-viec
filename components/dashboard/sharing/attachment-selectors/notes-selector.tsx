"use client"

import { useEffect, useState } from "react"
import { subscribeToNotes, type Note, type Attachment } from "@/lib/firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StickyNote } from "lucide-react"

interface NotesSelectorProps {
    onSelect: (type: Attachment['type'], item: Note) => void
}

export function NotesSelector({ onSelect }: NotesSelectorProps) {
    const [myNotes, setMyNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = subscribeToNotes((data) => {
            setMyNotes(data)
            setLoading(false)
        })
        return () => unsub()
    }, [])

    return (
        <div className="flex-1 flex flex-col h-full mt-0">
            <div className="p-4 bg-orange-50/30 dark:bg-orange-900/10 border-b border-orange-100/50 dark:border-orange-900/20">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                    <StickyNote className="h-3 w-3" /> Select a note to link
                </p>
            </div>
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {loading && (
                        <div className="p-4 text-center text-xs text-slate-400">Loading notes...</div>
                    )}
                    {!loading && myNotes.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">No notes found</div>
                    )}
                    {myNotes.map(n => (
                        <button
                            key={n.id}
                            onClick={() => onSelect('note', n)}
                            className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800 text-sm flex items-center gap-3 transition-all group"
                        >
                            <div className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
                            <span className="truncate flex-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{n.title || "Untitled"}</span>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
