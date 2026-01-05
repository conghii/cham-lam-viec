"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, auth } from "@/lib/firebase/auth";
import {
    createOrganization,
    getUserOrganization,
    getOrganizationMembers,
    addMemberToOrganization,
    updateMemberRole,
    type Organization,
    OrganizationMember,
    Group,
    createGroup,
    deleteGroup,
    subscribeToGroups,
    addMemberToGroup,
    removeMemberFromGroup,
    updateMemberName,
    removeMemberFromOrganization,
    getUserOrganizations,
    switchOrganization,
    updateOrganizationName,
    deleteOrganization,
    db
} from "@/lib/firebase/firestore";
import { updateDoc, doc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, UserPlus, Building2, Shield, MoreVertical, Pencil, Trash2, Plus, CheckCircle2, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TeamPage() {
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [userOrgs, setUserOrgs] = useState<Organization[]>([]);

    // Groups State
    const [newGroupName, setNewGroupName] = useState("");
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Create Org State
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgIsPersonal, setNewOrgIsPersonal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

    // Invite Member State
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    // Edit Member State
    const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState<'member' | 'viewer' | 'restricted'>('member');
    const [savingMember, setSavingMember] = useState(false);
    const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);

    // Edit Org State
    const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
    const [editOrgName, setEditOrgName] = useState("");
    const [updatingOrg, setUpdatingOrg] = useState(false);

    useEffect(() => {
        let groupUnsub: () => void = () => { };

        const init = async () => {
            await loadTeamData();
            groupUnsub = subscribeToGroups((data) => setGroups(data));
        };

        init();

        return () => {
            groupUnsub();
        };
    }, []);

    const loadTeamData = async () => {
        setLoading(true);
        try {
            const user = await getCurrentUser();
            if (user) {
                const orgData = await getUserOrganization(user.uid);
                setOrg(orgData);
                if (orgData) {
                    const membersData = await getOrganizationMembers(orgData.id);
                    setMembers(membersData);
                }
                const orgs = await getUserOrganizations(user.uid);
                setUserOrgs(orgs);
            }
        } catch (error) {
            console.error("Failed to load team data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrgName.trim()) return;

        setCreating(true);
        try {
            const newOrgId = await createOrganization(newOrgName, newOrgIsPersonal);
            // Auto switch to new org? createOrganization already sets user orgId?
            // createOrganization implementation: "await setDoc(userRef, { orgId: orgRef.id ... }, { merge: true })"
            // So yes, it auto switches.
            await loadTeamData();
            setNewOrgName("");
            // Close dialog if open (we'll implement one)
            setIsCreateOrgOpen(false);
            toast.success("Organization created successfully!");
        } catch (error: any) {
            toast.error("Failed to create organization: " + error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateOrgName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editOrgName.trim() || !org) return;

        setUpdatingOrg(true);
        try {
            await updateOrganizationName(org.id, editOrgName.trim());
            setOrg(prev => prev ? { ...prev, name: editOrgName.trim() } : null);
            setIsEditOrgOpen(false);
            toast.success("Organization name updated successfully!");
        } catch (error: any) {
            toast.error("Failed to update organization name: " + error.message);
        } finally {
            setUpdatingOrg(false);
        }
    };

    const handleDeleteOrg = async () => {
        if (!org) return;
        // Skip browser confirm as per user request to remove native popups
        // In a real app we'd use a custom Dialog here.
        setUpdatingOrg(true);
        try {
            await deleteOrganization(org.id);
            toast.success("Organization deleted successfully.");
            window.location.reload();
        } catch (error: any) {
            toast.error("Failed to delete organization: " + error.message);
        } finally {
            setUpdatingOrg(false);
        }
    };

    const handleSwitchOrg = async (orgId: string) => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            await switchOrganization(auth.currentUser.uid, orgId);
            await loadTeamData();
            window.location.reload();
        } catch (error: any) {
            toast.error("Failed to switch organization: " + error.message);
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !org) return;

        setInviting(true);
        try {
            await addMemberToOrganization(org.id, inviteEmail);
            setInviteEmail("");
            setIsInviteOpen(false);
            await loadTeamData(); // Reload members
            toast.success("Member added successfully!");
        } catch (error: any) {
            toast.error("Failed to add member: " + error.message);
        } finally {
            setInviting(false);
        }
    };

    const openEditMember = (member: OrganizationMember) => {
        setEditingMember(member);
        setEditName(member.displayName || "");
        // If owner, default to member in state (though owner can't change their own role usually via this dialog)
        const role = (member.role === 'owner') ? 'member' : member.role;
        setEditRole(role as 'member' | 'viewer' | 'restricted');
        setIsEditMemberOpen(true);
    };

    const handleUpdateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMember || !org) return;

        setSavingMember(true);
        try {
            // 1. Update Role (if changed)
            if (editRole !== editingMember.role) {
                await updateMemberRole(org.id, editingMember.id, editRole);
            }
            // 2. Update Name (if changed)
            if (editName !== editingMember.displayName) {
                await updateMemberName(editingMember.id, editName);
            }
            setIsEditMemberOpen(false);
            await loadTeamData();
            toast.success("Member details updated");
        } catch (error: any) {
            toast.error("Failed to update member: " + error.message);
        } finally {
            setSavingMember(false);
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!org) return;
        // Skip browser confirm as per user request to remove native popups
        try {
            await removeMemberFromOrganization(org.id, memberId);
            await loadTeamData();
            toast.success("Member removed from organization");
        } catch (error: any) {
            toast.error("Failed to remove member: " + error.message);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: 'member' | 'viewer') => {
        if (!org) return;
        try {
            await updateMemberRole(org.id, memberId, newRole);
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            toast.success(`Role updated to ${newRole}`);
        } catch (error: any) {
            toast.error("Failed to update role: " + error.message);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim() || !org) return;

        setCreatingGroup(true);
        try {
            setIsCreateGroupOpen(false);
            toast.success("Group created successfully");
        } catch (error: any) {
            toast.error("Failed to create group: " + error.message);
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleAddMemberToGroup = async (groupId: string, memberId: string) => {
        try {
            await addMemberToGroup(groupId, memberId);
            toast.success("Member added to group");
        } catch (error: any) {
            toast.error("Failed to add member to group: " + error.message);
        }
    };

    const handleRemoveMemberFromGroup = async (groupId: string, memberId: string) => {
        try {
            await removeMemberFromGroup(groupId, memberId);
            toast.success("Member removed from group");
        } catch (error: any) {
            toast.error("Failed to remove member from group: " + error.message);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        // Skip browser confirm as per user request
        try {
            await deleteGroup(groupId);
            toast.success("Group deleted");
        } catch (error: any) {
            toast.error("Failed to delete group: " + error.message);
        }
    };

    const isOwner = org?.ownerId === auth.currentUser?.uid;
    const currentUser = auth.currentUser;
    const currentUserMember = members.find(m => m.id === currentUser?.uid);
    const userRole = isOwner ? 'owner' : (currentUserMember?.role || 'member');

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!org) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="text-center space-y-2">
                    <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto">
                        <Building2 className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Create your Team</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Collaborate with others by creating an organization. Share goals, tasks, and plans.
                    </p>
                </div>

                <Card className="w-full max-w-md border-primary/20 shadow-lg">
                    <CardHeader>
                        <CardTitle>New Organization</CardTitle>
                        <CardDescription>Give your team a name to get started.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Organization Name</label>
                                <Input
                                    placeholder="e.g. Acme Corp, Dream Team"
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="createIsPersonal"
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={newOrgIsPersonal}
                                    onChange={(e) => setNewOrgIsPersonal(e.target.checked)}
                                />
                                <label htmlFor="createIsPersonal" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Mark as Personal Workspace
                                </label>
                            </div>
                            <Button type="submit" className="w-full" disabled={creating}>
                                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Organization"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto p-4">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-bold tracking-tight">{org.name}</h2>
                        {org.isPersonal && (
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">
                                Personal Space
                            </span>
                        )}
                        {isOwner && (
                            <Dialog open={isEditOrgOpen} onOpenChange={(open) => {
                                setIsEditOrgOpen(open);
                                if (open) setEditOrgName(org.name);
                            }}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Organization</DialogTitle>
                                        <CardDescription>Update name and workspace type.</CardDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleUpdateOrgName} className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Organization Name</label>
                                            <Input
                                                value={editOrgName}
                                                onChange={(e) => setEditOrgName(e.target.value)}
                                                placeholder="Enter new name"
                                            />
                                        </div>

                                        <div className="flex items-center space-x-2 pt-2">
                                            <input
                                                type="checkbox"
                                                id="isPersonal"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={org.isPersonal}
                                                readOnly // We'll manage this via a separate action or just show it here
                                            />
                                            <label htmlFor="isPersonal" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                This is a Personal Workspace
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic pl-6">
                                            Personal workspaces are private and cannot have other members.
                                        </p>

                                        <DialogFooter className="flex-col sm:flex-row gap-2">
                                            {isOwner && (
                                                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto" onClick={handleDeleteOrg}>
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete Organization
                                                </Button>
                                            )}
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" onClick={() => setIsEditOrgOpen(false)}>Cancel</Button>
                                                <Button type="submit" disabled={updatingOrg || !editOrgName.trim()}>
                                                    {updatingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Save Changes
                                                </Button>
                                            </div>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        {org.isPersonal ? "Your private workspace for personal goals and tasks." : "Manage your team and members."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" onClick={() => {
                                setNewOrgName("");
                                setNewOrgIsPersonal(false);
                            }}>
                                <Building2 className="mr-2 h-4 w-4" />
                                New Organization
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Organization</DialogTitle>
                                <CardDescription>Give your team a name to get started.</CardDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateOrg} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Organization Name</label>
                                    <Input
                                        placeholder="e.g. Acme Corp, Dream Team"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="createIsPersonalTop"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={newOrgIsPersonal}
                                        onChange={(e) => setNewOrgIsPersonal(e.target.checked)}
                                    />
                                    <label htmlFor="createIsPersonalTop" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Mark as Personal Workspace
                                    </label>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsCreateOrgOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={creating || !newOrgName.trim()}>
                                        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Organization"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {isOwner && !org.isPersonal && (
                        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Invite Member
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Invite new member</DialogTitle>
                                    <CardDescription>
                                        Enter the email address of the user you want to add.
                                        <br />
                                        <span className="text-xs text-amber-600 font-medium">Note: User must already be registered in the app.</span>
                                    </CardDescription>
                                </DialogHeader>
                                <form onSubmit={handleInvite} className="space-y-4 mt-4">
                                    <Input
                                        placeholder="user@example.com"
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                    />
                                    <DialogFooter>
                                        <Button type="submit" disabled={inviting}>
                                            {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Member"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="grid gap-6">
                <Tabs defaultValue="members" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="groups">Groups</TabsTrigger>
                    </TabsList>

                    <TabsContent value="members">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        {org.isPersonal ? "Workspace Owner" : "Team Members"}
                                        <span className="ml-2 text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                                            {members.length}
                                        </span>
                                    </div>
                                    {org.isPersonal && isOwner && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-[10px] h-7 gap-1"
                                            onClick={async () => {
                                                await updateDoc(doc(db, "organizations", org.id), { isPersonal: false });
                                                setOrg(prev => prev ? { ...prev, isPersonal: false } : null);
                                                toast.success("Team features enabled");
                                            }}
                                        >
                                            <Users className="h-3 w-3" /> Enable Team Features
                                        </Button>
                                    )}
                                    {!org.isPersonal && isOwner && members.length === 1 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-[10px] h-7 gap-1"
                                            onClick={async () => {
                                                await updateDoc(doc(db, "organizations", org.id), { isPersonal: true });
                                                setOrg(prev => prev ? { ...prev, isPersonal: true } : null);
                                                toast.success("Workspace marked as personal");
                                            }}
                                        >
                                            <Shield className="h-3 w-3" /> Mark as Personal
                                        </Button>
                                    )}
                                </CardTitle>
                                {org.isPersonal && (
                                    <CardDescription>This is your private space. Only you can see the content here.</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {members.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={member.photoURL} />
                                                    <AvatarFallback>{member.displayName?.charAt(0) || member.email?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{member.displayName || "Unknown"}</p>
                                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {member.id === org.ownerId ? (
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                        <Shield className="h-3 w-3" />
                                                        Owner
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "text-xs px-2 py-1 rounded-full capitalize",
                                                            member.role === 'restricted' ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {member.role || 'member'}
                                                        </span>

                                                        {isOwner && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => openEditMember(member)}>
                                                                        <Pencil className="h-4 w-4 mr-2" /> Edit Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemoveMember(member.id)}>
                                                                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="groups">
                        <div className="grid gap-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">Sub-groups & Teams</h3>
                                {isOwner && (
                                    <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Create Group
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Create new group</DialogTitle>
                                                <CardDescription>Groups help you organize tasks and visibility.</CardDescription>
                                            </DialogHeader>
                                            <form onSubmit={handleCreateGroup} className="space-y-4 mt-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Group Name</label>
                                                    <Input
                                                        placeholder="e.g. Engineering, Marketing"
                                                        value={newGroupName}
                                                        onChange={(e) => setNewGroupName(e.target.value)}
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button type="submit" disabled={creatingGroup}>
                                                        {creatingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Group"}
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {groups.map(group => (
                                    <Card key={group.id} className="overflow-hidden">
                                        <CardHeader className="bg-muted/20 py-4">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    {group.name}
                                                </CardTitle>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteGroup(group.id)}>
                                                    <span className="sr-only">Delete</span>
                                                    <span aria-hidden="true">&times;</span>
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Members</label>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {group.memberIds.map(mid => {
                                                            const member = members.find(m => m.id === mid);
                                                            if (!member) return null;
                                                            return (
                                                                <div key={mid} className="flex items-center gap-1 bg-secondary rounded-full pl-1 pr-2 py-0.5 text-xs">
                                                                    <Avatar className="h-4 w-4">
                                                                        <AvatarImage src={member.photoURL} />
                                                                        <AvatarFallback className="text-[9px]">{member.displayName?.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                    {member.displayName?.split(' ')[0]}
                                                                    <button onClick={() => handleRemoveMemberFromGroup(group.id, mid)} className="ml-1 hover:text-destructive hover:bg-destructive/10 rounded-full w-4 h-4 flex items-center justify-center transition-colors">
                                                                        &times;
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                        {group.memberIds.length === 0 && <span className="text-xs text-muted-foreground italic">No members yet.</span>}
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t">
                                                    <Select onValueChange={(val) => handleAddMemberToGroup(group.id, val)}>
                                                        <SelectTrigger className="h-8 text-xs w-full">
                                                            <SelectValue placeholder="Add member to group..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {members
                                                                .filter(m => !group.memberIds.includes(m.id))
                                                                .map(member => (
                                                                    <SelectItem key={member.id} value={member.id}>
                                                                        <div className="flex items-center gap-2">
                                                                            <Avatar className="h-4 w-4">
                                                                                <AvatarImage src={member.photoURL} />
                                                                                <AvatarFallback className="text-[8px]">{member.displayName?.charAt(0)}</AvatarFallback>
                                                                            </Avatar>
                                                                            {member.displayName}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            {members.every(m => group.memberIds.includes(m.id)) && (
                                                                <div className="p-2 text-xs text-center text-muted-foreground">All members added</div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {groups.length === 0 && (
                                    <div className="col-span-2 text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
                                        <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p>No groups created yet.</p>
                                        <Button variant="link" onClick={() => setIsCreateGroupOpen(true)} className="mt-2">Create your first group</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
            {/* Edit Member Dialog */}
            <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Member</DialogTitle>
                        <CardDescription>Update member details and permissions.</CardDescription>
                    </DialogHeader>
                    {editingMember && (
                        <form onSubmit={handleUpdateMember} className="space-y-4 mt-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Display Name</label>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Member Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <Select value={editRole} onValueChange={(v: any) => setEditRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Member (Can Edit)</SelectItem>
                                        <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                                        <SelectItem value="restricted">Restricted (No Access)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={savingMember}>
                                    {savingMember ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
