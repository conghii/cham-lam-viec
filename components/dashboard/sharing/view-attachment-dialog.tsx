"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Target, CheckSquare, StickyNote, Calendar, AlertCircle } from "lucide-react"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/firestore"
import { type Attachment, type Goal, type Task, type Note, type BlogPost } from "@/lib/firebase/firestore"
import { format } from "date-fns"
import Image from "next/image"

interface ViewAttachmentDialogProps {
    attachment: Attachment
    children: React.ReactNode
}

export function ViewAttachmentDialog({ attachment, children }: ViewAttachmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open && attachment.id && attachment.type !== 'image') {
            fetchData()
        }
    }, [open, attachment])

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const collectionName = attachment.type === 'goal' ? 'goals' :
                attachment.type === 'task' ? 'tasks' :
                    attachment.type === 'note' ? 'notes' : 'posts'
            const docRef = doc(db, collectionName, attachment.id)
            const snap = await getDoc(docRef)

            if (snap.exists()) {
                setData({ id: snap.id, ...snap.data() })
            } else {
                setError("Content not found or you don't have permission to view it.")
            }
        } catch (err) {
            console.error("Error fetching attachment:", err)
            setError("Failed to load content. It might be private.")
        } finally {
            setLoading(false)
        }
    }

    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        if (error) return <div className="text-center p-8 text-muted-foreground flex flex-col items-center gap-2"><AlertCircle className="h-6 w-6" /><p>{error}</p></div>
        if (!data) return null

        if (attachment.type === 'goal') {
            const goal = data as Goal
            return (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                        <p className="text-sm leading-relaxed">{goal.description || "No description provided."}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/20 rounded-lg border">
                            <span className="text-xs text-muted-foreground block mb-1">Progress</span>
                            <span className="text-2xl font-bold text-emerald-600">{goal.progress}%</span>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg border">
                            <span className="text-xs text-muted-foreground block mb-1">Target Date</span>
                            <span className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {goal.targetDate ? format((goal.targetDate as unknown as Timestamp).toDate(), "PPP") : "No date"}
                            </span>
                        </div>
                    </div>

                    {goal.keyResults && goal.keyResults.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Key Results</h3>
                            <div className="space-y-3">
                                {goal.keyResults.map((kr: any) => (
                                    <div key={kr.id} className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span>{kr.title}</span>
                                            <span className="text-muted-foreground">{kr.current} / {kr.target}</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all"
                                                style={{ width: `${Math.min((kr.current / kr.target) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )
        }

        if (attachment.type === 'task') {
            const task = data as Task
            return (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                            {task.priority || 'No Priority'}
                        </Badge>
                        <TaskStatusBadge status={task.status} />
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.description || "No description provided."}</p>
                    </div>

                    {task.subtasks && task.subtasks.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Subtasks</h3>
                            <div className="space-y-2">
                                {task.subtasks.map((st: any) => (
                                    <div key={st.id} className="flex items-center gap-2 text-sm">
                                        <div className={`h-4 w-4 rounded border flex items-center justify-center ${st.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                                            {st.completed && <CheckSquare className="h-3 w-3" />}
                                        </div>
                                        <span className={st.completed ? "line-through text-muted-foreground" : ""}>{st.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )
        }

        if (attachment.type === 'note') {
            // Assuming simple note structure
            return (
                <div className="space-y-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/20 p-4 rounded-lg">
                        {data.content || "Empty note"}
                    </div>
                </div>
            )
        }

        if (attachment.type === 'blog') {
            const blog = data as BlogPost
            return (
                <div className="space-y-6">
                    {blog.coverImage && (
                        <div className="relative aspect-[2/1] w-full rounded-lg overflow-hidden">
                            <Image
                                src={blog.coverImage}
                                alt={blog.title}
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}
                    <div>
                        {blog.excerpt && <p className="text-sm font-medium text-muted-foreground italic mb-4">{blog.excerpt}</p>}
                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: blog.content }} />
                    </div>
                </div>
            )
        }

        return <p className="text-muted-foreground text-center">Unknown attachment type</p>
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {attachment.type === 'goal' && <Target className="h-5 w-5 text-emerald-500" />}
                        {attachment.type === 'task' && <CheckSquare className="h-5 w-5 text-blue-500" />}
                        {attachment.type === 'note' && <StickyNote className="h-5 w-5 text-orange-500" />}
                        {attachment.type === 'blog' && <StickyNote className="h-5 w-5 text-purple-500" />}
                        <DialogTitle>{attachment.title}</DialogTitle>
                    </div>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    {renderContent()}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

function TaskStatusBadge({ status }: { status?: string }) {
    const [statusLabel, setStatusLabel] = useState(status || 'No Status')

    useEffect(() => {
        if (!status) return

        const fetchColumn = async () => {
            // If status looks like an ID (long alphanumeric), try to fetch column title
            if (status.length > 10 && !status.includes(' ')) {
                try {
                    const colRef = doc(db, "taskColumns", status)
                    const snap = await getDoc(colRef)
                    if (snap.exists()) {
                        setStatusLabel(snap.data().title)
                    } else {
                        // Fallback: don't show ugly ID
                        setStatusLabel("Custom Status")
                    }
                } catch {
                    setStatusLabel(status)
                }
            } else {
                // It's likely a readable string like 'todo', 'done' or a short code
                setStatusLabel(status)
            }
        }
        fetchColumn()
    }, [status])

    if (!status) return <Badge variant="outline">No Status</Badge>

    // Hide if it's still an ugly ID after attempt matching (optional, or just show what we have)
    // But let's trust the logic above.
    return <Badge variant="outline">{statusLabel}</Badge>
}
