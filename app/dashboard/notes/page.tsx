"use client"

import { useState, useEffect } from "react"
import { Plus, Search, StickyNote, Trash2, Edit2, Calendar } from "lucide-react"
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
import { Shield } from "lucide-react"

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer' | 'restricted' | null>(null);

    // Editing state
    const [currentNote, setCurrentNote] = useState<Note | null>(null)
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [assigneeIds, setAssigneeIds] = useState<string[]>([])
    const [groupIds, setGroupIds] = useState<string[]>([])

    // Org Data
    const [orgId, setOrgId] = useState<string | null>(null)
    const [members, setMembers] = useState<OrganizationMember[]>([])

    // Visibility
    const [groups, setGroups] = useState<Group[]>([])
    const [currentUser, setCurrentUser] = useState(auth.currentUser)

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

        return () => {
            unsubscribeAuth()
            unsubscribeNotes()
            unsubscribeGroups()
        }
    }, [])

    const filteredNotes = notes.filter(note => {
        // Search Filter
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        // Visibility Filter
        if (!currentUser) return false

        // 1. Author
        if (note.userId === currentUser.uid) return true

        // 2. Assigned
        if (note.assigneeIds?.includes(currentUser.uid)) return true

        // 3. Group Assigned
        const userGroupIds = groups.filter(g => g.memberIds.includes(currentUser.uid)).map(g => g.id)
        if (note.groupIds?.some(gid => userGroupIds.includes(gid))) return true

        // 4. Unassigned (Visible to all)
        const hasAssignments = (note.assigneeIds && note.assigneeIds.length > 0) || (note.groupIds && note.groupIds.length > 0)
        if (!hasAssignments) return true

        return false
    })

    const handleOpenDialog = (note?: Note) => {
        if (note) {
            setCurrentNote(note)
            setTitle(note.title)
            setContent(note.content)
            setAssigneeIds(note.assigneeIds || [])
            setGroupIds(note.groupIds || [])
        } else {
            setCurrentNote(null)
            setTitle("")
            setContent("")
            setAssigneeIds([])
            setGroupIds([])
        }
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!title.trim()) return

        setSaving(true)
        try {
            if (currentNote) {
                await updateNote(currentNote.id, title, content, assigneeIds, groupIds)
            } else {
                await addNote(title, content, assigneeIds, groupIds)
            }
            setIsDialogOpen(false)
        } catch (error) {
            console.error("Failed to save note", error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent, noteId: string) => {
        e.stopPropagation() // Prevent opening edit modal
        if (confirm("Are you sure you want to delete this note?")) {
            await deleteNote(noteId)
        }
    }

    if (userRole === 'restricted') {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="bg-destructive/10 p-4 rounded-full w-fit mx-auto">
                        <Shield className="h-10 w-10 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold">Access Restricted</h2>
                    <p className="text-muted-foreground">You do not have permission to view notes. Please contact your organization owner.</p>
                </div>
            </div>
        );
    }

    const canEdit = userRole === 'owner' || userRole === 'member';

    return (
        <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
                    <p className="text-muted-foreground mt-1">Capture ideas, lists, and thoughts.</p>
                </div>
                {canEdit && (
                    <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto gap-2 rounded-full shadow-lg hover:shadow-primary/25 transition-all">
                        <Plus className="h-4 w-4" /> New Note
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50 border-input/50 focus:bg-background transition-colors"
                />
            </div>

            {/* Notes Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-xl bg-secondary/50" />
                    ))}
                </div>
            ) : filteredNotes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl border-muted-foreground/20 bg-muted/5">
                    <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                        <StickyNote className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No notes yet</h3>
                    <p className="text-muted-foreground max-w-sm mt-2 mb-6">Create your first note to keep track of your ideas and tasks.</p>
                    <Button variant="outline" onClick={() => handleOpenDialog()}>
                        Create Note
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4 pr-2">
                    {filteredNotes.map((note) => (
                        <Card
                            key={note.id}
                            onClick={() => handleOpenDialog(note)}
                            className="relative group cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-300 border-input/40 bg-card/50 backdrop-blur-sm"
                        >
                            <CardHeader className="pb-3 space-y-0">
                                <CardTitle className="text-lg font-semibold leading-tight line-clamp-1">{note.title}</CardTitle>
                                <CardDescription className="text-xs mt-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {note.updatedAt ? format(note.updatedAt.toDate(), 'MMM d, yyyy') : 'Just now'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap leading-relaxed">
                                    {note.content || "No content..."}
                                </p>
                            </CardContent>
                            <CardFooter className="px-6 py-3 border-t bg-muted/5 flex justify-between items-center">
                                <AssigneeDisplay
                                    assigneeIds={note.assigneeIds}
                                    groupIds={note.groupIds}
                                    members={members}
                                    groups={groups}
                                />
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
                                        onClick={(e) => handleDelete(e, note.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit/Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{currentNote ? "Edit Note" : "Create New Note"}</DialogTitle>
                        <DialogDescription>
                            {currentNote ? "Update your thoughts." : "What's on your mind?"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 flex flex-col gap-4 py-4 min-h-0">
                        <Input
                            placeholder="Note Title"
                            className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto py-2"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        {orgId && (
                            <div className="flex items-center gap-2">
                                <UserGroupSelect
                                    orgId={orgId}
                                    assigneeIds={assigneeIds}
                                    groupIds={groupIds}
                                    onAssigneeChange={setAssigneeIds}
                                    onGroupChange={setGroupIds}
                                    members={members}
                                />
                            </div>
                        )}
                        <div className="flex-1 relative border rounded-md bg-secondary/20 focus-within:bg-background focus-within:ring-1 focus-within:ring-ring transition-colors">
                            <Textarea
                                placeholder="Start typing..."
                                className="w-full h-full resize-none border-none bg-transparent focus-visible:ring-0 p-4 leading-relaxed"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !title.trim()}>
                            {saving ? "Saving..." : "Save Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
