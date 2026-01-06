"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Image as ImageIcon, X, Trash2, Target, CheckSquare, StickyNote, PenTool, Loader2, Smile } from "lucide-react"
import { uploadFile } from "@/lib/firebase/storage"
import { createPost, updatePost, type Post, type Attachment, subscribeToGoals, subscribeToTasks, subscribeToNotes, subscribeToBlogPosts, type Goal, type Task, type Note, type BlogPost } from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Globe, Users as UsersIcon } from "lucide-react"

// Dynamic import for emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

export function CreatePostDialog({ children, onPostCreated, postToEdit }: { children: React.ReactNode, onPostCreated?: () => void, postToEdit?: Post }) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [tags, setTags] = useState("")
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState("")
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [visibility, setVisibility] = useState<'public' | 'private'>('public')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const contentRef = useRef<HTMLTextAreaElement>(null)

    // Data for attachments
    const [myGoals, setMyGoals] = useState<Goal[]>([])
    const [myTasks, setMyTasks] = useState<Task[]>([])
    const [myNotes, setMyNotes] = useState<Note[]>([])
    const [myBlogs, setMyBlogs] = useState<BlogPost[]>([])
    const [user] = useState(auth.currentUser)

    // Load data when dialog opens
    useEffect(() => {
        if (!open || !user) return

        if (postToEdit) {
            setTitle(postToEdit.title || "")
            setContent(postToEdit.content || "")
            setTags(postToEdit.tags.join(", "))
            setAttachments(postToEdit.attachments || [])
            setVisibility(postToEdit.visibility || 'public')
            // Handle images separately if needed, but for now we assume attachments cover it or we don't edit raw images easily without re-upload
        }

        const unsubGoals = subscribeToGoals((data) => setMyGoals(data))
        const unsubTasks = subscribeToTasks((data) => setMyTasks(data))
        const unsubNotes = subscribeToNotes((data) => setMyNotes(data))
        const unsubBlogs = subscribeToBlogPosts((data) => setMyBlogs(data))

        return () => {
            unsubGoals()
            unsubTasks()
            unsubNotes()
            unsubBlogs()
        }
    }, [open, user, postToEdit])

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setSelectedImage(file)
            const reader = new FileReader()
            reader.onload = (ev) => setImagePreview(ev.target?.result as string)
            reader.readAsDataURL(file)
        }
    }

    const handleRemoveImage = () => {
        setSelectedImage(null)
        setImagePreview("")
    }

    const handleAddAttachment = (type: Attachment['type'], item: any) => {
        const preview = item.description || (type === 'goal' ? `${item.progress}% Progress` : undefined)
        const newAttachment: Attachment = {
            type,
            id: item.id || Math.random().toString(36), // Fallback
            title: item.title || "Untitled",
            ...(preview ? { preview } : {})
        }
        // Avoid duplicates
        if (!attachments.some(a => a.id === newAttachment.id)) {
            setAttachments([...attachments, newAttachment])
        }
    }

    const handleRemoveAttachment = (id: string) => {
        setAttachments(attachments.filter(a => a.id !== id))
    }

    const handleEmojiClick = (emojiData: any) => {
        const emoji = emojiData.emoji
        const textarea = contentRef.current
        if (textarea) {
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            const newContent = content.substring(0, start) + emoji + content.substring(end)
            setContent(newContent)
            // Set cursor position after emoji
            setTimeout(() => {
                textarea.focus()
                textarea.setSelectionRange(start + emoji.length, start + emoji.length)
            }, 0)
        } else {
            setContent(content + emoji)
        }
        setShowEmojiPicker(false)
    }

    const handleSubmit = async () => {
        if (!content && !selectedImage && attachments.length === 0) return

        setIsLoading(true)
        try {
            let imageUrls: string[] = []
            let finalAttachments = [...attachments]

            if (selectedImage) {
                const url = await uploadFile(selectedImage, `posts/${user?.uid}/${Date.now()}_${selectedImage.name}`)
                imageUrls.push(url)

                // Add image as attachment too for consistency
                finalAttachments.push({
                    type: 'image',
                    id: url,
                    title: 'Image',
                    preview: url
                })
            }

            const tagList = tags.split(',').map(t => t.trim()).filter(t => t)

            if (postToEdit) {
                await updatePost(postToEdit.id, {
                    content,
                    title,
                    tags: tagList,
                    attachments: JSON.parse(JSON.stringify(finalAttachments)),
                    visibility,
                    // Merge new images with existing? For simplicity, we just add new ones to existing attachments if they are not already there.
                    // But here we are rebuilding attachments.
                })
            } else {
                await createPost(
                    content,
                    imageUrls,
                    tagList,
                    title,
                    "", // description removed
                    JSON.parse(JSON.stringify(finalAttachments)), // Deep sanitize to remove any undefined
                    visibility
                )
            }

            // Reset
            setTitle("")
            setContent("")
            setTags("")
            handleRemoveImage()
            setAttachments([])
            setVisibility('public')
            setOpen(false)
            onPostCreated?.()

        } catch (error) {
            console.error("Failed to post", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>{postToEdit ? "Edit Post" : "Create Post"}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Main Editor */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        <Input
                            placeholder="Post Title (optional)"
                            className="font-bold text-lg border-none px-0 focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/50"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                        <div className="relative">
                            <Textarea
                                ref={contentRef}
                                placeholder="What's on your mind? Share your knowledge..."
                                className="min-h-[150px] resize-none border-none p-0 focus-visible:ring-0 shadow-none text-base pr-10"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                            />
                            <div className="absolute top-2 right-2 flex gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-muted"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <Smile className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                            {showEmojiPicker && (
                                <div className="absolute top-12 right-0 z-50 shadow-lg">
                                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                                </div>
                            )}
                        </div>

                        {/* Attachments Display */}
                        {(imagePreview || attachments.length > 0) && (
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {imagePreview && (
                                    <div className="relative group rounded-md overflow-hidden border">
                                        <img src={imagePreview} className="w-full h-32 object-cover" />
                                        <button onClick={handleRemoveImage} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                                {attachments.filter(a => a.type !== 'image').map(att => (
                                    <div key={att.id} className="relative group flex items-center gap-3 p-3 rounded-md bg-secondary/30 border">
                                        <div className={cn("h-8 w-8 rounded flex items-center justify-center shrink-0",
                                            att.type === 'goal' ? "bg-emerald-100 text-emerald-600" :
                                                att.type === 'task' ? "bg-blue-100 text-blue-600" :
                                                    att.type === 'note' ? "bg-orange-100 text-orange-600" : "bg-purple-100 text-purple-600"
                                        )}>
                                            {att.type === 'goal' && <Target className="h-4 w-4" />}
                                            {att.type === 'task' && <CheckSquare className="h-4 w-4" />}
                                            {att.type === 'note' && <StickyNote className="h-4 w-4" />}
                                            {att.type === 'blog' && <PenTool className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{att.title}</p>
                                            <p className="text-xs text-muted-foreground truncate capitalize">{att.type}</p>
                                        </div>
                                        <button onClick={() => handleRemoveAttachment(att.id)} className="absolute top-1 right-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Tools */}
                    <div className="w-full md:w-[280px] bg-muted/10 border-l flex flex-col">
                        <Tabs defaultValue="media" className="flex-1 flex flex-col">
                            <TabsList className="w-full justify-start rounded-none h-10 border-b bg-transparent p-0">
                                <TabsTrigger value="media" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Media</TabsTrigger>
                                <TabsTrigger value="goals" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Goals</TabsTrigger>
                                <TabsTrigger value="tasks" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Tasks</TabsTrigger>
                                <TabsTrigger value="notes" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Notes</TabsTrigger>
                                <TabsTrigger value="blogs" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Blogs</TabsTrigger>
                            </TabsList>

                            <TabsContent value="media" className="flex-1 p-4">
                                <Label className="block mb-2 text-xs font-medium uppercase text-muted-foreground">Add Image</Label>
                                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageSelect} />
                                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-xs text-muted-foreground">Click or Drop image here</p>
                                </div>
                                <Separator className="my-4" />
                                <Label className="block mb-2 text-xs font-medium uppercase text-muted-foreground">Tags</Label>
                                <Input
                                    placeholder="e.g. learning, fitness"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    className="bg-background"
                                />
                            </TabsContent>

                            <TabsContent value="goals" className="flex-1 p-0 overflow-hidden flex flex-col">
                                <div className="p-3 border-b bg-muted/10">
                                    <p className="text-xs text-muted-foreground">Select a goal to attach</p>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-1">
                                        {myGoals.map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => handleAddAttachment('goal', g)}
                                                className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center gap-2 group"
                                            >
                                                <Target className="h-3.5 w-3.5 text-emerald-500" />
                                                <span className="truncate flex-1">{g.title}</span>
                                                <span className="text-[10px] text-muted-foreground">{g.progress}%</span>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="tasks" className="flex-1 p-0 overflow-hidden flex flex-col">
                                <div className="p-3 border-b bg-muted/10">
                                    <p className="text-xs text-muted-foreground">Select a task to attach</p>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-1">
                                        {myTasks.filter(t => !t.completed).map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => handleAddAttachment('task', t)}
                                                className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center gap-2"
                                            >
                                                <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
                                                <span className="truncate flex-1">{t.title}</span>
                                            </button>
                                        ))}
                                        {myTasks.length === 0 && <p className="text-xs text-center p-4 text-muted-foreground">No active tasks</p>}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="notes" className="flex-1 p-0 overflow-hidden flex flex-col">
                                <div className="p-3 border-b bg-muted/10">
                                    <p className="text-xs text-muted-foreground">Select a note to attach</p>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-1">
                                        {myNotes.map(n => (
                                            <button
                                                key={n.id}
                                                onClick={() => handleAddAttachment('note', n)}
                                                className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center gap-2"
                                            >
                                                <StickyNote className="h-3.5 w-3.5 text-orange-500" />
                                                <span className="truncate flex-1">{n.title || "Untitled Note"}</span>
                                            </button>
                                        ))}
                                        {myNotes.length === 0 && <p className="text-xs text-center p-4 text-muted-foreground">No notes found</p>}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="blogs" className="flex-1 p-0 overflow-hidden flex flex-col">
                                <div className="p-3 border-b bg-muted/10">
                                    <p className="text-xs text-muted-foreground">Select a blog post to attach</p>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-1">
                                        {myBlogs.map(b => (
                                            <button
                                                key={b.id}
                                                onClick={() => handleAddAttachment('blog', b)}
                                                className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center gap-2"
                                            >
                                                <PenTool className="h-3.5 w-3.5 text-purple-500" />
                                                <span className="truncate flex-1">{b.title || "Untitled Blog"}</span>
                                            </button>
                                        ))}
                                        {myBlogs.length === 0 && <p className="text-xs text-center p-4 text-muted-foreground">No blog posts found</p>}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <div className="p-3 border-t bg-muted/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                            <SelectTrigger className="w-[140px] h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-3 w-3" />
                                        <span>Global Feed</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="private">
                                    <div className="flex items-center gap-2">
                                        <UsersIcon className="h-3 w-3" />
                                        <span>My Circle</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            {visibility === 'public' ? 'Everyone can see' : 'Only friends can see'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSubmit} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {postToEdit ? "Update Post" : "Publish Post"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
