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
        <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Trending Now</h2>
            </div>

            {loading ? (
                <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                </div>
            ) : posts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No trending posts yet.</p>
            ) : (
                <div className="space-y-5">
                    {posts
                        .filter(post => post.visibility === 'public')
                        .map((post, index) => (
                            <Link key={post.id} href={`/dashboard/sharing?post=${post.id}`} className="block group">
                                <div className="flex gap-4 items-start relative">
                                    <div className="flex flex-col items-center gap-1 min-w-[24px]">
                                        <span className="text-sm font-black text-slate-300 group-hover:text-emerald-500 transition-colors">
                                            0{index + 1}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <h4 className="text-[14px] font-bold leading-snug text-slate-700 group-hover:text-emerald-700 transition-colors line-clamp-2">
                                            {post.title || post.content.substring(0, 50)}
                                        </h4>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-4 w-4 border border-slate-100">
                                                    <AvatarImage src={post.author?.photoURL} />
                                                    <AvatarFallback className="text-[8px]">{post.author?.displayName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[80px]">
                                                    {post.author?.displayName}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-1">
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                                                <TrendingUp className="h-2.5 w-2.5 text-emerald-500" /> Hot
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                <Heart className="h-3 w-3" /> {post.likes?.length || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                </div>
            )}
        </div>
    )
}
