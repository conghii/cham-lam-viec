"use client"

import { useEffect, useState } from "react"
import { subscribeToTrendingPosts, type Post } from "@/lib/firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, MessageSquare, Heart } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/components/shared/language-context"
import { cn } from "@/lib/utils"

export function RightSidebar() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const { t } = useLanguage()

    useEffect(() => {
        const unsubscribe = subscribeToTrendingPosts((data) => {
            setPosts(data)
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    return (
        <div className="w-80 shrink-0 space-y-6 sticky top-[5.5rem] self-start">

            {/* Trending Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">{t("trending_now") || "Trending Now"}</h2>

                </div>

                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                ) : posts.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No trending posts yet.</p>
                ) : (
                    <div className="space-y-6">
                        {posts
                            .filter(post => post.visibility === 'public')
                            .slice(0, 3) // Limit to top 3
                            .map((post, index) => {
                                // Try to find an image: attachments OR images array OR defaults
                                // For attachments of type 'image', the 'id' field contains the URL
                                const image = post.attachments?.find(a => a.type === 'image')?.id || post.images?.[0];

                                return (
                                    <Link key={post.id} href={`/dashboard/sharing?post=${post.id}`} className="block group">
                                        <div className="flex gap-4 items-start">
                                            <span className="text-lg font-bold text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Technology</span>
                                                    <span className="text-[10px] text-slate-400">•</span>
                                                    <span className="text-[11px] text-slate-500">Live</span>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:underline decoration-2 decoration-indigo-200">
                                                    {post.title || post.content.substring(0, 40)}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    {(post.likes?.length || 0) * 125} posts
                                                </p>
                                            </div>
                                            {image && (
                                                <div className="h-10 w-10 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                                    <img src={image} className="h-full w-full object-cover" alt="" />
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                )
                            })}
                    </div>
                )}
            </div>

            {/* Popular Tags */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-6">{t("popular_tags") || "Popular Tags"}</h2>

                <div className="flex flex-wrap gap-x-2 gap-y-3">
                    {[
                        { label: '#Technology', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
                        { label: '#Design', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
                        { label: '#Startups', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
                        { label: '#Photography', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
                        { label: '#Travel', color: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
                    ].map((tag) => (
                        <Badge
                            key={tag.label}
                            variant="outline"
                            className={cn("px-3 py-1.5 rounded-full border-none font-bold cursor-pointer transition-colors", tag.color)}
                        >
                            {tag.label}
                        </Badge>
                    ))}
                    <Badge
                        variant="secondary"
                        className="px-3 py-1.5 rounded-full font-bold cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                        Show more
                    </Badge>
                </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400 px-4">
                <Link href="#" className="hover:underline">About</Link>
                <Link href="#" className="hover:underline">Accessibility</Link>
                <Link href="#" className="hover:underline">Help Center</Link>
                <Link href="#" className="hover:underline">Privacy Policy</Link>
                <Link href="#" className="hover:underline">Terms of Service</Link>
                <span className="w-full mt-2">© 2026 ChamLam Inc.</span>
            </div>

        </div>
    )
}
