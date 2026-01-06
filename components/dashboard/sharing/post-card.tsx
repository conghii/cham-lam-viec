"use client"

import { useState } from "react"
import { type Post, type Attachment, toggleLikePost, deletePost, addComment, subscribeToComments, type SocialComment } from "@/lib/firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, Share2, MoreVertical, Trash2, Send, Target, CheckSquare, StickyNote } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreatePostDialog } from "./create-post-dialog"
import { ViewAttachmentDialog } from "./view-attachment-dialog"
import { Edit } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner";

export function PostCard({ post, currentUserId }: { post: Post, currentUserId?: string }) {
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
        <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 flex flex-row items-start gap-3 space-y-0">
                <Link href={`/dashboard/profile/${post.authorId}`} className="cursor-pointer hover:opacity-80 transition-opacity">
                    <Avatar>
                        <AvatarImage src={post.author?.photoURL} />
                        <AvatarFallback>{post.author?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <Link href={`/dashboard/profile/${post.authorId}`} className="hover:underline">
                                <p className="font-semibold text-sm">{post.author?.displayName || "Unknown"}</p>
                            </Link>
                            <p className="text-xs text-muted-foreground">
                                {post.createdAt ? formatDistanceToNow(post.createdAt.toDate()) : "Just now"} ago
                            </p>
                        </div>
                        {currentUserId === post.authorId && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <CreatePostDialog postToEdit={post}>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                                            <Edit className="h-4 w-4 mr-2" /> Edit
                                        </DropdownMenuItem>
                                    </CreatePostDialog>
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 cursor-pointer">
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                {/* Text Content */}
                <div className="space-y-1">
                    {post.title && (
                        post.title.includes('<') ? (
                            <div
                                className="font-bold text-lg leading-tight"
                                dangerouslySetInnerHTML={{ __html: post.title }}
                            />
                        ) : (
                            <div className="font-bold text-lg leading-tight">
                                {post.title}
                            </div>
                        )
                    )}
                    {post.content.includes('<') ? (
                        <div
                            className="text-sm text-foreground/90 prose-content dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                    ) : (
                        <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                            {post.content}
                        </div>
                    )}
                </div>

                {/* Attachments - Others */}
                {otherAttachments.length > 0 && (
                    <div className="grid gap-2">
                        {otherAttachments.map(att => (
                            <ViewAttachmentDialog key={att.id} attachment={att}>
                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors cursor-pointer group">
                                    <div className={cn("h-10 w-10 rounded-md flex items-center justify-center shrink-0 shadow-sm",
                                        att.type === 'goal' ? "bg-emerald-100 text-emerald-600" :
                                            att.type === 'task' ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                                    )}>
                                        {att.type === 'goal' && <Target className="h-5 w-5" />}
                                        {att.type === 'task' && <CheckSquare className="h-5 w-5" />}
                                        {att.type === 'note' && <StickyNote className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{att.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{att.preview || capitalize(att.type)}</p>
                                    </div>
                                </div>
                            </ViewAttachmentDialog>
                        ))}
                    </div>
                )}

                {/* Images */}
                {displayImages.length > 0 && (
                    <div className={cn("grid gap-1 rounded-lg overflow-hidden", displayImages.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                        {displayImages.map((img, i) => (
                            <div key={img.id} className="relative aspect-video bg-muted">
                                <img src={img.preview || (img.id.startsWith('http') ? img.id : '')} alt="Post image" className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="font-normal text-xs px-2 py-0.5 pointer-events-none">
                                #{tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-0 border-t bg-muted/5 flex flex-col">
                <div className="flex items-center justify-between p-2 w-full">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLike}
                        className={cn("gap-2 flex-1 justify-center h-9", effectiveLiked && "text-rose-500 hover:text-rose-600 hover:bg-rose-50")}
                    >
                        <Heart className={cn("h-4 w-4", effectiveLiked && "fill-current")} />
                        <span className="text-xs font-medium">{likes.length + (effectiveLiked && !isLiked ? 1 : (!effectiveLiked && isLiked ? -1 : 0))} Likes</span>
                    </Button>
                    <Separator orientation="vertical" className="h-4" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                        className="gap-2 flex-1 justify-center h-9"
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">{post.commentsCount} Comments</span>
                    </Button>
                    <Separator orientation="vertical" className="h-4" />
                    <Button variant="ghost" size="sm" className="gap-2 flex-1 justify-center h-9">
                        <Share2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Share</span>
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

    useEffect(() => {
        const unsub = subscribeToComments(postId, (data) => setComments(data))
        return () => unsub()
    }, [postId])

    const handleSend = async () => {
        if (!newComment.trim()) return
        await addComment(postId, newComment)
        setNewComment("")
    }

    return (
        <div className="w-full border-t bg-background p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <ScrollArea className="max-h-[200px]">
                <div className="space-y-3 pr-4">
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-2.5 text-sm group">
                            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                <AvatarImage src={c.author?.photoURL} />
                                <AvatarFallback className="text-[10px]">{c.author?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="bg-muted/40 p-2.5 rounded-2xl rounded-tl-none">
                                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                        <span className="font-semibold text-xs text-foreground/90">{c.author?.displayName}</span>
                                        <span className="text-[10px] text-muted-foreground">{c.createdAt ? formatDistanceToNow(c.createdAt.toDate()) : "now"}</span>
                                    </div>
                                    <p className="text-foreground text-sm leading-relaxed">{c.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && <p className="text-xs text-center text-muted-foreground py-4">No comments yet. Start the conversation!</p>}
                </div>
            </ScrollArea>
            <div className="flex items-center gap-2 pt-1 relative">
                <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback>Me</AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                    <Input
                        placeholder="Write a comment..."
                        className="min-h-[36px] h-9 text-sm pr-10 rounded-full bg-muted/40 border-transparent focus:bg-background focus:border-input transition-all"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-0.5 h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
                        onClick={handleSend}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}
