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
import { Share2, BookOpen, TrendingUp, Users } from "lucide-react"
import { CreatePostDialog } from "@/components/dashboard/sharing/create-post-dialog"
import { PostCard } from "@/components/dashboard/sharing/post-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingSidebar } from "@/components/dashboard/sharing/trending-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { subscribeToGlobalFeed } from "@/lib/firebase/firestore"

export default function SharingPage() {
    const [user, setUser] = useState(auth.currentUser)
    const [posts, setPosts] = useState<Post[]>([])
    const [friendships, setFriendships] = useState<Friendship[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'global' | 'circle'>('global')

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
            const friendIds = friendships.map(f => f.friend.id)
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
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-full" />
                <div className="h-4 w-32 bg-muted rounded" />
            </div>
        </div>
    )

    return (
        <div className="container max-w-6xl mx-auto h-[calc(100vh-4rem)] flex gap-6 py-6 overflow-hidden">
            {/* Left Sidebar - Navigation & Trending */}
            <div className="hidden lg:block w-64 shrink-0 h-full">
                <ScrollArea className="h-full pr-4">
                    <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold font-serif px-2">Knowledge Hub</h2>
                            <div className="space-y-1">
                                <Button
                                    variant={viewMode === 'global' ? "secondary" : "ghost"}
                                    className="w-full justify-start gap-3"
                                    onClick={() => setViewMode('global')}
                                >
                                    <BookOpen className="h-4 w-4" /> Global Feed
                                </Button>
                                <Button
                                    variant={viewMode === 'circle' ? "secondary" : "ghost"}
                                    className="w-full justify-start gap-3"
                                    onClick={() => setViewMode('circle')}
                                >
                                    <Users className="h-4 w-4" /> My Circle
                                </Button>
                                <Separator className="my-2" />
                                <div className="px-2 pb-2">
                                    <TrendingSidebar />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4 px-2 pb-10">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Popular Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {['productivity', 'learning', 'coding', 'health', 'books'].map(tag => (
                                    <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-secondary">
                                        #{tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Main Feed */}
            <ScrollArea className="flex-1 h-full pr-4">
                <div className="max-w-2xl mx-auto space-y-6 pb-20">
                    {/* Quick Post Widget */}
                    <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm mb-8">
                        <div className="flex gap-4">
                            <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={user?.photoURL || "/avatars/01.png"} />
                                <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <CreatePostDialog>
                                <button className="flex-1 text-left px-5 py-2.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground transition-colors border border-border/40 cursor-pointer">
                                    What&apos;s on your mind{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ""}?
                                </button>
                            </CreatePostDialog>
                        </div>
                    </div>

                    {posts.map(post => (
                        <PostCard key={post.id} post={post} currentUserId={user?.uid} />
                    ))}

                    {posts.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                            <h3 className="text-lg font-medium text-foreground">Your feed is empty</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Connect with friends or share your first post to get started.</p>
                            <CreatePostDialog>
                                <Button>Create First Post</Button>
                            </CreatePostDialog>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Right Sidebar - (Optional - maybe Friend suggestions later) */}
            {/* For now keeping it 2-column as requested per design, simplified */}
        </div>
    )
}
