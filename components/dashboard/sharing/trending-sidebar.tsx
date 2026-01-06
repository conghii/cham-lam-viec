"use client"

import { useEffect, useState } from "react"
import { subscribeToTrendingPosts, type Post } from "@/lib/firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, MessageSquare, Heart } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function TrendingSidebar() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = subscribeToTrendingPosts((data) => {
            setPosts(data)
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-bold">Trending Now</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No trending posts yet.</p>
                ) : (
                    <div className="space-y-4">
                        {posts
                            .filter(post => post.visibility === 'public')
                            .map((post, index) => (
                                <Link key={post.id} href={`/dashboard/sharing?post=${post.id}`} className="block group">
                                    <div className="flex gap-3 items-start">
                                        <span className="text-2xl font-black text-muted-foreground/20 group-hover:text-primary/20 transition-colors">
                                            {index + 1}
                                        </span>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `/dashboard/profile/${post.authorId}`;
                                                    }}
                                                    className="group/avatar flex items-center gap-2 z-10 relative cursor-pointer"
                                                >
                                                    <Avatar className="h-5 w-5 hover:opacity-80 transition-opacity">
                                                        <AvatarImage src={post.author?.photoURL} />
                                                        <AvatarFallback className="text-[10px]">{post.author?.displayName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px] group-hover/avatar:underline group-hover/avatar:text-primary transition-colors">
                                                        {post.author?.displayName}
                                                    </span>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                {post.title || post.content.substring(0, 50)}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Heart className="h-3 w-3" /> {post.likes?.length || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageSquare className="h-3 w-3" /> {post.commentsCount || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                    </div>
                )}
            </CardContent>
        </Card >
    )
}
