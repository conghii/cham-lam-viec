"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { getPost, type Post, type Friendship } from "@/lib/firebase/firestore"
import { PostCard } from "@/components/dashboard/sharing/post-card"
import { Loader2 } from "lucide-react"
import { auth } from "@/lib/firebase/auth"

interface PostDetailDialogProps {
    postId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    friendships: Friendship[]
}

export function PostDetailDialog({ postId, open, onOpenChange, friendships }: PostDetailDialogProps) {
    const [post, setPost] = useState<Post | null>(null)
    const [loading, setLoading] = useState(false)
    const [currentUser] = useState(auth.currentUser)

    useEffect(() => {
        if (open && postId) {
            setLoading(true)
            getPost(postId).then(fetchedPost => {
                setPost(fetchedPost)
                setLoading(false)
            }).catch(() => {
                setLoading(false)
            })
        }
    }, [open, postId])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-transparent border-none p-0 shadow-none sm:max-w-3xl overflow-hidden">
                <DialogTitle className="hidden">Post Details</DialogTitle>
                {loading ? (
                    <div className="flex justify-center p-12 bg-white dark:bg-slate-950 rounded-2xl">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                ) : post ? (
                    <div className="max-h-[85vh] overflow-y-auto rounded-3xl no-scrollbar">
                        {/* Wrapper to give it card look if PostCard doesn't have it explicitly or to ensure contrast */}
                        <PostCard
                            post={post}
                            currentUserId={currentUser?.uid}
                            friendships={friendships}
                        />
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl text-center">
                        <p className="text-slate-500">Post not found or unavailable.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
