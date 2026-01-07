"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Image as ImageIcon, X, Target, CheckSquare, StickyNote, PenTool, Loader2, Smile, Cloud } from "lucide-react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
                })
            } else {
                await createPost(
                    content,
                    imageUrls,
                    tagList,
                    title,
                    "",
                    JSON.parse(JSON.stringify(finalAttachments)),
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
            <DialogContent className="!max-w-[800px] h-[75vh] flex flex-col md:flex-row p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900 sm:rounded-2xl">
                <DialogTitle className="sr-only">Create New Post</DialogTitle>

                {/* LEFT: WRITING STUDIO */}
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 relative">
                    {/* Header: User Info */}
                    <div className="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-slate-100 dark:border-slate-800">
                                <AvatarImage src={user?.photoURL || undefined} />
                                <AvatarFallback className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{user?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.displayName}</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Drafting a new story...</p>
                            </div>
                        </div>
                    </div>

                    {/* Writing Area */}
                    <div className="flex-1 overflow-y-auto px-8 pb-8">
                        <Input
                            placeholder="Title..."
                            className="text-4xl font-black border-none px-0 focus-visible:ring-0 shadow-none placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-transparent h-auto py-2 mb-2 font-serif tracking-tight dark:text-white"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                        <div className="relative">
                            <Textarea
                                ref={contentRef}
                                placeholder="Tell your story. What's on your mind?"
                                className="min-h-[400px] resize-none border-none p-0 focus-visible:ring-0 shadow-none text-lg leading-loose text-slate-700 dark:text-slate-300 bg-transparent placeholder:text-slate-300 dark:placeholder:text-slate-700 font-serif"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                            />

                            {/* Emoji Button Floating */}
                            <div className="absolute top-0 right-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-transparent"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <Smile className="h-5 w-5" />
                                </Button>
                            </div>
                            {showEmojiPicker && (
                                <div className="absolute top-10 right-0 z-50 shadow-xl rounded-xl">
                                    <EmojiPicker onEmojiClick={handleEmojiClick} lazyLoadEmojis={true} />
                                </div>
                            )}
                        </div>

                        {/* Attachments Preview in Writing Area */}
                        {(imagePreview || attachments.length > 0) && (
                            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50 dark:border-slate-800">
                                {imagePreview && (
                                    <div className="relative group rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <img src={imagePreview} className="w-full h-40 object-cover" />
                                        <button onClick={handleRemoveImage} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                                {attachments.filter(a => a.type !== 'image').map(att => (
                                    <div key={att.id} className="relative group flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100/50 dark:border-slate-700/50">
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5",
                                            att.type === 'goal' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                                                att.type === 'task' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                                                    att.type === 'note' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                                        )}>
                                            {att.type === 'goal' && <Target className="h-5 w-5" />}
                                            {att.type === 'task' && <CheckSquare className="h-5 w-5" />}
                                            {att.type === 'note' && <StickyNote className="h-5 w-5" />}
                                            {att.type === 'blog' && <PenTool className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{att.title}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate capitalize font-medium">{att.type}</p>
                                        </div>
                                        <button onClick={() => handleRemoveAttachment(att.id)} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: SIDEBAR TOOLS */}
                <div className="w-full md:w-[320px] bg-slate-50 dark:bg-slate-950 flex flex-col h-[400px] md:h-auto border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 relative">
                    {/* Close Button Mobile */}
                    <div className="absolute top-4 right-4 md:hidden z-10">
                        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button>
                    </div>

                    <Tabs defaultValue="media" className="flex-1 flex flex-col">
                        <div className="px-6 pt-6 pb-2">
                            <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 w-full justify-between h-auto">
                                <TabsTrigger value="media" className="rounded-full h-8 w-8 p-0 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-400"><ImageIcon className="h-4 w-4" /></TabsTrigger>
                                <TabsTrigger value="goals" className="rounded-full h-8 w-8 p-0 data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-slate-400"><Target className="h-4 w-4" /></TabsTrigger>
                                <TabsTrigger value="tasks" className="rounded-full h-8 w-8 p-0 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-slate-400"><CheckSquare className="h-4 w-4" /></TabsTrigger>
                                <TabsTrigger value="notes" className="rounded-full h-8 w-8 p-0 data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-slate-400"><StickyNote className="h-4 w-4" /></TabsTrigger>
                                <TabsTrigger value="blogs" className="rounded-full h-8 w-8 p-0 data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 text-slate-400"><PenTool className="h-4 w-4" /></TabsTrigger>
                            </TabsList>
                        </div>

                        <Separator className="bg-slate-200/50 dark:bg-slate-800/50" />

                        <div className="flex-1 overflow-hidden flex flex-col">
                            <TabsContent value="media" className="flex-1 p-6 space-y-6 mt-0">
                                <div>
                                    <Label className="block mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cover Image</Label>
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer relative group">
                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageSelect} />
                                        <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                                            <Cloud className="h-6 w-6" />
                                        </div>
                                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Click to upload</p>
                                        <p className="text-xs text-blue-400 dark:text-blue-500 mt-1">SVG, PNG, JPG or GIF</p>
                                    </div>
                                </div>

                                <div>
                                    <Label className="block mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tags</Label>
                                    <Input
                                        placeholder="Add tags..."
                                        value={tags}
                                        onChange={e => setTags(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 dark:text-slate-200"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2">Separate with commas (e.g. design, tech, life)</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="goals" className="flex-1 flex flex-col mt-0 h-full">
                                <div className="p-4 bg-emerald-50/30 dark:bg-emerald-900/10 border-b border-emerald-100/50 dark:border-emerald-900/20">
                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <Target className="h-3 w-3" /> Select a goal to link
                                    </p>
                                </div>
                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-1">
                                        {myGoals.map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => handleAddAttachment('goal', g)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800 text-sm flex items-center gap-3 transition-all group"
                                            >
                                                <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                                                <span className="truncate flex-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{g.title}</span>
                                                <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">{g.progress}%</span>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="tasks" className="flex-1 flex flex-col mt-0 h-full">
                                <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10 border-b border-blue-100/50 dark:border-blue-900/20">
                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                        <CheckSquare className="h-3 w-3" /> Select a task to link
                                    </p>
                                </div>
                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-1">
                                        {myTasks.filter(t => !t.completed).map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => handleAddAttachment('task', t)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800 text-sm flex items-center gap-3 transition-all group"
                                            >
                                                <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                                                <span className="truncate flex-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{t.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="notes" className="flex-1 flex flex-col mt-0 h-full">
                                <div className="p-4 bg-orange-50/30 dark:bg-orange-900/10 border-b border-orange-100/50 dark:border-orange-900/20">
                                    <p className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                        <StickyNote className="h-3 w-3" /> Select a note to link
                                    </p>
                                </div>
                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-1">
                                        {myNotes.map(n => (
                                            <button
                                                key={n.id}
                                                onClick={() => handleAddAttachment('note', n)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800 text-sm flex items-center gap-3 transition-all group"
                                            >
                                                <div className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
                                                <span className="truncate flex-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{n.title || "Untitled"}</span>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="blogs" className="flex-1 flex flex-col mt-0 h-full">
                                <div className="p-4 bg-purple-50/30 dark:bg-purple-900/10 border-b border-purple-100/50 dark:border-purple-900/20">
                                    <p className="text-xs font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                                        <PenTool className="h-3 w-3" /> Select a blog to link
                                    </p>
                                </div>
                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-1">
                                        {myBlogs.map(b => (
                                            <button
                                                key={b.id}
                                                onClick={() => handleAddAttachment('blog', b)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800 text-sm flex items-center gap-3 transition-all group"
                                            >
                                                <div className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                                                <span className="truncate flex-1 font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{b.title || "Untitled"}</span>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                        <div className="flex flex-col gap-3">
                            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                                <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                    <SelectItem value="public">
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                            <span className="dark:text-slate-200">Global Feed</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="private">
                                        <div className="flex items-center gap-2">
                                            <UsersIcon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                            <span className="dark:text-slate-200">My Circle</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300">Cancel</Button>
                                <Button onClick={handleSubmit} disabled={isLoading} className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white/90 text-white dark:text-slate-900 shadow-lg shadow-slate-900/20">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
