"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Search, StickyNote, Trash2, Edit2, Calendar, LayoutGrid, X, Palette, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { subscribeToNotes, addNote, updateNote, deleteNote, Note, OrganizationMember, getOrganizationMembers, getUserOrganization, Organization, subscribeToGroups, Group } from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { UserGroupSelect } from "@/components/dashboard/user-group-select"
import { AssigneeDisplay } from "@/components/dashboard/assignee-display"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Shield, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NOTE_COLORS = [
    { name: "White", value: "bg-white border-slate-200" },
    { name: "Yellow", value: "bg-yellow-100 border-yellow-200" },
    { name: "Green", value: "bg-emerald-100 border-emerald-200" },
    { name: "Blue", value: "bg-blue-100 border-blue-200" },
    { name: "Purple", value: "bg-purple-100 border-purple-200" },
    { name: "Pink", value: "bg-pink-100 border-pink-200" },
    { name: "Red", value: "bg-red-100 border-red-200" },
    { name: "Gray", value: "bg-slate-100 border-slate-200" },
]

const CATEGORIES = ["All", "Journal", "Ideas", "To-do", "Work"]

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All")

    // Quick Note State
    const [isQuickNoteExpanded, setIsQuickNoteExpanded] = useState(false)
    const [quickTitle, setQuickTitle] = useState("")
    const [quickContent, setQuickContent] = useState("")
    const [quickColor, setQuickColor] = useState(NOTE_COLORS[0].value)
    const [quickCategory, setQuickCategory] = useState("Ideas")
    const quickNoteRef = useRef<HTMLDivElement>(null)

    // Dialog Edit State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [currentNote, setCurrentNote] = useState<Note | null>(null)
    const [editColor, setEditColor] = useState(NOTE_COLORS[0].value)

    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer' | 'restricted' | null>(null);

    // Data
    const [orgId, setOrgId] = useState<string | null>(null)
    const [members, setMembers] = useState<OrganizationMember[]>([])
    const [groups, setGroups] = useState<Group[]>([])
    const [currentUser, setCurrentUser] = useState(auth.currentUser)

    // Editing logic vars (re-used for dialog)
    const [assigneeIds, setAssigneeIds] = useState<string[]>([])
    const [groupIds, setGroupIds] = useState<string[]>([])

    useEffect(() => {
        const fetchOrgData = async (uid: string) => {
            const org = await getUserOrganization(uid);
            if (org) {
                setOrgId(org.id);
                const mems = await getOrganizationMembers(org.id);
                setMembers(mems);

                const currentUserMember = mems.find(m => m.id === uid);
                if (currentUserMember) {
                    setUserRole(currentUserMember.role);
                }
            }
        }

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            setCurrentUser(user)
            if (user) {
                fetchOrgData(user.uid);
            }
        })

        const unsubscribeNotes = subscribeToNotes((fetchedNotes) => {
            setNotes(fetchedNotes)
            setLoading(false)
        })

        const unsubscribeGroups = subscribeToGroups((fetchedGroups) => {
            setGroups(fetchedGroups)
        })

        // Click outside to collapse quick note
        const handleClickOutside = (event: MouseEvent) => {
            if (quickNoteRef.current && !quickNoteRef.current.contains(event.target as Node)) {
                if (!quickTitle.trim() && !quickContent.trim()) {
                    setIsQuickNoteExpanded(false)
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside)

        return () => {
            unsubscribeAuth()
            unsubscribeNotes()
            unsubscribeGroups()
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [quickTitle, quickContent])

    const filteredNotes = notes.filter(note => {
        // Search Filter
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        // Category Filter
        if (selectedCategory !== "All" && note.category !== selectedCategory) {
            // Backward compatibility for undefined category
            if (selectedCategory === "Ideas" && !note.category) return true // Treat undefined as Ideas/General
            if (note.category && note.category !== selectedCategory) return false
        }

        // Visibility Filter (same as before)
        if (!currentUser) return false
        if (note.userId === currentUser.uid) return true
        if (note.assigneeIds?.includes(currentUser.uid)) return true
        const userGroupIds = groups.filter(g => g.memberIds.includes(currentUser.uid)).map(g => g.id)
        if (note.groupIds?.some(gid => userGroupIds.includes(gid))) return true
        const hasAssignments = (note.assigneeIds && note.assigneeIds.length > 0) || (note.groupIds && note.groupIds.length > 0)
        if (!hasAssignments) return true
        return false
    })

    const handleQuickAdd = async () => {
        if (!quickTitle.trim() && !quickContent.trim()) return

        try {
            await addNote(quickTitle, quickContent, [], [], quickColor, quickCategory)
            setQuickTitle("")
            setQuickContent("")
            setQuickColor(NOTE_COLORS[0].value)
            setIsQuickNoteExpanded(false)
            toast.success("Note created!")
        } catch (error) {
            console.error("Failed to add note", error)
            toast.error("Failed to create note")
        }
    }

    const handleOpenDialog = (note: Note) => {
        setCurrentNote(note)
        setAssigneeIds(note.assigneeIds || [])
        setGroupIds(note.groupIds || [])
        setEditColor(note.color || NOTE_COLORS[0].value)
        setIsDialogOpen(true)
    }

    // Manual Update in Dialog
    const handleUpdate = async (title: string, content: string, newColor: string, newCategory: string) => {
        if (!currentNote) return
        try {
            await updateNote(currentNote.id, title, content, assigneeIds, groupIds, newColor, newCategory)
            setIsDialogOpen(false)
            setCurrentNote(null)
            toast.success("Note updated")
        } catch (e) {
            toast.error("Failed to update")
        }
    }

    const handleDelete = async (e: React.MouseEvent, noteId: string) => {
        e.stopPropagation()
        try {
            await deleteNote(noteId)
            toast.success("Note deleted")
        } catch (error) {
            toast.error("Failed to delete note")
        }
    }

    if (userRole === 'restricted') {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <Shield className="h-12 w-12 text-destructive mx-auto" />
                    <h2 className="text-2xl font-bold">Access Restricted</h2>
                </div>
            </div>
        );
    }

    const canEdit = userRole === 'owner' || userRole === 'member';

    return (
        <div className="space-y-8 h-[calc(100vh-4rem)] flex flex-col pb-6">
            {/* Header & Quick Note Toolbar */}
            <div className="flex flex-col items-center gap-6 pt-4 sticky top-0 z-30 bg-background/80 backdrop-blur-md pb-4 border-b">

                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto w-full justify-center pb-2 no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                                selectedCategory === cat
                                    ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Quick Note Input */}
                <div
                    ref={quickNoteRef}
                    className={cn(
                        "w-full max-w-2xl bg-white rounded-xl border shadow-sm transition-all duration-300 overflow-hidden relative",
                        isQuickNoteExpanded ? "shadow-xl ring-1 ring-slate-200" : "hover:shadow-md cursor-text"
                    )}
                    onClick={() => !isQuickNoteExpanded && setIsQuickNoteExpanded(true)}
                >
                    <div className={cn("p-0 transition-colors duration-300", quickColor.split(' ')[0])}>
                        {isQuickNoteExpanded && (
                            <Input
                                value={quickTitle}
                                onChange={e => setQuickTitle(e.target.value)}
                                placeholder="Title"
                                className="border-none shadow-none focus-visible:ring-0 text-lg font-bold px-4 pt-4 pb-0 bg-transparent placeholder:text-slate-400"
                            />
                        )}
                        <Textarea
                            value={quickContent}
                            onChange={e => setQuickContent(e.target.value)}
                            placeholder="Take a note..."
                            className={cn(
                                "border-none shadow-none focus-visible:ring-0 resize-none bg-transparent placeholder:text-slate-500",
                                isQuickNoteExpanded ? "min-h-[120px] px-4 py-2 text-base" : "h-12 py-3 px-4 truncate font-medium"
                            )}
                        />

                        {isQuickNoteExpanded && (
                            <div className="flex justify-between items-center p-2 bg-white/50 backdrop-blur-sm border-t border-black/5">
                                <div className="flex gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5 text-slate-500">
                                                <Palette className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-40">
                                            <div className="grid grid-cols-4 gap-2 p-2">
                                                {NOTE_COLORS.map(c => (
                                                    <button
                                                        key={c.name}
                                                        className={cn("h-6 w-6 rounded-full border shadow-sm transition-transform hover:scale-110", c.value.split(' ')[0], c.value.split(' ')[1])}
                                                        onClick={() => setQuickColor(c.value)}
                                                        title={c.name}
                                                    />
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5 text-slate-500">
                                                <Tag className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            {CATEGORIES.filter(c => c !== "All").map(c => (
                                                <DropdownMenuItem key={c} onClick={() => setQuickCategory(c)}>
                                                    {c}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <span className="text-xs text-slate-400 self-center ml-2">{quickCategory}</span>
                                </div>
                                <Button size="sm" onClick={handleQuickAdd} className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6">
                                    Add Note
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Notes Masonry Grid */}
            {loading ? (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 px-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse break-inside-avoid" />
                    ))}
                </div>
            ) : filteredNotes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-64 h-64 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100"></div>
                        <StickyNote
                            className="w-32 h-32 text-slate-200 relative z-10"
                            strokeWidth={1}
                        />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">Your mind is clear</h3>
                    <p className="text-slate-500 max-w-sm mt-2 mb-8 text-lg">Every great idea starts with a small note.<br />Type above to capture one!</p>
                </div>
            ) : (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 px-4 pb-12">
                    {filteredNotes.map((note) => (
                        <Card
                            key={note.id}
                            onClick={() => handleOpenDialog(note)}
                            className={cn(
                                "break-inside-avoid relative group cursor-pointer hover:shadow-lg transition-all duration-300 border backdrop-blur-sm rounded-2xl overflow-hidden",
                                note.color || "bg-white border-slate-200"
                            )}
                        >
                            <CardHeader className="pb-2 space-y-1">
                                {note.title && <CardTitle className="text-lg font-bold leading-tight">{note.title}</CardTitle>}
                                <CardDescription className="text-[10px] uppercase tracking-wider opacity-60 font-semibold">{note.category || "General"}</CardDescription>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {note.content}
                                </p>
                            </CardContent>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 bg-white/50 hover:bg-red-50 hover:text-red-500 rounded-full backdrop-blur-sm"
                                    onClick={(e) => handleDelete(e, note.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <CardFooter className="px-4 py-2 bg-black/5 flex justify-between items-center text-[10px] text-slate-500">
                                <span>{note.updatedAt ? format(note.updatedAt.toDate(), 'MMM d') : 'Now'}</span>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Detailed Edit Dialog */}
            <NoteEditDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                note={currentNote}
                onSave={handleUpdate}
                orgId={orgId}
                members={members}
            />
        </div>
    )
}

function NoteEditDialog({
    open,
    onOpenChange,
    note,
    onSave,
    orgId,
    members
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    note: Note | null,
    onSave: (title: string, content: string, color: string, category: string) => void,
    orgId: string | null,
    members: OrganizationMember[]
}) {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [color, setColor] = useState(NOTE_COLORS[0].value)
    const [category, setCategory] = useState("Ideas")

    useEffect(() => {
        if (note) {
            setTitle(note.title)
            setContent(note.content)
            setColor(note.color || NOTE_COLORS[0].value)
            setCategory(note.category || "Ideas")
        } else {
            setTitle("")
            setContent("")
            setColor(NOTE_COLORS[0].value)
            setCategory("Ideas")
        }
    }, [note, open])

    const handleSave = () => {
        onSave(title, content, color, category)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("sm:max-w-2xl h-[80vh] flex flex-col transition-colors duration-500", color.split(' ')[0])}>
                <DialogHeader className="flex-row items-center justify-between space-y-0">
                    <DialogTitle className="sr-only">Note Editor</DialogTitle>
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border bg-white/50">
                                    <Palette className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="grid grid-cols-4 gap-2 p-2 w-40">
                                {NOTE_COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        className={cn("h-6 w-6 rounded-full border transition-transform hover:scale-110", c.value.split(' ')[0], c.value.split(' ')[1])}
                                        onClick={() => setColor(c.value)}
                                    />
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-2 rounded-full border bg-white/50 text-xs">
                                    <Tag className="h-3 w-3" /> {category}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {CATEGORIES.filter(c => c !== "All").map(c => (
                                    <DropdownMenuItem key={c} onClick={() => setCategory(c)}>
                                        {c}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <span className="text-xs text-slate-400">
                        {note?.updatedAt ? format(note.updatedAt.toDate(), 'MMMM d, yyyy h:mm a') : 'New Note'}
                    </span>
                </DialogHeader>

                <div className="flex-1 flex flex-col gap-4 py-4 min-h-0">
                    <Input
                        placeholder="Title"
                        className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent placeholder:text-black/20 h-auto py-2"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <Textarea
                        placeholder="Start typing..."
                        className="w-full h-full resize-none border-none bg-transparent focus-visible:ring-0 p-0 leading-loose text-lg text-slate-800"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={handleSave} className="bg-slate-900 text-white rounded-full px-6">Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
