"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/components/shared/language-context"
import { getCurrentUser, updateUserProfile } from "@/lib/firebase/auth"
import { getDailyWinsHistory, DailyWin, updateMemberName, subscribeToUserPosts, type Post, getUser, updateUserDetails, type User } from "@/lib/firebase/firestore"
import { uploadFile } from "@/lib/firebase/storage"
import { ThreeWins } from "@/components/dashboard/three-wins"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Trophy, Calendar, User as UserIcon, Mail, Edit2, Loader2, Camera, X as CloseIcon, Briefcase, Heart, Zap, AlertCircle } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function ProfilePage() {
    const { t } = useLanguage()
    const [user, setUser] = useState<User | null>(null)
    const [history, setHistory] = useState<DailyWin[]>([])
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)

    // Edit States
    const [newName, setNewName] = useState("")
    const [jobTitle, setJobTitle] = useState("")
    const [bio, setBio] = useState("")
    const [strengths, setStrengths] = useState("")
    const [weaknesses, setWeaknesses] = useState("")
    const [hobbies, setHobbies] = useState("")
    const [birthday, setBirthday] = useState("")

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
        if (!user || (!newName.trim() && !selectedFile && !jobTitle && !bio)) return

        setIsUpdating(true)
        try {
            let photoURL = user.photoURL

            if (selectedFile) {
                const extension = selectedFile.name.split('.').pop()
                const fileName = `avatar_${Date.now()}.${extension}`
                photoURL = await uploadFile(selectedFile, `avatars/${user.uid}/${fileName}`)
            }

            // Update Auth Profile (Name & Photo)
            await Promise.all([
                updateMemberName(user.uid, newName.trim() || undefined, photoURL || undefined),
                updateUserProfile(newName.trim() || undefined, photoURL || undefined)
            ])

            // Update Extended Details in Firestore
            await updateUserDetails(user.uid, {
                jobTitle: jobTitle.trim(),
                bio: bio.trim(),
                strengths: strengths.split(',').map(s => s.trim()).filter(Boolean),
                weaknesses: weaknesses.split(',').map(s => s.trim()).filter(Boolean),
                hobbies: hobbies.split(',').map(s => s.trim()).filter(Boolean),
                birthday: birthday,
                displayName: newName.trim() || user.displayName,
                photoURL: photoURL
            });

            setUser(prev => prev ? {
                ...prev,
                displayName: newName.trim() || prev.displayName,
                photoURL: photoURL,
                jobTitle: jobTitle.trim(),
                bio: bio.trim(),
                strengths: strengths.split(',').map(s => s.trim()).filter(Boolean),
                weaknesses: weaknesses.split(',').map(s => s.trim()).filter(Boolean),
                hobbies: hobbies.split(',').map(s => s.trim()).filter(Boolean),
                birthday: birthday
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
                    // Fetch full user profile from Firestore
                    const fullProfile = await getUser(currentUser.uid);

                    if (fullProfile) {
                        setUser(fullProfile);
                        setNewName(fullProfile.displayName || "");
                        setJobTitle(fullProfile.jobTitle || "");
                        setBio(fullProfile.bio || "");
                        setStrengths(fullProfile.strengths?.join(", ") || "");
                        setWeaknesses(fullProfile.weaknesses?.join(", ") || "");
                        setHobbies(fullProfile.hobbies?.join(", ") || "");
                        setBirthday(fullProfile.birthday || "");
                    } else {
                        // Fallback if no Firestore doc exists yet
                        setUser({
                            uid: currentUser.uid,
                            email: currentUser.email || "",
                            displayName: currentUser.displayName || "",
                            photoURL: currentUser.photoURL || undefined,
                            createdAt: {} as any // Placeholder
                        });
                        setNewName(currentUser.displayName || "");
                    }

                    const winsHistory = await getDailyWinsHistory(30)
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

    useEffect(() => {
        if (!user?.uid) return
        const unsub = subscribeToUserPosts(user.uid, (data) => {
            setPosts(data)
        })
        return () => unsub()
    }, [user?.uid])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>
    }

    if (!user) {
        return <div className="p-8 text-center text-muted-foreground">Please log in to view profile.</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header / Profile Card */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20" />

                <div className="relative flex flex-col md:flex-row items-start gap-8 mt-4">
                    <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-900 shadow-xl rounded-2xl">
                        <AvatarImage src={user.photoURL || "/avatars/01.png"} />
                        <AvatarFallback className="text-4xl rounded-2xl">{user.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4 pt-2">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{user.displayName || "User"}</h1>
                                {user.jobTitle && (
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
                                        <Briefcase className="h-4 w-4" />
                                        <span>{user.jobTitle}</span>
                                    </div>
                                )}
                            </div>

                            <Dialog open={isEditing} onOpenChange={(open) => {
                                setIsEditing(open)
                                if (open && user) {
                                    setNewName(user.displayName || "")
                                    setJobTitle(user.jobTitle || "")
                                    setBio(user.bio || "")
                                    setStrengths(user.strengths?.join(", ") || "")
                                    setWeaknesses(user.weaknesses?.join(", ") || "")
                                    setHobbies(user.hobbies?.join(", ") || "")
                                    setBirthday(user.birthday || "")
                                }
                            }}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Edit2 className="h-4 w-4" />
                                        Edit Profile
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Edit Profile</DialogTitle>
                                        <DialogDescription>
                                            Update your personal and professional information.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-6 py-4">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex-1 space-y-4">
                                                <div className="grid gap-2">
                                                    <Label>Profile Picture</Label>
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-16 w-16 border rounded-xl">
                                                            <AvatarImage src={previewUrl || user.photoURL || "/avatars/01.png"} />
                                                            <AvatarFallback className="rounded-xl">{user.email?.[0].toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="relative">
                                                            <Input type="file" accept="image/*" className="hidden" id="avatar-upload" onChange={handleFileSelect} />
                                                            <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                                                <Camera className="h-4 w-4 mr-2" />
                                                                Change Photo
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="name">Display Name</Label>
                                                    <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="birthday">Birthday</Label>
                                                    <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="jobTitle">Job Title</Label>
                                                    <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Designer" />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="bio">Bio</Label>
                                                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." className="h-32" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 border-t pt-4">
                                            <h4 className="font-medium text-sm text-slate-500">Traits & Interests (comma separated)</h4>

                                            <div className="grid gap-2">
                                                <Label htmlFor="strengths">My Strengths</Label>
                                                <Input id="strengths" value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="Creativity, Leadership, ..." />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="weaknesses">My Weaknesses</Label>
                                                <Input id="weaknesses" value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} placeholder="Public speaking, ..." />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="hobbies">Hobbies</Label>
                                                <Input id="hobbies" value={hobbies} onChange={(e) => setHobbies(e.target.value)} placeholder="Reading, Hiking, ..." />
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                                        <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Changes
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {user.bio && (
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                                {user.bio}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-4 pt-2">
                            {user.birthday && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Calendar className="h-4 w-4" />
                                    <span>Born {format(parseISO(user.birthday), 'MMMM d, yyyy')}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Mail className="h-4 w-4" />
                                <span>{user.email}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Extended Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 border-t border-slate-100 dark:border-slate-800 pt-8">
                    {/* Strengths */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            <Zap className="h-4 w-4" /> My Strengths
                        </div>
                        {user.strengths && user.strengths.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {user.strengths.map((item, i) => (
                                    <span key={i} className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm font-medium border border-indigo-100 dark:border-indigo-800">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No strengths added yet.</p>
                        )}
                    </div>

                    {/* Weaknesses */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                            <AlertCircle className="h-4 w-4" /> My Weaknesses
                        </div>
                        {user.weaknesses && user.weaknesses.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {user.weaknesses.map((item, i) => (
                                    <span key={i} className="px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-sm font-medium border border-rose-100 dark:border-rose-800">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No weaknesses added yet.</p>
                        )}
                    </div>

                    {/* Hobbies */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            <Heart className="h-4 w-4" /> Hobbies & Interests
                        </div>
                        {user.hobbies && user.hobbies.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {user.hobbies.map((item, i) => (
                                    <span key={i} className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium border border-emerald-100 dark:border-emerald-800">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No hobbies added yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 items-center bg-transparent border-b rounded-none h-auto p-0">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-8 py-3 text-base">{t("overview")}</TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-8 py-3 text-base">{t("posts")}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* 3 Wins Today */}
                    <ThreeWins />

                    {/* Stats / 3 Wins History */}
                    <div className="grid gap-8 md:grid-cols-3">
                        {/* Main History Column */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                    <Trophy className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-semibold">{t("victory_log")}</h2>
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

                        {/* Sidebar Stats */}
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
                </TabsContent>

                <TabsContent value="posts">
                    <div className="max-w-2xl mx-auto space-y-6">
                        {posts.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                                <p className="text-muted-foreground">No posts yet.</p>
                            </div>
                        ) : (
                            posts.map(post => (
                                <PostCard key={post.id} post={post} currentUserId={user.uid} />
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
