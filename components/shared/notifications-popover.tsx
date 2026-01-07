"use client"

import { useEffect, useState } from "react"
import { Bell, Check, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead, type Notification } from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function NotificationsPopover() {
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const [user, setUser] = useState(auth.currentUser)

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged((u) => {
            setUser(u)
        })
        return () => unsubAuth()
    }, [])

    useEffect(() => {
        if (!user) return

        const unsubscribe = subscribeToNotifications(user.uid, (data) => {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.read).length)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [user])

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await markNotificationAsRead(notification.id)
        }

        setOpen(false)

        // Navigation logic
        switch (notification.resourceType) {
            case 'task':
                router.push(`/dashboard/tasks?taskId=${notification.resourceId}`)
                break
            case 'goal':
                router.push(`/dashboard/goals`)
                break
            case 'post':
            case 'social_post':
                // Use hash navigation to jump to post in sharing feed
                router.push(`/dashboard/sharing#${notification.resourceId}`)
                break
            case 'blog_post':
                // Go to blog list (maybe filter later?)
                router.push(`/dashboard/blog`)
                break
            default:
                break
        }
    }

    const handleMarkAllRead = async () => {
        if (user) {
            await markAllNotificationsAsRead(user.uid)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border border-white dark:border-slate-950 animate-pulse"></span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0" forceMount>
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-primary"
                            onClick={handleMarkAllRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-20 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm text-center px-4">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            No notifications yet
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    className={cn(
                                        "flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 border-b last:border-0",
                                        !notification.read && "bg-indigo-50/50 dark:bg-indigo-900/10"
                                    )}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <Avatar className="h-8 w-8 mt-0.5 border">
                                        <AvatarImage src={notification.senderAvatar} />
                                        <AvatarFallback>{notification.senderName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm leading-snug">
                                            <span className="font-semibold">{notification.senderName}</span>{" "}
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                                            {notification.type === 'assignment' && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium text-[10px]">
                                                    Assigned
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <span className="h-2 w-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
