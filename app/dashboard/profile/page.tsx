"use client"

import { useEffect, useState } from "react"
import { getCurrentUser, updateUserProfile } from "@/lib/firebase/auth"
import { getDailyWinsHistory, DailyWin, updateMemberName } from "@/lib/firebase/firestore"
import { uploadFile } from "@/lib/firebase/storage"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Trophy, Calendar, User as UserIcon, Mail, Edit2, Loader2, Camera, X as CloseIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export default function ProfilePage() {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [history, setHistory] = useState<DailyWin[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [newName, setNewName] = useState("")
    const [isUpdating, setIsUpdating] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleUpdateProfile = async () => {
        if (!user || (!newName.trim() && !selectedFile)) return

        setIsUpdating(true)
        try {
            let photoURL = user.photoURL

            if (selectedFile) {
                const extension = selectedFile.name.split('.').pop()
                const fileName = `avatar_${Date.now()}.${extension}`
                photoURL = await uploadFile(selectedFile, `avatars/${user.uid}/${fileName}`)
            }

            await Promise.all([
                updateMemberName(user.uid, newName.trim() || undefined, photoURL || undefined),
                updateUserProfile(newName.trim() || undefined, photoURL || undefined)
            ])

            setUser(prev => prev ? {
                ...prev,
                displayName: newName.trim() || prev.displayName,
                photoURL: photoURL
            } : null)

            setIsEditing(false)
            setSelectedFile(null)
            setPreviewUrl(null)
            toast.success("Profile updated successfully")
        } catch (error) {
            console.error("Failed to update profile", error)
            toast.error("Failed to update profile")
        } finally {
            setIsUpdating(false)
        }
    }

    useEffect(() => {
        const loadData = async () => {
            try {
                const currentUser = await getCurrentUser()
                if (currentUser) {
                    setUser({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL
                    })

                    const winsHistory = await getDailyWinsHistory(30) // Get last 30 days
                    setHistory(winsHistory)
                }
            } catch (error) {
                console.error("Failed to load profile data", error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>
    }

    if (!user) {
        return <div className="p-8 text-center text-muted-foreground">Please log in to view profile.</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Profile Card */}
            <div className="flex flex-col md:flex-row items-center gap-8 bg-card p-8 rounded-3xl border shadow-sm">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={user.photoURL || "/avatars/01.png"} />
                    <AvatarFallback className="text-4xl">{user.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <h1 className="text-3xl font-bold">{user.displayName || "User"}</h1>
                        <Dialog open={isEditing} onOpenChange={(open) => {
                            setIsEditing(open)
                            if (open) setNewName(user.displayName || "")
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-fit">
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit Profile
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Edit Profile</DialogTitle>
                                    <DialogDescription>
                                        Update your display name here.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Display Name</Label>
                                        <Input
                                            id="name"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Profile Picture</Label>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16 border">
                                                <AvatarImage src={previewUrl || user.photoURL || "/avatars/01.png"} />
                                                <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    id="avatar-upload"
                                                    onChange={handleFileSelect}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                                >
                                                    <Camera className="h-4 w-4 mr-2" />
                                                    {selectedFile ? "Change Image" : "Upload Image"}
                                                </Button>
                                                {selectedFile && (
                                                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                                        Selected: {selectedFile.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => {
                                        setIsEditing(false)
                                        setSelectedFile(null)
                                        setPreviewUrl(null)
                                    }}>Cancel</Button>
                                    <Button onClick={handleUpdateProfile} disabled={isUpdating || (!newName.trim() && !selectedFile)}>
                                        {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-widest font-medium">Free Member</span>
                    </div>
                </div>
            </div>

            {/* Stats / 3 Wins History */}
            <div className="grid gap-8 md:grid-cols-3">
                {/* Main History Column */}
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-semibold">Victory Log</h2>
                    </div>

                    <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-4">
                            {history.length === 0 ? (
                                <p className="text-muted-foreground italic">No history yet. Start recording your wins!</p>
                            ) : (
                                history.map((day) => (
                                    <Card key={day.id} className="overflow-hidden border-none shadow-sm bg-secondary/20 hover:bg-secondary/30 transition-colors">
                                        <CardHeader className="py-4 px-6 bg-secondary/30 flex flex-row items-center justify-between">
                                            <div className="flex items-center gap-2 font-medium">
                                                <Calendar className="h-4 w-4 text-primary" />
                                                {format(parseISO(day.date), 'EEEE, MMMM do, yyyy')}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono">
                                                {day.wins.filter(w => w).length}/3 Completed
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 px-6 grid gap-2">
                                            {day.wins.map((win, idx) => (
                                                <div key={idx} className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "mt-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                                        win ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {idx + 1}
                                                    </div>
                                                    <p className={cn("text-sm leading-relaxed", !win && "text-muted-foreground italic")}>
                                                        {win || "No win recorded"}
                                                    </p>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Sidebar Stats (Placeholder for now) */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Streaks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-6">
                                <div className="text-4xl font-black text-primary mb-2">
                                    {history.length > 0 ? history.length : 0}
                                </div>
                                <p className="text-sm text-muted-foreground">Days logged</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
