"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, CheckSquare, Target, BookOpen, PenTool, Settings, Users, Timer, StickyNote, ChevronDown, Plus, Check, MoreVertical, Zap, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { logOut, auth } from "@/lib/firebase/auth"
import { useState, useEffect } from "react"
import { Organization, subscribeToUserOrganizations, getUserOrganization, switchOrganization, subscribeToUserProfile, subscribeToTasks, type Task } from "@/lib/firebase/firestore"
import { isToday } from "date-fns"
import { toast } from "sonner"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createOrganization } from "@/lib/firebase/firestore"

const mainItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
    { icon: Target, label: "Goals", href: "/dashboard/goals" },
    { icon: Users, label: "Team", href: "/dashboard/team" },
    { icon: Zap, label: "MVS", href: "/dashboard/mvs" },
]

const utilityItems = [
    { icon: Share2, label: "Sharing", href: "/dashboard/sharing" },
    { icon: Timer, label: "Focus", href: "/dashboard/focus" },
    { icon: StickyNote, label: "Notes", href: "/dashboard/notes" },
    { icon: PenTool, label: "Blog", href: "/dashboard/blog" },
    { icon: BookOpen, label: "Planner", href: "/dashboard/planner" },
]

export function Sidebar({ isCollapsed = false }: { isCollapsed?: boolean }) {
    const pathname = usePathname()
    const router = useRouter()

    const [orgs, setOrgs] = useState<Organization[]>([])
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
    const [user, setUser] = useState(auth.currentUser)
    const [userData, setUserData] = useState<any>(null)
    const [todayTaskCount, setTodayTaskCount] = useState(0)

    // Create Team Dialog State
    const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
    const [newTeamName, setNewTeamName] = useState("")

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            await createOrganization(newTeamName, false);
            toast.success("Team created successfully!");
            setIsCreateTeamOpen(false);
            setNewTeamName("");
            window.location.reload();
        } catch (error) {
            console.error("Failed to create team", error);
            toast.error("Failed to create team");
        }
    };

    useEffect(() => {
        let unsubOrgs: () => void = () => { }
        let unsubProfile: () => void = () => { }
        let unsubTasks: () => void = () => { }

        const unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
            setUser(u)
            if (u) {
                // 1. Subscribe to Organizations
                unsubOrgs = subscribeToUserOrganizations(u.uid, (myOrgs) => {
                    setOrgs(myOrgs);
                    const curId = currentOrg?.id;
                });

                // 2. Initial fetch of current Org
                const cur = await getUserOrganization(u.uid);
                setCurrentOrg(cur);

                // 3. Subscribe to User Profile
                unsubProfile = subscribeToUserProfile(u.uid, (data) => {
                    setUserData(data);
                });

                // 4. Subscribe to Tasks for Badge
                unsubTasks = subscribeToTasks((tasks: Task[]) => {
                    const count = tasks.filter(t =>
                        !t.completed &&
                        t.dueDate &&
                        (isToday(new Date(t.dueDate)) || new Date(t.dueDate) < new Date()) // Count today and overdue
                    ).length;
                    setTodayTaskCount(count);
                });
            } else {
                setOrgs([]);
                setCurrentOrg(null);
                setUserData(null);
                setTodayTaskCount(0);
            }
        })

        return () => {
            unsubscribeAuth();
            unsubOrgs();
            unsubProfile();
            unsubTasks();
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
            toast.error("Failed to switch organization");
        }
    }



    return (
        <aside
            data-collapsed={isCollapsed}
            className="group hidden h-screen w-full flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl md:flex data-[collapsed=true]:w-[50px]"
        >
            <div className="flex h-16 items-center px-4 border-b border-border/40">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between px-2 hover:bg-accent/50 h-12">
                            <div className={cn("flex items-center gap-3", isCollapsed && "justify-center w-full")}>
                                <div className={cn(
                                    "flex h-8 w-8 items-center justify-center font-bold shadow-sm shrink-0",
                                    currentOrg?.isPersonal ? "rounded-full bg-primary text-primary-foreground" : "rounded-lg bg-primary text-primary-foreground"
                                )}>
                                    {currentOrg?.name?.[0]?.toUpperCase() || "S"}
                                </div>
                                {!isCollapsed && (
                                    <div className="text-left bg-transparent">
                                        <p className="font-semibold text-sm leading-none truncate max-w-[120px]">{currentOrg?.name || "Stitch."}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{currentOrg?.isPersonal ? "Personal Space" : "Shared Team"}</p>
                                    </div>
                                )}
                            </div>
                            {!isCollapsed && <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50" />}
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
                        <DropdownMenuItem onSelect={() => setIsCreateTeamOpen(true)} className="cursor-pointer">
                            <Plus className="h-4 w-4 mr-2" /> CREATE NEW TEAM
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Team</DialogTitle>
                            <DialogDescription>Create a shared workspace to collaborate with others.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Team Name</Label>
                                <Input
                                    value={newTeamName}
                                    onChange={e => setNewTeamName(e.target.value)}
                                    placeholder="e.g. Acme Corp, Design Team"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateTeam}>Create Team</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="flex-1 overflow-auto py-6 px-3">
                <nav className="grid gap-1.5">
                    {mainItems.map((item, index) => (
                        <Link key={index} href={item.href}>
                            <Button
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-4 px-4 py-6 font-medium text-muted-foreground transition-all hover:text-foreground",
                                    pathname === item.href && "bg-secondary text-foreground shadow-sm",
                                    isCollapsed && "justify-center px-2"
                                )}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {!isCollapsed && (
                                    <div className="flex-1 flex items-center justify-between">
                                        <span>{item.label}</span>
                                        {item.label === "Tasks" && todayTaskCount > 0 && (
                                            <span className="h-5 w-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                                                {todayTaskCount > 99 ? '99+' : todayTaskCount}
                                            </span>
                                        )}
                                    </div>
                                )}
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
                                    pathname === item.href && "bg-secondary text-foreground shadow-sm",
                                    isCollapsed && "justify-center px-2 h-12"
                                )}
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                {!isCollapsed && item.label}
                            </Button>
                        </Link>
                    ))}
                </div>

                <Link href="/dashboard/profile">
                    <Button variant="ghost" className={cn("w-full justify-start gap-3 px-2 py-6 h-auto hover:bg-accent/50 group", isCollapsed && "justify-center")}>
                        <Avatar className="h-9 w-9 border border-border group-hover:border-primary/50 transition-colors shrink-0">
                            <AvatarImage src={userData?.photoURL || "/avatars/01.png"} />
                            <AvatarFallback>{userData?.displayName?.[0] || userData?.email?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {!isCollapsed && (
                            <>
                                <div className="text-left flex-1 truncate">
                                    <p className="font-semibold text-sm leading-none truncate">{userData?.displayName || "User"}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{userData?.email}</p>
                                </div>
                                <Settings className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
                            </>
                        )}
                    </Button>
                </Link>


            </div>
        </aside >
    )
}
