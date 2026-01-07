"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { uploadFile } from "@/lib/firebase/storage";
import { getCurrentUser, auth } from "@/lib/firebase/auth";
import {
    db,
    getUserOrganization,
    getOrganizationMembers,
    createOrganization,
    addMemberToOrganization,
    removeMemberFromOrganization,
    subscribeToGroups,
    createGroup,
    updateMemberRole,
    updateOrganization,
    deleteOrganization,
    deleteGroup,
    type Organization,
    type OrganizationMember,
    type Group,
    type Invitation,
    getOrganizationInvitations,
    cancelInvitation,
} from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Users,
    UserPlus,
    Settings,
    Plus,
    MoreVertical,
    Building,
    Hash,
    Shield,
    Trash2,
    Zap,
    Copy,
    Upload,
    Check,
    Rocket,
    LayoutGrid,
    CheckCircle2,
    Briefcase,
    UserCog,
    Globe,
    Clock,
    Flame,
    Activity,
    TrendingUp
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";

export default function TeamPage() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);

    // Dialog States
    const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");

    const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");

    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    // Settings State
    const [orgName, setOrgName] = useState("");
    const [orgTagline, setOrgTagline] = useState("");
    const [orgAvatarUrl, setOrgAvatarUrl] = useState("");

    useEffect(() => {
        let unsubOrg: () => void = () => { };
        let unsubGroups: () => void = () => { };
        // let unsubInvites: () => void = () => { };

        const loadData = async () => {
            setLoading(true);
            try {
                const user = await getCurrentUser();
                setCurrentUser(user);

                if (user) {
                    // 1. Get initial org data
                    const initialOrg = await getUserOrganization(user.uid);

                    if (initialOrg) {
                        setOrg(initialOrg);
                        setOrgName(initialOrg.name);
                        setOrgTagline(initialOrg.tagline || "");
                        setOrgAvatarUrl(initialOrg.photoURL || "");

                        // 2. Subscribe to real-time Org updates
                        unsubOrg = onSnapshot(doc(db, "organizations", initialOrg.id), (docSnapshot) => {
                            if (docSnapshot.exists()) {
                                const data = { id: docSnapshot.id, ...docSnapshot.data() } as Organization;
                                setOrg(data);
                            }
                        });

                        // 3. Load Members
                        const membersData = await getOrganizationMembers(initialOrg.id);
                        setMembers(membersData);

                        // 4. Subscribe to Groups
                        unsubGroups = subscribeToGroups((data) => {
                            const orgGroups = data.filter(g => g.orgId === initialOrg.id);
                            setGroups(orgGroups);
                        });

                        // 5. Subscribe to Invitations
                        getOrganizationInvitations(initialOrg.id, (invites) => {
                            setPendingInvites(invites);
                        });

                    } else {
                        setOrg(null);
                        setGroups([]);
                        setMembers([]);
                    }
                }
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        return () => {
            unsubOrg();
            unsubGroups();
        };
    }, []);

    const handleCreateOrg = async () => {
        if (!newOrgName) return;
        try {
            await createOrganization(newOrgName);
            toast.success("Organization created!");
            setIsCreateOrgOpen(false);
            setNewOrgName("");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleUpdateOrg = async () => {
        if (!org || !orgName.trim()) return;
        try {
            await updateOrganization(org.id, {
                name: orgName,
                tagline: orgTagline,
                photoURL: orgAvatarUrl
            });
            toast.success("Organization updated!");
        } catch (error: any) {
            toast.error("Failed to update: " + error.message);
        }
    };

    const handleDeleteOrg = async (orgId: string) => {
        if (!confirm("Are you sure you want to delete this organization?")) return;
        try {
            await deleteOrganization(orgId);
            toast.success("Organization deleted.");
            window.location.reload();
        } catch (error: any) {
            toast.error("Failed to delete: " + error.message);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !org) return;
        try {
            await createGroup(newGroupName, org.id);
            toast.success("Group created successfully!");
            setIsCreateGroupOpen(false);
            setNewGroupName("");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm("Are you sure you want to delete this group?")) return;
        try {
            await deleteGroup(groupId);
            toast.success("Group deleted.");
            // Refresh logic if needed, but subscription handles it
        } catch (error) {
            toast.error("Failed to delete group");
        }
    };

    const handleLeaveOrg = async () => {
        if (!org || !currentUser) return;
        // if (!confirm("Are you sure you want to leave this organization?")) return;

        try {
            await removeMemberFromOrganization(org.id, currentUser.uid);
            toast.success("You have left the organization.");
            window.location.reload();
        } catch (error) {
            console.error("Error leaving org:", error);
            toast.error("Failed to leave organization.");
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!org) return;
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            await removeMemberFromOrganization(org.id, memberId);
            toast.success("Member removed.");
            const membersData = await getOrganizationMembers(org.id);
            setMembers(membersData);
        } catch (error) {
            toast.error("Failed to remove member");
        }
    };

    const handleChangeRole = async (memberId: string, newRole: 'owner' | 'member') => {
        if (!org) return;
        try {
            await updateMemberRole(org.id, memberId, newRole);
            toast.success(`Role updated to ${newRole}`);
            const updatedMembers = members.map(m =>
                m.id === memberId ? { ...m, role: newRole } : m
            );
            setMembers(updatedMembers);
        } catch (error) {
            toast.error("Failed to update role");
        }
    };

    const handleInviteMember = async () => {
        if (!org || !inviteEmail.trim()) return;
        try {
            await addMemberToOrganization(org.id, inviteEmail);
            toast.success(`Invitation sent to ${inviteEmail}`);
            setInviteEmail("");
            setIsInviteMemberOpen(false);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        try {
            await cancelInvitation(inviteId);
            toast.success("Invitation cancelled");
        } catch (error: any) {
            toast.error("Failed to cancel invitation");
        }
    };


    if (loading) {
        return (
            <div className="flex h-full items-center justify-center pt-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }



    if (!org) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Building className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t("create_team_title")}</h2>
                    <p className="text-slate-500 mb-8">
                        {t("create_team_desc")}
                    </p>

                    <Dialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                                <Plus className="h-4 w-4 mr-2" /> {t("create_org_btn")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("create_org_dialog")}</DialogTitle>
                                <DialogDescription>{t("create_org_desc")}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Label>{t("org_name")}</Label>
                                <Input
                                    value={newOrgName}
                                    onChange={e => setNewOrgName(e.target.value)}
                                    placeholder="e.g. Acme Corp, Design Team"
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateOrg}>{t("create_org_btn")}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        );
    }

    const isOwner = org.ownerId === currentUser?.uid;

    // Helper to get slug
    const orgSlug = org.name.toLowerCase().replace(/\s+/g, '-');


    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                {/* 2. HEADER: BENTO GRID (Identity, Health, People) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">

                    {/* BLOCK 1: IDENTITY (Col-5) */}
                    <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 mobile-icon rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
                                    {org.photoURL ? (
                                        <Avatar className="h-full w-full rounded-xl">
                                            <AvatarImage src={org.photoURL} className="object-cover" />
                                            <AvatarFallback className="bg-indigo-600 text-white rounded-xl">{org.name[0]}</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        org.name[0]
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                        {org.name}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-0 animate-pulse-slow">
                                            {t("teams_pro_plan")}
                                        </Badge>
                                        {org.isPersonal && (
                                            <Badge variant="outline" className="font-normal text-xs text-slate-500 border-slate-200">
                                                Personal
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 relative z-10">
                            <p className="text-slate-500 text-sm line-clamp-2">
                                {org.tagline || "Where we align our visions and conquer goals together."}
                            </p>
                            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 font-mono">
                                <Globe className="h-3 w-3" />
                                <span>{orgSlug}.chamlam.io</span>
                            </div>
                        </div>

                        {/* Decoration */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-indigo-50 dark:bg-indigo-900/10 blur-2xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/20 transition-all duration-500"></div>
                    </div>

                    {/* BLOCK 2: TEAM HEALTH (Col-4) */}
                    <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div>
                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
                                <Users className="h-4 w-4 text-indigo-500" />
                                {t("total_members")}
                            </div>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{members.length}</span>
                                <span className="text-sm font-medium text-slate-400 mb-1.5 flex items-center">
                                    {t("active_label")}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">{t("active_proj")}</div>
                                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{groups.length}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                <div className="text-slate-500 text-xs font-medium uppercase tracking-wider">{t("pending_inv")}</div>
                                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{pendingInvites.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* BLOCK 3: PEOPLE & ACTIONS (Col-3) */}
                    <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-medium text-slate-500">{t("team_status")}</div>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900 text-xs text-emerald-600 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    {members.length} Total
                                </div>
                            </div>

                            {/* Avatar Stack */}
                            <div className="flex items-center -space-x-3">
                                {members.slice(0, 5).map((m, i) => (
                                    <div key={m.id} className="relative z-0 hover:z-10 transition-all hover:scale-110">
                                        <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
                                            <AvatarImage src={m.photoURL} />
                                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">{m.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                ))}
                                {members.length > 5 && (
                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-slate-500 z-0">
                                        +{members.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            {org.isPersonal ? (
                                <Button onClick={() => setIsCreateOrgOpen(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                                    <Rocket className="h-4 w-4 mr-2" /> {t("upgrade_pro")}
                                </Button>
                            ) : (
                                <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/25">
                                            <UserPlus className="h-4 w-4 mr-2" /> {t("invite_member")}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t("invite_dialog_title")} {org.name}</DialogTitle>
                                            <DialogDescription>Enter the email address of the person you want to invite.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>{t("email_address")}</Label>
                                                <Input
                                                    type="email"
                                                    value={inviteEmail}
                                                    onChange={e => setInviteEmail(e.target.value)}
                                                    placeholder="colleague@company.com"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleInviteMember}>{t("send_invite")}</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. TABS UI (Left Aligned, Minimal) */}
                <Tabs defaultValue="members" className="w-full">
                    <TabsList className="w-full justify-start border-b border-slate-200 dark:border-slate-800 h-10 p-0 bg-transparent gap-8 mb-8">
                        <TabsTrigger
                            value="members"
                            className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none px-0 pb-2 text-slate-500 font-medium hover:text-slate-800 transition-colors"
                        >
                            {t("members_tab")}
                        </TabsTrigger>
                        <TabsTrigger
                            value="groups"
                            className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none px-0 pb-2 text-slate-500 font-medium hover:text-slate-800 transition-colors"
                        >
                            {t("groups_tab")}
                        </TabsTrigger>
                        <TabsTrigger
                            value="settings"
                            className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none px-0 pb-2 text-slate-500 font-medium hover:text-slate-800 transition-colors"
                        >
                            {t("settings_tab")}
                        </TabsTrigger>
                    </TabsList>

                    {/* MEMBERS GRID */}
                    <TabsContent value="members" className="mt-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {members.map(member => (
                                <Card key={member.id} className="relative group overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                                    <CardHeader className="text-center pt-8 pb-4 relative z-10">
                                        <div className="relative inline-block mx-auto">
                                            <Avatar className="h-20 w-20 border-4 border-white dark:border-slate-900 shadow-md">
                                                <AvatarImage src={member.photoURL} />
                                                <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xl">{member.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            {/* Online Indicator (Mock for now, or check current user) */}
                                            <div className="absolute bottom-1 right-1 h-5 w-5 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full" title={t("online")}></div>
                                        </div>

                                        <div className="mt-4">
                                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                                                {member.displayName || "Unknown User"}
                                                {member.id === currentUser.uid && <span className="text-xs text-slate-400 font-normal">{t("you_label")}</span>}
                                            </CardTitle>
                                            <div className="flex items-center justify-center gap-2 mt-1">
                                                {member.role === 'owner' ? (
                                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 rounded-full px-3">
                                                        <Shield className="h-3 w-3 mr-1" /> Owner
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-full px-3">Member</Badge>
                                                )}
                                                <span className="text-xs text-slate-400">Designer</span> {/* Mock Role Title */}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pb-6">
                                        <Separator className="mb-4" />

                                        {/* High Density Stats */}
                                        <div className="space-y-3 px-1">
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>GMT+7 (Hanoi)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">
                                                    <Flame className="h-3 w-3" />
                                                    <span>3d Streak</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                                    <span>Workload</span>
                                                    <span>3/5 Tasks</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full w-[60%]"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>

                                    {/* Edit Logic */}
                                    {isOwner && member.id !== currentUser.uid && (
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {member.role === 'member' ? (
                                                        <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'owner')}>
                                                            <UserCog className="h-4 w-4 mr-2" />
                                                            {t("promote_owner")}
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'member')}>
                                                            <UserCog className="h-4 w-4 mr-2" />
                                                            {t("demote_member")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleRemoveMember(member.id)}>
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        {t("remove_member_action")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* GROUPS TAB */}
                    <TabsContent value="groups" className="mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                            {/* New Group Card */}
                            <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                                <DialogTrigger asChild>
                                    <button className="h-[220px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group">
                                        <div className="h-14 w-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                                            <Plus className="h-7 w-7" />
                                        </div>
                                        <span className="font-semibold text-lg">{t("create_group")}</span>
                                        <span className="text-sm text-slate-400 mt-1">{t("organize_team")}</span>
                                    </button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t("create_group")}</DialogTitle>
                                        <DialogDescription>{t("organize_team_desc")}</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Group Name</Label>
                                            <Input
                                                value={newGroupName}
                                                onChange={e => setNewGroupName(e.target.value)}
                                                placeholder="e.g. Marketing, Backend Devs"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateGroup}>{t("create_group_btn")}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Existing Groups */}
                            {groups.map(group => (
                                <Card key={group.id} className="border-slate-200 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all">
                                    <CardHeader className="p-5 pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl border border-indigo-100">
                                                    {group.name[0]}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                                                        {group.name}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs mt-1">
                                                        Created {group.createdAt ? new Date(group.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteGroup(group.id)}>
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        {t("delete_group")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 pt-2">
                                        <div className="flex -space-x-2 overflow-hidden py-3">
                                            {/* Mocking random member avatars for now */}
                                            {group.memberIds?.slice(0, 5).map((id, i) => (
                                                <Avatar key={id} className="border-2 border-white dark:border-slate-950 h-9 w-9 ring-1 ring-slate-100">
                                                    <AvatarFallback className="bg-slate-200 text-xs font-medium text-slate-600">{i % 2 === 0 ? 'A' : 'B'}</AvatarFallback>
                                                </Avatar>
                                            )) || <span className="text-sm text-slate-400 italic">No members yet</span>}
                                            {(group.memberIds?.length || 0) > 5 && (
                                                <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-950 flex items-center justify-center text-xs text-slate-500 font-medium z-10">
                                                    +{(group.memberIds?.length || 0) - 5}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between">
                                        <span className="text-xs font-semibold text-slate-500">
                                            {group.memberIds?.length || 0} Members
                                        </span>
                                        <Badge variant="outline" className="text-xs font-normal border-indigo-200 text-indigo-700 bg-indigo-50">
                                            {t("active_label")}
                                        </Badge>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* SETTINGS TAB (Redesigned) */}
                    <TabsContent value="settings" className="mt-6">
                        <div className="max-w-4xl space-y-8">
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("org_settings")}</h3>
                                <p className="text-sm text-slate-500">{t("org_settings_desc")}</p>
                            </div>

                            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                                <CardContent className="p-8 space-y-8">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">

                                        {/* Row 1: Name */}
                                        <div className="col-span-2 space-y-2">
                                            <Label className="text-slate-700">{t("org_name")}</Label>
                                            <Input
                                                value={orgName}
                                                onChange={(e) => setOrgName(e.target.value)}
                                                disabled={!isOwner}
                                                className="border-slate-200 h-10 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
                                            />
                                        </div>

                                        {/* Row 2: Tagline */}
                                        <div className="col-span-2 space-y-2">
                                            <Label className="text-slate-700">{t("tagline")}</Label>
                                            <Input
                                                value={orgTagline}
                                                onChange={(e) => setOrgTagline(e.target.value)}
                                                placeholder="e.g. Where we align our visions..."
                                                disabled={!isOwner}
                                                className="border-slate-200 h-10 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                            />
                                        </div>

                                        {/* Row 3: Avatar & ID */}
                                        <div className="col-span-1 space-y-2">
                                            <Label className="text-slate-700">{t("avatar_url")}</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    id="avatar-upload"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            try {
                                                                toast.promise(
                                                                    async () => {
                                                                        const url = await uploadFile(file, `orgs/${org.id}/avatar`);
                                                                        setOrgAvatarUrl(url);
                                                                    },
                                                                    {
                                                                        loading: 'Uploading...',
                                                                        success: 'Image uploaded!',
                                                                        error: 'Upload failed'
                                                                    }
                                                                );
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }
                                                    }}
                                                    disabled={!isOwner}
                                                />
                                                <Button
                                                    variant="outline"
                                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                                    disabled={!isOwner}
                                                    className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 justify-start"
                                                >
                                                    <Upload className="h-4 w-4 mr-2" /> {t("upload_image")}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="col-span-1 space-y-2">
                                            <Label className="text-slate-700">{t("org_id")}</Label>
                                            <div className="relative">
                                                <Input
                                                    value={org.id}
                                                    readOnly
                                                    className="bg-slate-50 border-slate-200 h-10 rounded-lg font-mono text-xs text-slate-500 pr-10"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1 h-8 w-8 text-slate-400 hover:text-slate-600"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(org.id);
                                                        toast.success("ID Copied!");
                                                    }}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-between rounded-b-xl">
                                    <Button onClick={handleUpdateOrg} disabled={!isOwner || !orgName.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-medium">
                                        {t("save_changes")}
                                    </Button>
                                    {isOwner ? (
                                        <Button variant="ghost" className="text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteOrg(org.id)}>
                                            {t("delete_org")}
                                        </Button>
                                    ) : (
                                        <Button variant="ghost" className="text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={handleLeaveOrg}>
                                            {t("leave_org")}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* UPGRADE BANNER (Bottom) */}
                {org.isPersonal && (
                    <div className="mt-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Ready to scale your team?</h3>
                                <p className="text-indigo-100 max-w-xl">
                                    Upgrade to a shared organization to unlock advanced features, unlimited members, and enhanced collaboration tools.
                                </p>
                            </div>
                            <Dialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen}>
                                <DialogTrigger asChild>
                                    <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 border-none font-bold">
                                        <Rocket className="h-4 w-4 mr-2" /> Upgrade Now
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Organization</DialogTitle>
                                        <DialogDescription>Enter a name for your team workspace.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-2 py-4">
                                        <Label>Organization Name</Label>
                                        <Input
                                            value={newOrgName}
                                            onChange={e => setNewOrgName(e.target.value)}
                                            placeholder="e.g. Acme Corp, Design Team"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateOrg}>Create Organization</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
