"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase/auth"
import { getUser, type User } from "@/lib/firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Home, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeftSidebarProps {
    viewMode: 'global' | 'circle'
    setViewMode: (mode: 'global' | 'circle') => void
}

export function LeftSidebar({ viewMode, setViewMode }: LeftSidebarProps) {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                const fullUser = await getUser(u.uid)
                setUser(fullUser)
            } else {
                setUser(null)
            }
        })
        return () => unsubscribe()
    }, [])

    const navItems = [
        { id: 'global', label: "Cộng đồng", icon: Home, mode: 'global' },
        { id: 'circle', label: "Vòng tròn của tôi", icon: Users, mode: 'circle' }
    ]

    return (
        <div className="w-64 shrink-0 space-y-6 sticky top-[5.5rem] self-start">

            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                <div className="relative mb-3">
                    <div className="h-20 w-20 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500">
                        <Avatar className="h-full w-full border-2 border-white dark:border-slate-900">
                            <AvatarImage src={user?.photoURL} />
                            <AvatarFallback className="text-xl bg-white text-indigo-600">{user?.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="absolute bottom-0 right-0 h-5 w-5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                </div>

                <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">{user?.displayName || "Guest"}</h2>
                <p className="text-sm text-slate-500 mb-4">@{user?.email?.split('@')[0] || "user"}</p>

                <div className="flex w-full justify-center gap-6 mb-2">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{user?.followers?.length || 0}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">Followers</span>
                    </div>
                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{user?.following?.length || 0}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">Following</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        // Explicitly cast item.mode to check against viewMode which is a literal union
                        const isActive = (item.mode === viewMode)

                        return (
                            <Button
                                key={item.id}
                                variant="ghost"
                                onClick={() => setViewMode(item.mode as 'global' | 'circle')}
                                className={cn(
                                    "w-full justify-start gap-4 h-12 rounded-xl transition-all",
                                    isActive
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                <Icon className={cn("h-5 w-5", isActive && "fill-current opacity-20")} />
                                <span className={cn("font-medium", isActive && "text-indigo-600 dark:text-indigo-400")}>{item.label}</span>
                            </Button>
                        )
                    })}
                </nav>
            </div>

        </div>
    )
}
