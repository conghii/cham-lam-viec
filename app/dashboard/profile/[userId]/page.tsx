"use client"

import { useEffect, useState } from "react"
import { getCurrentUser, updateUserProfile } from "@/lib/firebase/auth"
import { getDailyWinsHistory, DailyWin, updateMemberName, subscribeToUserPosts, type Post } from "@/lib/firebase/firestore"
import { uploadFile } from "@/lib/firebase/storage"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PostCard } from "@/components/dashboard/sharing/post-card"
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
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/firestore"
import { useParams } from "next/navigation"

interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export default function PublicProfilePage() {
    const params = useParams()
    const userId = params?.userId as string

    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
    const [profileUser, setProfileUser] = useState<UserProfile | null>(null)

    // Viewing State
    const [history, setHistory] = useState<DailyWin[]>([])
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)

    // Edit State (Only if currentUser === profileUser)
    const [isEditing, setIsEditing] = useState(false)
    const [newName, setNewName] = useState("")
    const [isUpdating, setIsUpdating] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const isOwnProfile = currentUser?.uid === userId

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
        if (!profileUser || (!newName.trim() && !selectedFile)) return

        setIsUpdating(true)
        try {
            let photoURL = profileUser.photoURL

            if (selectedFile) {
                const extension = selectedFile.name.split('.').pop()
                const fileName = `avatar_${Date.now()}.${extension}`
                photoURL = await uploadFile(selectedFile, `avatars/${profileUser.uid}/${fileName}`)
            }

            await Promise.all([
                updateMemberName(profileUser.uid, newName.trim() || undefined, photoURL || undefined),
                // Only update Auth profile if it's the current user (double check)
                isOwnProfile ? updateUserProfile(newName.trim() || undefined, photoURL || undefined) : Promise.resolve()
            ])

            setProfileUser(prev => prev ? {
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
            if (!userId) return

            try {
                // 1. Get Current User (for permission check)
                const curr = await getCurrentUser()
                if (curr) {
                    setCurrentUser({
                        uid: curr.uid,
                        email: curr.email,
                        displayName: curr.displayName,
                        photoURL: curr.photoURL
                    })
                }

                // 2. Get Profile User Data
                const userDocRef = doc(db, "users", userId)
                const userDocSnap = await getDoc(userDocRef)

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data()
                    setProfileUser({
                        uid: userId,
                        email: userData.email || null,
                        displayName: userData.displayName || "User",
                        photoURL: userData.photoURL || null
                    })

                    // 3. Get History (Wins)
                    // Note: getDailyWinsHistory currently fetches for *current* user. 
                    // We need a way to fetch for *specific* user. 
                    // For now, if it's NOT own profile, we might show empty history 
                    // or we need to update `getDailyWinsHistory` to accept a userId.
                    // Assuming for now we skip history for others or need to update firestore.ts
                    // Let's check `getDailyWinsHistory`.

                    // Actually, let's just create a quick direct fetch for now to avoid modifying firestore.ts extensively if possible, 
                    // OR better, reuse getDailyWinsHistory if we update it.
                    // Checking firestore.ts... `getDailyWinsHistory` uses `auth.currentUser`.
                    // We'll leave history empty for others for now until we update the backend function, 
                    // OR implements a simple fetch here.

                    if (curr && curr.uid === userId) {
                        const winsHistory = await getDailyWinsHistory(30)
                        setHistory(winsHistory)
                    } else {
                        // Ideally fetch public wins here if we want to show them.
                        // Let's fetch basic wins if they are in a collection we can query.
                        // Since `daily_wins` is subcollection of `users`, we can fetch it.
                        // But let's stick to simple "Posts" first as requested in V4 plan.
                    }

                } else {
                    toast.error("User not found")
                }

            } catch (error) {
                console.error("Failed to load profile data", error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [userId])

    // Subscribe to posts for this userId
    useEffect(() => {
        if (!userId) return
        const unsub = subscribeToUserPosts(userId, (data) => {
            setPosts(data)
        })
        return () => unsub()
    }, [userId])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
    }

    if (!profileUser) {
        return <div className="p-8 text-center text-muted-foreground">User not found.</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
            {/* Header / Profile Card */}
            <div className="flex flex-col md:flex-row items-center gap-8 bg-card p-8 rounded-3xl border shadow-sm">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={profileUser.photoURL || "/avatars/01.png"} />
                    <AvatarFallback className="text-4xl">{profileUser.displayName?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <h1 className="text-3xl font-bold">{profileUser.displayName || "User"}</h1>

                        {isOwnProfile && (
                            <Dialog open={isEditing} onOpenChange={(open) => {
                                setIsEditing(open)
                                if (open) setNewName(profileUser.displayName || "")
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
                                                    <AvatarImage src={previewUrl || profileUser.photoURL || "/avatars/01.png"} />
                                                    <AvatarFallback>{profileUser.displayName?.[0]?.toUpperCase()}</AvatarFallback>
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
                        )}
                    </div>
                    {profileUser.email && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{profileUser.email}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-widest font-medium">Free Member</span>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="posts" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 items-center bg-transparent border-b rounded-none h-auto p-0">
                    <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-8 py-3 text-base">Posts</TabsTrigger>
                    {isOwnProfile && (
                        <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-8 py-3 text-base">Overview</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="overview">
                    {/* Stats / 3 Wins History (Only shown for own profile currently due to limitation) */}
                    <div className="grid gap-8 md:grid-cols-3">
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
                                        <p className="text-muted-foreground italic">No history yet.</p>
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
                    </div>
                </TabsContent>

                <TabsContent value="posts">
                    <div className="max-w-2xl mx-auto space-y-6">
                        {posts.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                                <p className="text-muted-foreground">No posts yet.</p>
                            </div>
                        ) : (
                            posts.map(post => (
                                <PostCard key={post.id} post={post} currentUserId={currentUser?.uid} />
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
