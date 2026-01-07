"use client"

import { useState, useEffect } from "react"
import {
    subscribeToFeed,
    subscribeToFriendships,
    type Post,
    type Friendship,
    subscribeToGlobalFeed
} from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, Link as LinkIcon, Lightbulb, User } from "lucide-react"
import { CreatePostDialog } from "@/components/dashboard/sharing/create-post-dialog"
import { PostCard } from "@/components/dashboard/sharing/post-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/shared/language-context"
import { LeftSidebar } from "@/components/dashboard/sharing/left-sidebar"
import { RightSidebar } from "@/components/dashboard/sharing/right-sidebar"
import { BookOpen } from "lucide-react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { PostDetailDialog } from "@/components/dashboard/sharing/post-detail-dialog"

export default function SharingPage() {
    const [user, setUser] = useState(auth.currentUser)
    const [posts, setPosts] = useState<Post[]>([])
    const [friendships, setFriendships] = useState<Friendship[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'global' | 'circle'>('circle') // Default to 'circle' for personalization
    const { t } = useLanguage()

    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const postId = searchParams.get('post')

    const handleClosePostDetail = (open: boolean) => {
        if (!open) {
            router.push(pathname, { scroll: false })
        }
    }

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged((u) => {
            setUser(u)
            if (!u) setLoading(false)
        })

        const unsubFriends = subscribeToFriendships((friends) => {
            setFriendships(friends)
        })

        return () => {
            unsubAuth()
            unsubFriends()
        }
    }, [])

    useEffect(() => {
        if (!user) return

        let unsubFeed: () => void

        if (viewMode === 'circle') {
            const friendIds = friendships
                .filter(f => f.status === 'accepted')
                .map(f => f.friend.id)
            const feedIds = [user.uid, ...friendIds]
            const safeIds = feedIds.slice(0, 30) // Limit to 30 for 'in' query

            unsubFeed = subscribeToFeed(safeIds, (data) => {
                setPosts(data)
                setLoading(false)
            })
        } else {
            // Global Feed
            unsubFeed = subscribeToGlobalFeed((data: Post[]) => {
                setPosts(data)
                setLoading(false)
            })
        }

        return () => {
            if (unsubFeed) unsubFeed()
        }
    }, [user, friendships, viewMode])

    if (loading) return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-slate-200 rounded-full" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
        </div>
    )

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950">
            <div className="container max-w-[1400px] mx-auto flex justify-center gap-8 py-8 px-4 items-start">

                {/* --- LEFT COLUMN --- */}
                <div className="hidden lg:block">
                    <LeftSidebar viewMode={viewMode} setViewMode={setViewMode} />
                </div>


                {/* --- CENTER COLUMN: MAIN FEED --- */}
                <div className="flex-1 max-w-2xl w-full space-y-6 pb-20">
                    {/* New Post Input Widget */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex gap-4 mb-4">
                            <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-sm">
                                <AvatarImage src={user?.photoURL || "/avatars/01.png"} />
                                <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <CreatePostDialog>
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-6 py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                                        {t("whats_on_your_mind") || `What's happening, ${user?.displayName?.split(' ')[0] || 'Alex'}?`}
                                    </span>
                                </div>
                            </CreatePostDialog>
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <div className="flex gap-4">
                                <CreatePostDialog>
                                    <button className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors text-sm font-bold">
                                        <ImageIcon className="h-5 w-5 text-emerald-500" />
                                        Photo
                                    </button>
                                </CreatePostDialog>
                                <CreatePostDialog>
                                    <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-bold">
                                        <LinkIcon className="h-5 w-5 text-blue-500" />
                                        Link
                                    </button>
                                </CreatePostDialog>
                                <CreatePostDialog>
                                    <button className="flex items-center gap-2 text-slate-500 hover:text-purple-600 transition-colors text-sm font-bold">
                                        <Lightbulb className="h-5 w-5 text-purple-500" />
                                        Perspective
                                    </button>
                                </CreatePostDialog>
                            </div>
                            <CreatePostDialog>
                                <Button className="rounded-full px-6 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                                    Post
                                </Button>
                            </CreatePostDialog>
                        </div>
                    </div>

                    {/* Posts List */}
                    <div className="space-y-6">
                        {posts
                            .filter(post => viewMode === 'circle' || post.visibility === 'public')
                            .map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    currentUserId={user?.uid}
                                    friendships={friendships}
                                />
                            ))}
                    </div>

                    {posts.length === 0 && (
                        <div className="text-center py-20">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t("feed_quiet")}</h3>
                            <p className="text-slate-500 mb-6">{t("feed_quiet_desc")}</p>
                            <CreatePostDialog>
                                <Button className="rounded-full px-6">{t("create_first_post")}</Button>
                            </CreatePostDialog>
                        </div>
                    )}
                </div>

                {/* --- RIGHT COLUMN --- */}
                <div className="hidden xl:block">
                    <RightSidebar />
                </div>

            </div>
        </div>
    )
}
