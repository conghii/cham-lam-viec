"use client"

import { useEffect, useState } from "react"
import { subscribeToBlogPosts, type BlogPost, type Attachment } from "@/lib/firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PenTool } from "lucide-react"

interface BlogsSelectorProps {
    onSelect: (type: Attachment['type'], item: BlogPost) => void
}

export function BlogsSelector({ onSelect }: BlogsSelectorProps) {
    const [myBlogs, setMyBlogs] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = subscribeToBlogPosts((data) => {
            setMyBlogs(data)
            setLoading(false)
        })
        return () => unsub()
    }, [])

    return (
        <div className="flex-1 flex flex-col h-full mt-0">
            <div className="p-4 bg-purple-50/30 dark:bg-purple-900/10 border-b border-purple-100/50 dark:border-purple-900/20">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <PenTool className="h-3 w-3" /> Select a blog to link
                </p>
            </div>
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {loading && (
                        <div className="p-4 text-center text-xs text-slate-400">Loading entries...</div>
                    )}
                    {!loading && myBlogs.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">No blog entries found</div>
                    )}
                    {myBlogs.map(b => (
                        <button
                            key={b.id}
                            onClick={() => onSelect('blog', b)}
                            className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800 text-sm flex items-center gap-3 transition-all group"
                        >
                            <div className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                            <span className="truncate flex-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{b.title || "Untitled"}</span>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
