"use client"

import { useState, useEffect } from "react"
import {
    subscribeToFeed,
    subscribeToFriendships,
    type Post,
    type Friendship
} from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BookOpen, Users, Image as ImageIcon, Link as LinkIcon, Lightbulb } from "lucide-react"
import { CreatePostDialog } from "@/components/dashboard/sharing/create-post-dialog"
import { PostCard } from "@/components/dashboard/sharing/post-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingSidebar } from "@/components/dashboard/sharing/trending-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { subscribeToGlobalFeed } from "@/lib/firebase/firestore"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/shared/language-context"

export default function SharingPage() {
    const [user, setUser] = useState(auth.currentUser)
    const [posts, setPosts] = useState<Post[]>([])
    const [friendships, setFriendships] = useState<Friendship[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'global' | 'circle'>('circle')
    const { t } = useLanguage()

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
            <div className="container max-w-[1600px] mx-auto flex justify-center gap-8 py-6 items-start px-4">

                {/* --- LEFT COLUMN: NAVIGATION (Sticky) --- */}
                <div className="hidden lg:block w-64 shrink-0 sticky top-[5.5rem] self-start">
                    {/* Navigation Card */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-800">
                        <h2 className="text-lg font-bold font-serif mb-4 px-2 text-slate-800 dark:text-slate-100">{t("knowledge_hub")}</h2>
                        <div className="space-y-1">
                            <Button
                                variant={viewMode === 'global' ? "secondary" : "ghost"}
                                className={cn("w-full justify-start gap-3 rounded-xl font-medium transition-all", viewMode === 'global' ? "bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-900/20 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}
                                onClick={() => setViewMode('global')}
                            >
                                <BookOpen className="h-4 w-4" /> {t("global_feed")}
                            </Button>
                            <Button
                                variant={viewMode === 'circle' ? "secondary" : "ghost"}
                                className={cn("w-full justify-start gap-3 rounded-xl font-medium transition-all", viewMode === 'circle' ? "bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-900/20 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}
                                onClick={() => setViewMode('circle')}
                            >
                                <Users className="h-4 w-4" /> {t("my_circle")}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- CENTER COLUMN: MAIN FEED --- */}
                <div className="flex-1 max-w-2xl w-full space-y-6 pb-20">
                    {/* Quick Post Widget (Composer) */}
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 transition-all hover:shadow-md">
                        <div className="flex gap-4">
                            <Avatar className="h-11 w-11 shrink-0 border-2 border-slate-50 relative z-0">
                                <AvatarImage src={user?.photoURL || "/avatars/01.png"} />
                                <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                                <CreatePostDialog>
                                    <div className="w-full text-left group cursor-pointer">
                                        {/* Fake Input */}
                                        <div className="w-full bg-slate-50 dark:bg-slate-800/50 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700 rounded-2xl p-4 transition-all min-h-[70px] flex items-center">
                                            <p className="text-slate-400 font-medium text-lg truncate">
                                                {t("whats_on_your_mind")}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ""}...
                                            </p>
                                        </div>

                                        {/* Fake Toolbar */}
                                        <div className="flex items-center gap-2 mt-3 pl-1">
                                            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 gap-2">
                                                <ImageIcon className="h-4 w-4" />
                                                <span className="text-xs font-medium">{t("image_btn")}</span>
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 gap-2">
                                                <LinkIcon className="h-4 w-4" />
                                                <span className="text-xs font-medium">{t("link_btn")}</span>
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 gap-2">
                                                <Lightbulb className="h-4 w-4" />
                                                <span className="text-xs font-medium">{t("insight_btn")}</span>
                                            </Button>
                                        </div>
                                    </div>
                                </CreatePostDialog>
                            </div>
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
                        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <BookOpen className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">{t("feed_quiet")}</h3>
                            <p className="text-slate-500 mb-6 max-w-sm mx-auto mt-2">{t("feed_quiet_desc")}</p>
                            <CreatePostDialog>
                                <Button className="rounded-full px-6">{t("create_first_post")}</Button>
                            </CreatePostDialog>
                        </div>
                    )}
                </div>

                {/* --- RIGHT COLUMN: TRENDING & TAGS (Sticky) --- */}
                <div className="hidden xl:block w-80 shrink-0 sticky top-[5.5rem] self-start space-y-6">
                    {/* Trending Section */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800">
                        <TrendingSidebar />
                    </div>

                    {/* Tags Section */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{t("popular_tags")}</h3>
                        <div className="flex flex-wrap gap-2">
                            {['productivity', 'learning', 'coding', 'health', 'books', 'mindset'].map(tag => (
                                <Badge
                                    key={tag}
                                    variant="outline"
                                    className="cursor-pointer bg-white/50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 font-medium transition-all"
                                >
                                    #{tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Footer / Copyright Mock */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400 px-2 opacity-60 hover:opacity-100 transition-opacity">
                        <span>© 2024 ChamLam</span>
                        <a href="#" className="hover:underline">Privacy</a>
                        <a href="#" className="hover:underline">Terms</a>
                        <a href="#" className="hover:underline">Help</a>
                    </div>
                </div>

            </div>
        </div>
    )
}
