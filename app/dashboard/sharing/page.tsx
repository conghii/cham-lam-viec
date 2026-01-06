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

export default function SharingPage() {
    const [user, setUser] = useState(auth.currentUser)
    const [posts, setPosts] = useState<Post[]>([])
    const [friendships, setFriendships] = useState<Friendship[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'global' | 'circle'>('circle')

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
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50">
            <div className="container max-w-6xl mx-auto flex gap-8 py-8 items-start">
                {/* Left Sidebar - Navigation & Trending */}
                {/* STICKY positioning applied here */}
                <div className="hidden lg:block w-72 shrink-0 sticky top-24 self-start">
                    <div className="flex flex-col gap-8">
                        {/* Navigation Card */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/60">
                            <h2 className="text-xl font-bold font-serif mb-4 px-2 text-slate-800">Knowledge Hub</h2>
                            <div className="space-y-1">
                                <Button
                                    variant={viewMode === 'global' ? "secondary" : "ghost"}
                                    className={cn("w-full justify-start gap-3 rounded-xl font-medium", viewMode === 'global' ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50")}
                                    onClick={() => setViewMode('global')}
                                >
                                    <BookOpen className="h-4 w-4" /> Global Feed
                                </Button>
                                <Button
                                    variant={viewMode === 'circle' ? "secondary" : "ghost"}
                                    className={cn("w-full justify-start gap-3 rounded-xl font-medium", viewMode === 'circle' ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50")}
                                    onClick={() => setViewMode('circle')}
                                >
                                    <Users className="h-4 w-4" /> My Circle
                                </Button>
                            </div>
                        </div>

                        {/* Trending Section */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/60">
                            <TrendingSidebar />
                        </div>

                        {/* Tags Section */}
                        <div className="px-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Popular Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {['productivity', 'learning', 'coding', 'health', 'books', 'mindset'].map(tag => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className="cursor-pointer bg-white hover:bg-slate-100 text-slate-600 border-slate-200 rounded-full py-1.5 px-3 font-normal transition-colors"
                                    >
                                        #{tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Feed */}
                <div className="flex-1 max-w-2xl mx-auto space-y-8 pb-20">
                    {/* Quick Post Widget (Composer) */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 transition-all hover:shadow-md">
                        <div className="flex gap-4">
                            <Avatar className="h-11 w-11 shrink-0 border-2 border-slate-50">
                                <AvatarImage src={user?.photoURL || "/avatars/01.png"} />
                                <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                                <CreatePostDialog>
                                    <div className="w-full text-left">
                                        {/* Fake Input */}
                                        <div className="w-full bg-slate-50/50 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl p-4 transition-all cursor-text min-h-[80px]">
                                            <p className="text-slate-400 font-medium text-lg">
                                                What&apos;s on your mind{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ""}?
                                            </p>
                                        </div>

                                        {/* Fake Toolbar */}
                                        <div className="flex items-center gap-2 mt-3 pl-1">
                                            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 gap-2">
                                                <ImageIcon className="h-4 w-4" />
                                                <span className="text-xs font-medium">Image</span>
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 gap-2">
                                                <LinkIcon className="h-4 w-4" />
                                                <span className="text-xs font-medium">Link</span>
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-slate-500 hover:text-amber-600 hover:bg-amber-50 gap-2">
                                                <Lightbulb className="h-4 w-4" />
                                                <span className="text-xs font-medium">Insight</span>
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
                            <h3 className="text-lg font-bold text-slate-800">Your feed is quiet</h3>
                            <p className="text-slate-500 mb-6 max-w-sm mx-auto mt-2">Connect with friends to see their updates or share your own progress with your circle.</p>
                            <CreatePostDialog>
                                <Button className="rounded-full px-6">Create First Post</Button>
                            </CreatePostDialog>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
