"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, CheckSquare, Target, BookOpen, PenTool, Settings, Users, Timer, StickyNote, ChevronDown, Plus, Check, MoreVertical, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { logOut, auth } from "@/lib/firebase/auth"
import { useState, useEffect } from "react"
import { Organization, subscribeToUserOrganizations, getUserOrganization, switchOrganization, subscribeToUserProfile } from "@/lib/firebase/firestore"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const mainItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
    { icon: Target, label: "Goals", href: "/dashboard/goals" },
    { icon: Users, label: "Team", href: "/dashboard/team" },
    { icon: Zap, label: "MVS", href: "/dashboard/mvs" },
]

const utilityItems = [
    { icon: Timer, label: "Focus", href: "/dashboard/focus" },
    { icon: StickyNote, label: "Notes", href: "/dashboard/notes" },
    { icon: PenTool, label: "Blog", href: "/dashboard/blog" },
    { icon: BookOpen, label: "Planner", href: "/dashboard/planner" },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()

    const [orgs, setOrgs] = useState<Organization[]>([])
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
    const [user, setUser] = useState(auth.currentUser)
    const [userData, setUserData] = useState<any>(null)

    useEffect(() => {
        let unsubOrgs: () => void = () => { }
        let unsubProfile: () => void = () => { }

        const unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
            setUser(u)
            if (u) {
                // 1. Subscribe to Organizations
                unsubOrgs = subscribeToUserOrganizations(u.uid, (myOrgs) => {
                    setOrgs(myOrgs);
                    // Also update current org from the new list if it exists
                    const curId = currentOrg?.id; // This might be stale if we don't handle it carefully
                });

                // 2. Initial fetch of current Org
                const cur = await getUserOrganization(u.uid);
                setCurrentOrg(cur);

                // 3. Subscribe to User Profile
                unsubProfile = subscribeToUserProfile(u.uid, (data) => {
                    setUserData(data);
                });
            } else {
                setOrgs([]);
                setCurrentOrg(null);
                setUserData(null);
            }
        })

        return () => {
            unsubscribeAuth();
            unsubOrgs();
            unsubProfile();
        }
    }, [])

    // Update currentOrg if orgs list changes (e.g. name update)
    useEffect(() => {
        if (currentOrg && orgs.length > 0) {
            const updated = orgs.find(o => o.id === currentOrg.id);
            if (updated && updated.name !== currentOrg.name) {
                setCurrentOrg(updated);
            }
        }
    }, [orgs, currentOrg]);

    const handleSwitchOrg = async (orgId: string) => {
        try {
            if (!user) return;
            await switchOrganization(user.uid, orgId);
            window.location.reload(); // Force reload to update all context
        } catch (error) {
            console.error("Failed to switch org", error);
            alert("Failed to switch organization");
        }
    }



    return (
        <aside className="hidden h-screen w-64 flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl md:flex">
            <div className="flex h-16 items-center px-4 border-b border-border/40">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between px-2 hover:bg-accent/50 h-12">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex h-8 w-8 items-center justify-center font-bold shadow-sm",
                                    currentOrg?.isPersonal ? "rounded-full bg-primary text-primary-foreground" : "rounded-lg bg-primary text-primary-foreground"
                                )}>
                                    {currentOrg?.name?.[0]?.toUpperCase() || "S"}
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-sm leading-none truncate max-w-[120px]">{currentOrg?.name || "Stitch."}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{currentOrg?.isPersonal ? "Personal Space" : "Shared Team"}</p>
                                </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[240px]">
                        <div className="px-2 py-1.5">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Personal Space</DropdownMenuLabel>
                        </div>
                        {orgs.filter(o => o.isPersonal).map((org) => (
                            <DropdownMenuItem key={org.id} onClick={() => handleSwitchOrg(org.id)} className="gap-2 cursor-pointer py-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-primary/20">
                                    {org.name[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 truncate">
                                    <p className="text-sm font-medium truncate">{org.name}</p>
                                    <p className="text-[10px] text-muted-foreground">Personal Workspace</p>
                                </div>
                                {currentOrg?.id === org.id && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />

                        <div className="px-2 py-1.5">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Shared Teams</DropdownMenuLabel>
                        </div>
                        {orgs.filter(o => !o.isPersonal).map((org) => {
                            const isOrgOwner = org.ownerId === user?.uid;
                            return (
                                <DropdownMenuItem key={org.id} onClick={() => handleSwitchOrg(org.id)} className="gap-2 cursor-pointer py-2">
                                    <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {org.name[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 truncate">
                                        <p className="text-sm font-medium truncate">{org.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{isOrgOwner ? "Owner" : "Member"}</p>
                                    </div>
                                    {currentOrg?.id === org.id && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                                </DropdownMenuItem>
                            );
                        })}

                        {orgs.filter(o => !o.isPersonal).length === 0 && (
                            <p className="text-[10px] text-muted-foreground px-4 py-2 italic">No shared teams yet</p>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href="/dashboard/team">
                                <Plus className="h-4 w-4 mr-2" /> CREATE NEW TEAM
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex-1 overflow-auto py-6 px-3">
                <nav className="grid gap-1.5">
                    {mainItems.map((item, index) => (
                        <Link key={index} href={item.href}>
                            <Button
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-4 px-4 py-6 font-medium text-muted-foreground transition-all hover:text-foreground",
                                    pathname === item.href && "bg-secondary text-foreground shadow-sm"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Button>
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="border-t border-border/40 p-4 space-y-2">
                <div className="grid gap-1 mb-4">
                    {utilityItems.map((item, index) => (
                        <Link key={index} href={item.href}>
                            <Button
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-3 px-3 py-2 h-9 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-accent/50",
                                    pathname === item.href && "bg-secondary text-foreground shadow-sm"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Button>
                        </Link>
                    ))}
                </div>

                <Link href="/dashboard/profile">
                    <Button variant="ghost" className="w-full justify-start gap-3 px-2 py-6 h-auto hover:bg-accent/50 group">
                        <Avatar className="h-9 w-9 border border-border group-hover:border-primary/50 transition-colors">
                            <AvatarImage src={userData?.photoURL || "/avatars/01.png"} />
                            <AvatarFallback>{userData?.displayName?.[0] || userData?.email?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1 truncate">
                            <p className="font-semibold text-sm leading-none truncate">{userData?.displayName || "User"}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">{userData?.email}</p>
                        </div>
                        <Settings className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
                    </Button>
                </Link>


            </div>
        </aside>
    )
}
