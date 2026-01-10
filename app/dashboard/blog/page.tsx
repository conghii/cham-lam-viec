"use client"

import { useLanguage } from "@/components/shared/language-context"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Pencil, Shield, Search, Pin, LayoutGrid, Book, Star, FileText, MoreHorizontal, BookOpen } from "lucide-react"
import { subscribeToBlogPosts, deleteBlogPost, updateBlogPost, type BlogPost, subscribeToGroups, Group, getOrganizationMembers, getUserOrganization, OrganizationMember } from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { AssigneeDisplay } from "@/components/dashboard/assignee-display"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

const SAMPLE_TAGS = ["Productivity", "Tech", "Life", "Journal", "Ideas", "Reactor"]

export default function BlogListPage() {
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [groups, setGroups] = useState<Group[]>([])
    const [currentUser, setCurrentUser] = useState(auth.currentUser)
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer' | 'restricted' | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([])
    const { t } = useLanguage()

    // Filters
    const [searchQuery, setSearchQuery] = useState("")
    const [sortOption, setSortOption] = useState<"date" | "title">("date")
    const [activeTab, setActiveTab] = useState<"all" | "favorites" | "journal">("all")

    useEffect(() => {
        const fetchUserRole = async (userId: string) => {
            const org = await getUserOrganization(userId);
            if (org) {
                const mems = await getOrganizationMembers(org.id);
                setMembers(mems);
                const member = mems.find(m => m.id === userId);
                if (member) setUserRole(member.role);
            }
        }

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            setCurrentUser(user)
            if (user) {
                fetchUserRole(user.uid);
            }
        })

        const unsubscribePosts = subscribeToBlogPosts((data) => {
            setPosts(data)
            setLoading(false)
        })

        const unsubscribeGroups = subscribeToGroups((data) => {
            setGroups(data)
        })

        return () => {
            unsubscribeAuth()
            unsubscribePosts()
            unsubscribeGroups()
        }
    }, [])

    // Filter Logic
    const filteredPosts = posts.filter(post => {
        if (!currentUser) return false

        // Access Control
        let hasAccess = false;
        if (post.userId === currentUser.uid) hasAccess = true
        else if (post.assigneeIds?.includes(currentUser.uid)) hasAccess = true
        else {
            const userGroupIds = groups.filter(g => g.memberIds.includes(currentUser.uid)).map(g => g.id)
            if (post.groupIds?.some(gid => userGroupIds.includes(gid))) hasAccess = true
            else {
                const hasAssignments = (post.assigneeIds && post.assigneeIds.length > 0) || (post.groupIds && post.groupIds.length > 0)
                if (!hasAssignments) hasAccess = true
            }
        }
        if (!hasAccess) return false;

        // Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            if (!post.title.toLowerCase().includes(lowerQuery) && !post.content.toLowerCase().includes(lowerQuery)) return false;
        }

        // Tab Filter (Mock logic for now as tags aren't widely populated)
        // In real app, check post.tags include "Journal" etc.
        if (activeTab === "favorites" && !post.pinned) return false; // Using Pinned as "Favorites" for now

        return true;
    }).sort((a, b) => {
        if (sortOption === "title") return a.title.localeCompare(b.title);
        // Date sort is default from firestore subscription (desc), but let's reinforce
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    });

    const pinnedPosts = filteredPosts.filter(p => p.pinned);
    const unpinnedPosts = filteredPosts.filter(p => !p.pinned);

    const togglePin = async (e: React.MouseEvent, post: BlogPost) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await updateBlogPost(post.id, { pinned: !post.pinned });
            toast.success(post.pinned ? "Unpinned" : "Pinned to top");
        } catch (error) {
            toast.error("Failed to update pin");
        }
    }

    if (userRole === 'restricted') {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <Shield className="h-12 w-12 text-destructive mx-auto" />
                    <h2 className="text-2xl font-bold">{t("access_restricted")}</h2>
                </div>
            </div>
        );
    }

    const canEdit = userRole === 'owner' || userRole === 'member';

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950/20 p-6 pt-8 pr-8 overflow-hidden transition-colors duration-500">
            {/* Left Sidebar */}
            <div className="w-64 hidden xl:flex flex-col gap-6 pr-6 border-r border-slate-200/60 dark:border-slate-800/60 sticky top-0 h-full">
                <div className="flex items-center gap-2 px-2 py-1">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-slate-200 leading-none">{t("blog_title")}</h2>
                    </div>
                </div>

                <div className="space-y-1">
                    {[
                        { id: "all", label: t("all_entries"), icon: LayoutGrid },
                        { id: "favorites", label: t("favorites"), icon: Star },
                        { id: "journal", label: t("journal"), icon: Book },
                        { id: "docs", label: t("tech_docs"), icon: FileText },
                    ].map(item => (
                        <button
                            key={item.id}
                            //@ts-ignore
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                activeTab === item.id
                                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="mt-auto">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-900 rounded-2xl p-4 border border-indigo-100/50 dark:border-slate-800">
                        <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">{t("weekly_insight")}</p>
                        <p className="text-xs text-indigo-700/80 dark:text-slate-400 leading-relaxed">
                            "Writing is the painting of the voice." – Voltaire
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <ScrollArea className="flex-1 h-full">
                <div className="max-w-7xl mx-auto pl-0 xl:pl-8 pb-10">

                    {/* Header */}
                    <div className="flex flex-col gap-6 mb-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-2xl">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    placeholder={t("search_placeholder")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-base focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-200"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                                    <button
                                        onClick={() => setSortOption("date")}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", sortOption === "date" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300")}
                                    >
                                        {t("sort_date")}
                                    </button>
                                    <button
                                        onClick={() => setSortOption("title")}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", sortOption === "title" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300")}
                                    >
                                        {t("sort_az")}
                                    </button>
                                </div>
                                {canEdit && (
                                    <Link href="/dashboard/blog/new">
                                        <Button size="lg" className="h-14 rounded-2xl px-6 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:shadow-indigo-300 transition-all bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                                            <Plus className="h-5 w-5 mr-2" /> {t("new_entry")}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium px-1">
                            <span>{t("total_entries")} {posts.length}</span>
                            <span>•</span>
                            <span>{t("last_updated")}</span>
                        </div>
                    </div>

                    {/* Pinned Section */}
                    {pinnedPosts.length > 0 && (
                        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                <Pin className="h-4 w-4 text-indigo-500 fill-indigo-500" /> {t("pinned")}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pinnedPosts.map(post => (
                                    <BlogCard key={post.id} post={post} canEdit={canEdit} onTogglePin={togglePin} onDelete={deleteBlogPost} isPinned />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Masonry Grid */}
                    <div className="mt-8">
                        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            <LayoutGrid className="h-4 w-4 text-slate-400" /> {t("recent_entries")}
                        </div>
                        {loading ? (
                            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse break-inside-avoid" />)}
                            </div>
                        ) : unpinnedPosts.length === 0 && pinnedPosts.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="h-10 w-10 text-indigo-400 dark:text-slate-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">{t("empty_garden")}</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">{t("empty_garden_desc")}</p>
                            </div>
                        ) : (
                            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 pb-20">
                                {unpinnedPosts.map(post => (
                                    <div key={post.id} className="break-inside-avoid">
                                        <BlogCard post={post} canEdit={canEdit} onTogglePin={togglePin} onDelete={deleteBlogPost} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

function BlogCard({ post, canEdit, onTogglePin, onDelete, isPinned }: { post: BlogPost, canEdit: boolean, onTogglePin: any, onDelete: any, isPinned?: boolean }) {

    // Determine gradient based on title length/char to make it consistent but varied
    const gradients = [
        "from-indigo-400 to-cyan-400",
        "from-fuchsia-400 to-pink-400",
        "from-amber-400 to-orange-400",
        "from-emerald-400 to-teal-400",
        "from-blue-400 to-indigo-400",
    ]
    const gradient = gradients[post.title.length % gradients.length];

    const tags = post.tags && post.tags.length > 0 ? post.tags : [post.title.split(' ')[0] || "General"];

    return (
        <Link href={`/dashboard/blog/view/${post.id}`}>
            <div className={cn(
                "group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300",
                isPinned ? "ring-2 ring-indigo-500/10 dark:ring-indigo-500/30" : ""
            )}>
                {/* Cover Image Area */}
                {/* Cover Image Area */}
                <div className={cn("h-32 w-full bg-gradient-to-br relative flex flex-col justify-between overflow-hidden", gradient)}>
                    {/* Background Image if exists */}
                    {post.coverImage && (
                        <div className="absolute inset-0 z-0">
                            <img
                                src={post.coverImage}
                                alt={post.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                        </div>
                    )}

                    {/* Overlay Icons */}
                    <div className={cn("absolute top-0 left-0 w-full h-full transition-colors z-10", !post.coverImage && "bg-black/5 dark:bg-black/20 group-hover:bg-black/0")} />

                    <div className="relative z-20 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4">
                        {canEdit && (
                            <button
                                onClick={(e) => onTogglePin(e, post)}
                                className={cn("p-1.5 rounded-full backdrop-blur-md transition-colors", post.pinned ? "bg-white text-indigo-600" : "bg-white/20 text-white hover:bg-white/40")}
                            >
                                <Pin className="h-3.5 w-3.5 fill-current" />
                            </button>
                        )}
                        {canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button onClick={e => e.preventDefault()} className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 backdrop-blur-md">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 rounded-xl p-2 gap-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
                                    <Link href={`/dashboard/blog/edit/${post.id}`} onClick={e => e.stopPropagation()}>
                                        <DropdownMenuItem className="rounded-lg cursor-pointer">
                                            <Pencil className="h-4 w-4 mr-2 text-slate-400" /> {canEdit ? "Edit" : ""}
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); onDelete(post.id); toast.success("Deleted") }}
                                        className="rounded-lg cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Default Icon if no cover image (simulated) */}
                    {!post.coverImage && (
                        <div className="self-center mt-2 transform group-hover:scale-110 transition-transform duration-500 relative z-10">
                            {post.title.toLowerCase().includes("code") ? <FileText className="h-10 w-10 text-white/90 drop-shadow-md" /> :
                                post.title.toLowerCase().includes("idea") ? <Star className="h-10 w-10 text-white/90 drop-shadow-md" /> :
                                    <BookOpen className="h-10 w-10 text-white/90 drop-shadow-md" />}
                        </div>
                    )}
                </div>

                <div className="p-5">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                #{tag}
                            </span>
                        ))}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {post.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {post.excerpt || post.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                        <span className="text-xs font-medium text-slate-400">
                            {post.createdAt ? format(post.createdAt.toDate(), 'MMMM d') : 'Just now'}
                        </span>
                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {post.title.charAt(0)}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
