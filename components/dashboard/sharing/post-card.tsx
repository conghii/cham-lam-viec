"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { type Post, type Attachment, toggleLikePost, deletePost, addComment, subscribeToComments, type SocialComment, type Friendship, sendFriendRequest } from "@/lib/firebase/firestore"
import { useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Send, Target, CheckSquare, StickyNote, Globe, Users, UserPlus, Clock, Smile, ThumbsUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreatePostDialog } from "./create-post-dialog"
import { ViewAttachmentDialog } from "./view-attachment-dialog"
import { Edit } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner";

// Dynamic import for emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

export function PostCard({ post, currentUserId, friendships = [] }: { post: Post, currentUserId?: string, friendships?: Friendship[] }) {
    const [requestLoading, setRequestLoading] = useState(false)

    // Find friendship with author
    const friendship = friendships.find(f =>
        (f.requesterId === currentUserId && f.recipientId === post.authorId) ||
        (f.requesterId === post.authorId && f.recipientId === currentUserId)
    )

    const isFriend = friendship?.status === 'accepted'
    const isPending = friendship?.status === 'pending'
    const canAddFriend = currentUserId && post.authorId !== currentUserId && !friendship

    const handleAddFriend = async () => {
        if (!currentUserId || !post.authorId || requestLoading) return
        setRequestLoading(true)
        try {
            await sendFriendRequest(post.authorId)
            toast.success("Friend request sent!")
        } catch (e) {
            toast.error("Failed to send request")
        } finally {
            setRequestLoading(false)
        }
    }

    const likes = post.likes || []
    const isLiked = currentUserId && likes.includes(currentUserId)
    const [showComments, setShowComments] = useState(false)
    const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null)
    const effectiveLiked = optimisticLiked !== null ? optimisticLiked : isLiked

    const handleLike = () => {
        if (!currentUserId) return
        const newVal = !effectiveLiked
        setOptimisticLiked(newVal)
        toggleLikePost(post.id, currentUserId, !newVal).catch(() => setOptimisticLiked(!newVal))
    }

    const handleDelete = async () => {
        try {
            await deletePost(post.id);
            toast.success("Post deleted");
        } catch (error) {
            toast.error("Failed to delete post");
        }
    };

    // Determine attachments excluding main images if handled separately
    // But schema says main images are also attachments now ideally. 
    // We render Attachments array first.

    // Split attachments into images and others
    // Safe access to attachments
    const safeAttachments = Array.isArray(post.attachments) ? post.attachments : []
    const imageAttachments = safeAttachments.filter(a => a.type === 'image')
    const otherAttachments = safeAttachments.filter(a => a.type !== 'image')
    const legacyImages = (safeAttachments.length === 0 && post.images?.length > 0)
        ? post.images.map((img, i) => ({ type: 'image' as const, id: `legacy-${i}`, title: 'Image', preview: img }))
        : []

    const displayImages = [...imageAttachments, ...legacyImages]

    return (
        <Card className="overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-white">
            <CardHeader className="p-5 flex flex-row items-start gap-4 space-y-0">
                <Link href={`/dashboard/profile/${post.authorId}`} className="cursor-pointer hover:opacity-80 transition-opacity">
                    <Avatar className="h-11 w-11 border border-slate-100">
                        <AvatarImage src={post.author?.photoURL} />
                        <AvatarFallback>{post.author?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center">
                                <Link href={`/dashboard/profile/${post.authorId}`} className="hover:underline">
                                    <p className="font-bold text-slate-900 text-[15px]">{post.author?.displayName || "Unknown"}</p>
                                </Link>
                                {canAddFriend && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/5 gap-1 ml-2 rounded-full"
                                        onClick={handleAddFriend}
                                        disabled={requestLoading}
                                    >
                                        <UserPlus className="h-3 w-3" />
                                        Add
                                    </Button>
                                )}
                                {isPending && (
                                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[9px] font-normal gap-1 bg-amber-50 text-amber-600 border-amber-200">
                                        <Clock className="h-2.5 w-2.5" />
                                        Pending
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-0.5">
                                <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate()) : "Just now"} ago</span>
                                <span>•</span>
                                {post.visibility === 'private' ? (
                                    <div className="flex items-center gap-1" title="Only visible to circle">
                                        <Users className="h-3 w-3" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1" title="Visible to everyone">
                                        <Globe className="h-3 w-3" />
                                    </div>
                                )}
                            </div>
                        </div>
                        {currentUserId === post.authorId && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl border-slate-100">
                                    <CreatePostDialog postToEdit={post}>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                                            <Edit className="h-4 w-4 mr-2" /> Edit Post
                                        </DropdownMenuItem>
                                    </CreatePostDialog>
                                    <DropdownMenuItem onClick={handleDelete} className="text-rose-600 cursor-pointer focus:text-rose-600 focus:bg-rose-50">
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-5 pb-5 pt-0 space-y-4">
                {/* Text Content */}
                <div className="space-y-1">
                    {post.title && (
                        post.title.includes('<') ? (
                            <div
                                className="font-bold text-lg leading-tight text-slate-900 mb-2"
                                dangerouslySetInnerHTML={{ __html: post.title }}
                            />
                        ) : (
                            <div className="font-bold text-lg leading-tight text-slate-900 mb-2">
                                {post.title}
                            </div>
                        )
                    )}
                    {post.content.includes('<') ? (
                        <div
                            className="text-[15px] text-slate-700 leading-relaxed prose-sm"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                    ) : (
                        <div className="whitespace-pre-wrap text-[15px] text-slate-700 leading-relaxed">
                            {post.content}
                        </div>
                    )}
                </div>

                {/* Attachments - Others */}
                {otherAttachments.length > 0 && (
                    <div className="grid gap-2">
                        {otherAttachments.map(att => (
                            <ViewAttachmentDialog key={att.id} attachment={att}>
                                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-white border border-slate-100",
                                        att.type === 'goal' ? "text-emerald-500" :
                                            att.type === 'task' ? "text-blue-500" : "text-amber-500"
                                    )}>
                                        {att.type === 'goal' && <Target className="h-5 w-5" />}
                                        {att.type === 'task' && <CheckSquare className="h-5 w-5" />}
                                        {att.type === 'note' && <StickyNote className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-700 text-sm truncate group-hover:text-primary transition-colors">{att.title}</p>
                                        <p className="text-xs text-slate-500 truncate font-medium">{att.preview || capitalize(att.type)}</p>
                                    </div>
                                </div>
                            </ViewAttachmentDialog>
                        ))}
                    </div>
                )}

                {/* Images */}
                {displayImages.length > 0 && (
                    <div className={cn("grid gap-1.5 rounded-2xl overflow-hidden border border-slate-100", displayImages.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                        {displayImages.map((img, i) => (
                            <div key={img.id} className="relative aspect-video bg-slate-100">
                                <img src={img.preview || (img.id.startsWith('http') ? img.id : '')} alt="Post image" className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {post.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="font-medium text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 pointer-events-none border-transparent">
                                #{tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>

            <Separator className="bg-slate-50" />

            <CardFooter className="p-2 flex flex-col bg-white">
                <div className="flex items-center justify-between w-full px-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLike}
                        className={cn("gap-2 flex-1 justify-center h-10 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors", effectiveLiked && "text-rose-600 bg-rose-50")}
                    >
                        <Heart className={cn("h-4.5 w-4.5 transition-transform active:scale-95", effectiveLiked && "fill-current")} />
                        <span className="text-sm font-semibold">
                            {likes.length + (effectiveLiked && !isLiked ? 1 : (!effectiveLiked && isLiked ? -1 : 0))}
                            <span className="hidden sm:inline ml-1">Likes</span>
                        </span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                        className={cn("gap-2 flex-1 justify-center h-10 rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors", showComments && "text-blue-600 bg-blue-50")}
                    >
                        <MessageCircle className="h-4.5 w-4.5" />
                        <span className="text-sm font-semibold">
                            {post.commentsCount}
                            <span className="hidden sm:inline ml-1">Comments</span>
                        </span>
                    </Button>

                    <Button variant="ghost" size="sm" className="gap-2 flex-1 justify-center h-10 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Share2 className="h-4.5 w-4.5" />
                        <span className="text-sm font-semibold">Share</span>
                    </Button>
                </div>
                {showComments && <CommentSection postId={post.id} />}
            </CardFooter>
        </Card>
    )
}

function CommentSection({ postId }: { postId: string }) {
    const [comments, setComments] = useState<SocialComment[]>([])
    const [newComment, setNewComment] = useState("")
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const commentInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const unsub = subscribeToComments(postId, (data) => setComments(data))
        return () => unsub()
    }, [postId])

    const handleSend = async () => {
        if (!newComment.trim()) return
        await addComment(postId, newComment)
        setNewComment("")
        setShowEmojiPicker(false)
    }

    const handleEmojiClick = (emojiData: any) => {
        const emoji = emojiData.emoji
        const input = commentInputRef.current
        if (input) {
            const start = input.selectionStart || 0
            const end = input.selectionEnd || 0
            const newText = newComment.substring(0, start) + emoji + newComment.substring(end)
            setNewComment(newText)
            // Set cursor position after emoji
            setTimeout(() => {
                input.focus()
                input.setSelectionRange(start + emoji.length, start + emoji.length)
            }, 0)
        } else {
            setNewComment(newComment + emoji)
        }
        setShowEmojiPicker(false)
    }

    return (
        <div className="w-full border-t border-slate-50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <ScrollArea className="max-h-[300px]">
                <div className="space-y-4 pr-3">
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-3 text-sm group">
                            <Avatar className="h-8 w-8 shrink-0 mt-0.5 border border-slate-100">
                                <AvatarImage src={c.author?.photoURL} />
                                <AvatarFallback className="text-[10px] text-slate-500 bg-slate-50">{c.author?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="bg-slate-50/80 p-3 rounded-2xl rounded-tl-none hover:bg-slate-100 transition-colors">
                                    <div className="flex items-baseline justify-between gap-2 mb-1">
                                        <span className="font-bold text-xs text-slate-900">{c.author?.displayName}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{c.createdAt ? formatDistanceToNow(c.createdAt.toDate()) : "now"}</span>
                                    </div>
                                    <p className="text-slate-700 text-[14px] leading-relaxed">{c.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && <p className="text-sm text-center text-slate-400 py-6 italic">No comments yet. Start the conversation!</p>}
                </div>
            </ScrollArea>
            <div className="flex items-center gap-3 pt-2 relative">
                <Avatar className="h-8 w-8 shrink-0 border border-slate-100">
                    <AvatarFallback className="bg-slate-50 text-slate-500 text-xs">Me</AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                    <Input
                        ref={commentInputRef}
                        placeholder="Write a comment..."
                        className="min-h-[42px] h-11 text-[15px] pr-20 rounded-full bg-slate-50 border-transparent focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-100 transition-all font-medium placeholder:text-slate-400"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <div className="absolute right-1.5 top-1.5 flex gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                            <Smile className="h-5 w-5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className={cn("h-8 w-8 rounded-full transition-all", newComment.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-slate-300 pointer-events-none")}
                            onClick={handleSend}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    {showEmojiPicker && (
                        <div className="absolute bottom-14 right-0 z-50">
                            <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}
