"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, Users, Menu } from "lucide-react"
import { ModeToggle } from "@/components/theme-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/shared/sidebar"
import { NotificationsPopover } from "@/components/shared/notifications-popover"

import { auth, logOut } from "@/lib/firebase/auth"
import { subscribeToUserProfile, subscribeToChats, subscribeToFriendships, acceptFriendRequest, rejectFriendRequest, type Chat, type Friendship } from "@/lib/firebase/firestore"
import { useLanguage } from "@/components/shared/language-context"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { getDailyQuote } from "@/lib/quotes"
import { toast } from "sonner"

export function Header() {
    const [greeting, setGreeting] = useState("Good Morning")
    const [user, setUser] = useState(auth.currentUser)
    const [userData, setUserData] = useState<any>(null)
    const [quote, setQuote] = useState(getDailyQuote())
    const [unreadCount, setUnreadCount] = useState(0)
    const [invitations, setInvitations] = useState<any[]>([])
    const [friendRequests, setFriendRequests] = useState<Friendship[]>([])
    const [showSettings, setShowSettings] = useState(false)
    const { language, setLanguage, t } = useLanguage()

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting("Good Morning")
        else if (hour < 18) setGreeting("Good Afternoon")
        else setGreeting("Good Evening")

        // Update quote on mount
        setQuote(getDailyQuote())

        const unsubAuth = auth.onAuthStateChanged((u) => {
            setUser(u)
            if (u) {
                const unsubProfile = subscribeToUserProfile(u.uid, (data) => {
                    setUserData(data)
                })
                return () => unsubProfile()
            } else {
                setUserData(null)
            }
        })

        return () => unsubAuth()
    }, [])

    useEffect(() => {
        if (!user) return;

        // Subscribe to chats
        const unsubChats = subscribeToChats((chats: Chat[]) => {
            let count = 0;
            chats.forEach(c => {
                if (c.unreadCount && c.unreadCount[user.uid] && c.unreadCount[user.uid] > 0) {
                    count++;
                }
            });
            setUnreadCount(count);
        });

        // Subscribe to invitations
        // We need to fetch invitations where email matches user's email
        // But initially user might not be loaded or email might be null, so check user.email
        let unsubInvites = () => { };
        if (user.email) {
            // Import dynamically to avoid circular deps if any, or just standard import
            // Assuming getUserInvitations is available
            import("@/lib/firebase/firestore").then(({ getUserInvitations }) => {
                unsubInvites = getUserInvitations(user.email!, (invites) => {
                    setInvitations(invites);
                });
            });
        }

        // Subscribe to friend requests
        const unsubFriends = subscribeToFriendships((friendships) => {
            const requests = friendships.filter(f =>
                f.status === 'pending' && f.recipientId === user.uid
            );
            setFriendRequests(requests);
        });

        return () => {
            unsubChats();
            unsubInvites();
            unsubFriends();
        };
    }, [user])

    const handleLogout = async () => {
        try {
            await logOut()
            window.location.href = "/login"
        } catch (error) {
            console.error("Logout failed", error)
        }
    }

    const handleAcceptInvite = async (inviteId: string) => {
        try {
            const { acceptInvitation } = await import("@/lib/firebase/firestore");
            await acceptInvitation(inviteId);
            toast.success("Invitation accepted! You are now a member.");
            // Optionally redirect to team page or refresh Not needed as real-time
        } catch (error) {
            console.error(error);
            toast.error("Failed to accept invitation.");
        }
    }

    const handleRejectInvite = async (inviteId: string) => {
        try {
            const { rejectInvitation } = await import("@/lib/firebase/firestore");
            await rejectInvitation(inviteId);
            toast.success("Invitation rejected.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to reject invitation.");
        }
    }

    const handleAcceptFriend = async (id: string) => {
        try {
            await acceptFriendRequest(id);
            toast.success("Friend request accepted");
        } catch (err) {
            toast.error("Failed to accept request");
        }
    };

    const handleRejectFriend = async (id: string) => {
        try {
            await rejectFriendRequest(id);
            toast.success("Friend request rejected");
        } catch (err) {
            toast.error("Failed to reject request");
        }
    };

    const displayName = userData?.displayName || user?.displayName || "User"
    const displayEmail = user?.email || ""
    const photoURL = userData?.photoURL || user?.photoURL || "/avatars/01.png"
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || "U"

    return (
        <header className="sticky top-0 z-30 flex min-h-16 h-auto items-center gap-4 border-b dark:border-slate-800 bg-background/95 dark:bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 transition-colors duration-300 py-2">
            {/* Mobile Sidebar Trigger */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="-ml-2">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 border-r-0 w-[85vw] max-w-[300px]">
                        <Sidebar className="flex h-full w-full border-none bg-transparent" />
                    </SheetContent>
                </Sheet>
            </div>

            <div className="flex flex-1 flex-col justify-center py-1 min-w-0">
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground font-medium truncate">
                    <span className="truncate">{greeting}, {displayName}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                    <span className="shrink-0">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <h1 className="text-xs md:text-sm font-serif italic text-foreground/90 dark:text-white mt-0.5 line-clamp-1 md:line-clamp-2">
                    "{quote.text}" <span className="text-muted-foreground dark:text-slate-400 not-italic text-[10px] ml-1 font-sans">- {quote.author}</span>
                </h1>
            </div>
            <div className="flex items-center gap-4">
                <ModeToggle />
                <Link href="/dashboard/friends">
                    <Button variant="ghost" size="icon" title="Friends" className="relative">
                        <Users className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-background">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </Button>
                </Link>

                {/* NOTIFICATIONS DROPDOWN */}
                <NotificationsPopover />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8 border">
                                <AvatarImage src={photoURL} alt={displayName} />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/dashboard/profile">
                            <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem onSelect={() => setShowSettings(true)} className="cursor-pointer">
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("preferences") || "Preferences"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t("system_language") || "System Language"}</Label>
                                <p className="text-sm text-muted-foreground">{t("select_language_desc") || "Select your preferred language."}</p>
                            </div>
                            <div className="flex items-center bg-secondary p-1 rounded-lg">
                                <button
                                    onClick={() => setLanguage("en")}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                        language === "en" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {t("english") || "English"}
                                </button>
                                <button
                                    onClick={() => setLanguage("vi")}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                        language === "vi" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {t("vietnamese") || "Vietnamese"}
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </header>
    )
}
