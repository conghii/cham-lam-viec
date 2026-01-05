"use client";

import { subscribeToGoals, addGoal, deleteGoal, addKeyResult, updateKeyResultProgress, updateGoalManualProgress, updateGoal, updateKeyResult, deleteKeyResult, type Goal, type KeyResult, type Comment, addGoalComment, subscribeToGoalComments, deleteGoalComment, updateGoalComment, subscribeToGoalTasks, type Task, OrganizationMember, getOrganizationMembers, getUserOrganization, subscribeToGroups, Group } from "@/lib/firebase/firestore";
import { UserGroupSelect } from "@/components/dashboard/user-group-select";
import { AssigneeDisplay } from "@/components/dashboard/assignee-display";
import { auth } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Target, Pencil, MoreVertical, X, Trophy, TrendingUp, CheckCircle2, MessageSquare, Send, Calendar as CalendarIcon, Edit2, Link, CheckSquare, Square, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { format } from "date-fns";

function KeyResultItem({ goalId, kr, onEdit, onDelete }: {
    goalId: string;
    kr: KeyResult;
    onEdit?: (kr: KeyResult) => void;
    onDelete?: (krId: string) => void;
}) {
    const [localCurrent, setLocalCurrent] = useState(kr.current);

    // Sync local state if prop changes (e.g. from DB update)
    useEffect(() => {
        setLocalCurrent(kr.current || 0);
    }, [kr.current]);

    // Ensure max is at least 1 to prevent division by zero or stuck slider
    const maxVal = Math.max(1, kr.target || 100);

    return (
        <div className="relative group/kr pl-3 border-l-2 border-muted hover:border-primary transition-colors py-2">
            <div className="flex justify-between items-center mb-2">
                <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-foreground/90">{kr.title}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">
                                {localCurrent} / {kr.target} {kr.unit}
                            </span>

                            {/* EDIT / DELETE BUTTONS */}
                            <div className="flex items-center gap-0.5">
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-primary z-20 relative"
                                        onClick={() => onEdit(kr)}
                                        title="Edit Key Result"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive z-20 relative"
                                        onClick={() => onDelete(kr.id)}
                                        title="Delete Key Result"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slider with z-index to ensure it's clickable */}
            <div className="relative z-10 px-1">
                <Slider
                    value={[localCurrent]}
                    min={0}
                    max={maxVal}
                    step={1}
                    onValueChange={(val) => setLocalCurrent(val[0])}
                    onValueCommit={(val) => updateKeyResultProgress(goalId, kr.id, val[0])}
                    className="cursor-pointer py-1"
                />
            </div>
        </div>
    );
}

function GoalCommentItem({ comment, goalId }: { comment: Comment; goalId: string }) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(comment.content);
    const currentUser = auth.currentUser;
    const isOwner = currentUser?.uid === comment.userId;

    const handleUpdate = async () => {
        if (!content.trim()) return;
        await updateGoalComment(goalId, comment.id, content);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        await deleteGoalComment(goalId, comment.id);
    };

    return (
        <div className="flex gap-3 text-sm group/comment">
            <Avatar className="h-8 w-8">
                <AvatarImage src={comment.userPhotoURL} />
                <AvatarFallback>{comment.userDisplayName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-xs">{comment.userDisplayName}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {comment.createdAt ? format(comment.createdAt.toDate(), "MMM d, h:mm a") : "Just now"}
                    </span>
                </div>

                {isEditing ? (
                    <div className="space-y-2">
                        <Input
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdate} className="h-6 text-xs px-2">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-6 text-xs px-2">Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <div className="group relative">
                        <p className="text-muted-foreground leading-snug text-xs bg-muted/40 p-2 rounded-lg pr-8">
                            {comment.content}
                        </p>
                        {isOwner && (
                            <div className="absolute top-1 right-1 opacity-100 md:opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-background/80">
                                            <MoreVertical className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                            <Edit2 className="h-3 w-3 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                                            <Trash2 className="h-3 w-3 mr-2" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer' | 'restricted' | null>(null);

    // Add Goal State
    const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
    const [newGoalTitle, setNewGoalTitle] = useState("");
    const [newGoalDate, setNewGoalDate] = useState("");
    const [newGoalDesc, setNewGoalDesc] = useState("");
    const [newGoalAssigneeIds, setNewGoalAssigneeIds] = useState<string[]>([]);
    const [newGoalGroupIds, setNewGoalGroupIds] = useState<string[]>([]);

    // Org Context
    const [orgId, setOrgId] = useState<string | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);

    // Visibility
    const [groups, setGroups] = useState<Group[]>([]);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);

    // State for Adding/Editing Key Result
    const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
    const [editingKR, setEditingKR] = useState<KeyResult | null>(null);
    const [newKRTitle, setNewKRTitle] = useState("");
    const [newKRTarget, setNewKRTarget] = useState("");
    const [newKRUnit, setNewKRUnit] = useState("");
    const [isKRModalOpen, setIsKRModalOpen] = useState(false);

    // State for Editing Goal
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Comments for selected goal
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");

    // Linked Tasks
    const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);

    useEffect(() => {
        if (selectedGoal && isDetailsOpen) {
            const unsubComments = subscribeToGoalComments(selectedGoal.id, setComments);
            const unsubTasks = subscribeToGoalTasks(selectedGoal.id, setLinkedTasks);

            return () => {
                unsubComments();
                unsubTasks();
            };
        }
    }, [selectedGoal, isDetailsOpen]);

    const openGoalDetails = (goal: Goal, edit: boolean = false) => {
        setSelectedGoal(goal);
        setIsEditMode(edit);
        setIsDetailsOpen(true);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGoal || !newComment.trim()) return;
        await addGoalComment(selectedGoal.id, newComment);
        setNewComment("");
    };

    useEffect(() => {
        const fetchOrgData = async (uid: string) => {
            const org = await getUserOrganization(uid);
            if (org) {
                setOrgId(org.id);
                const mems = await getOrganizationMembers(org.id);
                setMembers(mems);

                const currentUserMember = mems.find(m => m.id === uid);
                if (currentUserMember) {
                    setUserRole(currentUserMember.role);
                }
            }
        };

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            if (user) {
                fetchOrgData(user.uid);
            }
        });

        const unsubscribeGoals = subscribeToGoals((data) => {
            setGoals(data);
            setLoading(false);
        });

        const unsubscribeGroups = subscribeToGroups((data) => {
            setGroups(data);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeGoals();
            unsubscribeGroups();
        }
    }, []);

    // Filter Logic
    const filteredGoals = goals.filter(goal => {
        if (!currentUser) return false

        // 1. Author
        if (goal.userId === currentUser.uid) return true

        // 2. Assigned
        if (goal.assigneeIds?.includes(currentUser.uid)) return true

        // 3. Group Assigned
        const userGroupIds = groups.filter(g => g.memberIds.includes(currentUser.uid)).map(g => g.id)
        if (goal.groupIds?.some(gid => userGroupIds.includes(gid))) return true

        // 4. Unassigned (Visible to all)
        const hasAssignments = (goal.assigneeIds && goal.assigneeIds.length > 0) || (goal.groupIds && goal.groupIds.length > 0)
        if (!hasAssignments) return true

        return false
    })

    // Handlers


    // Local Edit State for Details Dialog
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
    const [editGroupIds, setEditGroupIds] = useState<string[]>([]);

    // Sync state when opening details
    useEffect(() => {
        if (selectedGoal) {
            setTitle(selectedGoal.title);
            setDescription(selectedGoal.description || "");
            setDate(selectedGoal.targetDate ? new Date(selectedGoal.targetDate) : undefined);
            setEditAssigneeIds(selectedGoal.assigneeIds || []);
            setEditGroupIds(selectedGoal.groupIds || []);
        }
    }, [selectedGoal]);

    // Handlers
    const handleAddGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoalTitle.trim()) return;
        try {
            await addGoal(newGoalTitle, newGoalDate, newGoalDesc, newGoalAssigneeIds, newGoalGroupIds);
            setNewGoalTitle("");
            setNewGoalDate("");
            setNewGoalDesc("");
            setNewGoalAssigneeIds([]);
            setNewGoalGroupIds([]);
            setIsAddGoalOpen(false);
            toast.success("Objective created successfully!");
        } catch (error: any) {
            console.error("Failed to add goal", error);
            toast.error(`Failed to add goal: ${error.message}`);
        }
    };

    const handleSaveDetails = async () => {
        if (!selectedGoal || !title.trim()) return;
        try {
            await updateGoal(selectedGoal.id, {
                title,
                description,
                targetDate: date ? date.toISOString() : undefined,
                assigneeIds: editAssigneeIds,
                groupIds: editGroupIds
            });
            setIsDetailsOpen(false);
            toast.success("Objective updated");
        } catch (error: any) {
            toast.error(`Failed to update goal: ${error.message}`);
        }
    };


    const handleSaveKeyResult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeGoalId || !newKRTitle.trim() || !newKRTarget) return;
        try {
            if (editingKR) {
                await updateKeyResult(activeGoalId, {
                    ...editingKR,
                    title: newKRTitle,
                    target: Number(newKRTarget),
                    unit: newKRUnit || "units"
                });
            } else {
                await addKeyResult(activeGoalId, {
                    title: newKRTitle,
                    target: Number(newKRTarget),
                    current: 0,
                    unit: newKRUnit || "units"
                });
            }
            closeKRModal();
            toast.success("Key Result saved");
        } catch (error: any) {
            toast.error(`Failed to save Key Result: ${error.message}`);
        }
    };

    const handleDeleteKeyResult = async (goalId: string, krId: string) => {
        try {
            await deleteKeyResult(goalId, krId);
            toast.success("Key Result deleted");
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const openAddKR = (goalId: string) => {
        setActiveGoalId(goalId);
        setEditingKR(null);
        setNewKRTitle("");
        setNewKRTarget("");
        setNewKRUnit("");
        setIsKRModalOpen(true);
    };

    const openEditKR = (goalId: string, kr: KeyResult) => {
        setActiveGoalId(goalId);
        setEditingKR(kr);
        setNewKRTitle(kr.title);
        setNewKRTarget(String(kr.target));
        setNewKRUnit(kr.unit);
        setIsKRModalOpen(true);
    }

    const closeKRModal = () => {
        setIsKRModalOpen(false);
        setEditingKR(null);
        setActiveGoalId(null);
        setNewKRTitle("");
        setNewKRTarget("");
        setNewKRUnit("");
    }

    // Stats Logic
    const totalGoals = filteredGoals.length;
    const completedGoals = filteredGoals.filter(g => g.progress >= 100).length;
    const activeGoals = totalGoals - completedGoals;
    const overallProgress = totalGoals > 0 ? Math.round(filteredGoals.reduce((acc, g) => acc + g.progress, 0) / totalGoals) : 0;

    if (userRole === 'restricted') {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="bg-destructive/10 p-4 rounded-full w-fit mx-auto">
                        <Shield className="h-10 w-10 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold">Access Restricted</h2>
                    <p className="text-muted-foreground">You do not have permission to view goals. Please contact your organization owner.</p>
                </div>
            </div>
        );
    }

    const canEdit = userRole === 'owner' || userRole === 'member';

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-2 pb-20">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Goals & OKRs
                    </h2>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Execute your vision. Track what matters.
                    </p>
                </div>
                {canEdit && (
                    <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="shadow-lg hover:shadow-primary/20 transition-all">
                                <Plus className="h-5 w-5 mr-2" /> New Objective
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Objective</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddGoal} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Objective Title</label>
                                    <Input
                                        placeholder="e.g. Become Market Leader"
                                        value={newGoalTitle}
                                        onChange={(e) => setNewGoalTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input
                                        placeholder="Why is this important?"
                                        value={newGoalDesc}
                                        onChange={(e) => setNewGoalDesc(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Target Date</label>
                                    <Input
                                        type="date"
                                        value={newGoalDate}
                                        onChange={(e) => setNewGoalDate(e.target.value)}
                                    />
                                </div>
                                {orgId && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Assignees & Teams</label>
                                        <UserGroupSelect
                                            orgId={orgId}
                                            assigneeIds={newGoalAssigneeIds}
                                            groupIds={newGoalGroupIds}
                                            onAssigneeChange={setNewGoalAssigneeIds}
                                            onGroupChange={setNewGoalGroupIds}
                                            members={members}
                                        />
                                    </div>
                                )}
                                <DialogFooter>
                                    <Button type="submit">Create Objective</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/40 backdrop-blur-sm border-primary/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Progress</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-center gap-2">
                            {overallProgress}%
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Progress value={overallProgress} className="h-1.5" />
                    </CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur-sm border-primary/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Active Goals</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-center gap-2">
                            {activeGoals}
                            <Target className="h-5 w-5 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Keep pushing!
                    </CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur-sm border-primary/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Completed</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-center gap-2">
                            {completedGoals}
                            <Trophy className="h-5 w-5 text-yellow-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Objectives crushed.
                    </CardContent>
                </Card>
            </div>

            {/* Goals Grid */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {loading ? (
                    <div className="col-span-full flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : filteredGoals.length === 0 ? (
                    <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No objectives visible to you.</h3>
                        <p className="text-muted-foreground mb-4">Start by creating your first big objective.</p>
                        <Button onClick={() => setIsAddGoalOpen(true)} variant="outline">Create Goal</Button>
                    </div>
                ) : (
                    filteredGoals.map((goal) => (
                        <Card key={goal.id} onClick={() => openGoalDetails(goal, false)} className="group relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:border-primary/20 cursor-pointer">
                            {/* Header Gradient Stripe */}
                            <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity")} />

                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl font-bold leading-tight">{goal.title}</CardTitle>
                                            {goal.progress >= 100 && <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Done</Badge>}
                                        </div>
                                        {goal.description && <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>}
                                    </div>
                                    {canEdit && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                {/* Stop propagation so clicking menu doesn't open card */}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openGoalDetails(goal, true); }}>
                                                    <Pencil className="h-4 w-4 mr-2" /> Edit Objective
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}>
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between items-center text-sm font-medium">
                                        <span className="text-muted-foreground">{goal.targetDate ? `Due ${new Date(goal.targetDate).toLocaleDateString()}` : "No deadline"}</span>
                                        <AssigneeDisplay
                                            assigneeIds={goal.assigneeIds}
                                            groupIds={goal.groupIds}
                                            members={members}
                                            groups={groups}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-medium">
                                        <span className={cn(goal.progress >= 100 ? "text-green-500" : "text-primary")}>{goal.progress}%</span>
                                    </div>
                                    <Progress value={goal.progress} className="h-2" />
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Results</h4>
                                        {canEdit && (
                                            <Button variant="ghost" size="sm" className="h-6 text-xs hover:bg-primary/10 hover:text-primary" onClick={() => openAddKR(goal.id)}>
                                                <Plus className="h-3 w-3 mr-1" /> Add KR
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {(goal.keyResults && goal.keyResults.length > 0) ? (
                                            goal.keyResults.map((kr) => (
                                                <KeyResultItem
                                                    key={kr.id}
                                                    goalId={goal.id}
                                                    kr={kr}
                                                    onEdit={canEdit ? (kr) => openEditKR(goal.id, kr) : undefined}
                                                    onDelete={canEdit ? (krId) => handleDeleteKeyResult(goal.id, krId) : undefined}
                                                />
                                            ))
                                        ) : (
                                            canEdit ? (
                                                <div className="bg-muted/30 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openAddKR(goal.id)}>
                                                    <p className="text-sm text-muted-foreground italic">No key results. Click to add.</p>
                                                    {/* Legacy Manual Slider fallback if needed, but keeping UI clean is better. */}
                                                    <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                                                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                                                            <span>Manual Update</span>
                                                        </div>
                                                        <Slider
                                                            defaultValue={[goal.progress]}
                                                            max={100}
                                                            step={5}
                                                            onValueCommit={(val) => updateGoalManualProgress(goal.id, val[0])}
                                                            className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground italic text-center py-4">No key results set.</div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Shared Dialogs */}
            <Dialog open={isKRModalOpen} onOpenChange={(open) => { if (!open) closeKRModal(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingKR ? "Edit Key Result" : "Add Key Result"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveKeyResult} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Result Title</label>
                            <Input
                                placeholder="e.g. Read 5 books"
                                value={newKRTitle}
                                onChange={(e) => setNewKRTitle(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <label className="text-sm font-medium">Target Value</label>
                                <Input
                                    type="number"
                                    placeholder="5"
                                    value={newKRTarget}
                                    onChange={(e) => setNewKRTarget(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <label className="text-sm font-medium">Unit</label>
                                <Input
                                    placeholder="books"
                                    value={newKRUnit}
                                    onChange={(e) => setNewKRUnit(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">{editingKR ? "Save Changes" : "Save Result"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="!max-w-[65vw] !w-[65vw] h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-0 shadow-2xl bg-background/95 backdrop-blur-3xl ring-1 ring-white/10">

                    {/* Header with Hero Gradient */}
                    <DialogHeader className="px-8 py-6 border-b shrink-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent">
                        <DialogTitle className="sr-only">Goal Details</DialogTitle>
                        <div className="flex items-start justify-between gap-6">
                            <div className="space-y-2 flex-1 relative">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Objective</label>
                                {isEditMode ? (
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="font-bold text-3xl md:text-4xl border-transparent px-0 h-auto focus-visible:ring-0 bg-transparent hover:bg-white/5 transition-all text-foreground placeholder:text-muted-foreground/50 tracking-tight"
                                        placeholder="Enter your ambitious goal..."
                                    />
                                ) : (
                                    <h2 className="font-bold text-3xl md:text-4xl text-foreground tracking-tight py-1">{title}</h2>
                                )}
                                <div className="flex items-center gap-3 pt-1">
                                    <Badge variant={(selectedGoal?.progress || 0) >= 100 ? "default" : "secondary"} className="rounded-full px-3 py-0.5 font-medium transition-all">
                                        {(selectedGoal?.progress || 0) >= 100 ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Target className="h-3.5 w-3.5 mr-1" />}
                                        {selectedGoal?.progress}% Achieved
                                    </Badge>
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        {isEditMode ? (
                                            <Input
                                                type="date"
                                                value={date ? format(date, "yyyy-MM-dd") : ""}
                                                onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
                                                className="w-auto h-6 text-xs px-2 py-0 inline-flex ml-2"
                                            />
                                        ) : (
                                            <span>{date ? format(date, "MMMM d, yyyy") : "No deadline"}</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {isEditMode && orgId && (
                            <div className="pt-2">
                                <UserGroupSelect
                                    orgId={orgId}
                                    assigneeIds={editAssigneeIds}
                                    groupIds={editGroupIds}
                                    onAssigneeChange={setEditAssigneeIds}
                                    onGroupChange={setEditGroupIds}
                                    members={members}
                                />
                            </div>
                        )}

                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x bg-background/50">
                        {/* Main Content (Left) */}
                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-10 max-w-4xl mx-auto">

                                {/* Why / Description */}
                                <div className="space-y-3 group/desc">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                                            <span className="w-1 h-4 rounded-full bg-primary/50 block"></span>
                                            Why this matters
                                        </label>
                                    </div>
                                    {isEditMode ? (
                                        <textarea
                                            className="min-h-[120px] w-full rounded-xl border-border/40 bg-card/50 px-4 py-3 text-base leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-card transition-all resize-none shadow-sm hover:border-primary/20"
                                            placeholder="Describe the impact of achieving this goal. What's the motivation?"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                    ) : (
                                        <p className="min-h-[60px] text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                            {description || "No description provided."}
                                        </p>
                                    )}
                                </div>

                                <Separator className="opacity-50" />

                                {/* Key Results */}
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                                            <Target className="h-4 w-4 text-primary" /> Key Results
                                        </h3>
                                        {isEditMode && (
                                            <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-medium border-dashed" onClick={() => selectedGoal && openAddKR(selectedGoal.id)}>
                                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Result
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid gap-3">
                                        {selectedGoal && selectedGoal.keyResults && selectedGoal.keyResults.length > 0 ? (
                                            selectedGoal.keyResults.map((kr) => (
                                                <div key={kr.id} className="bg-card/40 border border-border/40 rounded-xl p-1 transition-all hover:bg-card/80 hover:shadow-sm hover:border-primary/20">
                                                    <KeyResultItem
                                                        goalId={selectedGoal.id}
                                                        kr={kr}
                                                        onEdit={isEditMode ? (kr) => openEditKR(selectedGoal.id, kr) : undefined}
                                                        onDelete={isEditMode ? (krId) => handleDeleteKeyResult(selectedGoal.id, krId) : undefined}
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12 border-2 border-dashed border-muted/50 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => isEditMode && selectedGoal && openAddKR(selectedGoal.id)}>
                                                <Target className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                                                <h3 className="font-medium text-muted-foreground">Define success</h3>
                                                <p className="text-xs text-muted-foreground/70">{isEditMode ? "Add key results to track your progress." : "No key results defined."}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </ScrollArea>

                        {/* Sidebar (Right) */}
                        <div className="w-full lg:w-[380px] bg-muted/5 flex flex-col h-[400px] lg:h-auto border-l border-border/50">

                            {/* Linked Tasks Section */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="p-4 border-b border-border/40 bg-muted/10">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Link className="h-3.5 w-3.5" /> Linked Tasks
                                    </h4>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-4 space-y-2">
                                        {linkedTasks.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic text-center py-4">No tasks linked to this goal yet.</p>
                                        ) : (
                                            linkedTasks.map(task => (
                                                <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 group transition-colors border border-transparent hover:border-border/50">
                                                    <div className={cn("mt-0.5", task.completed ? "text-green-500" : "text-muted-foreground")}>
                                                        {task.completed ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn("text-sm truncate", task.completed && "line-through text-muted-foreground")}>{task.title}</p>
                                                        {task.dueDate && <p className="text-[10px] text-muted-foreground">{task.dueDate}</p>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            <Separator />

                            {/* Activity Section */}
                            <div className="flex-1 flex flex-col min-h-0 bg-background/30">
                                <div className="p-4 border-b border-border/40 bg-muted/10 flex items-center justify-between sticky top-0 backdrop-blur-md">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <MessageSquare className="h-3.5 w-3.5" /> Activity
                                    </h4>
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{comments.length}</Badge>
                                </div>

                                <ScrollArea className="flex-1 p-0">
                                    <div className="p-4 space-y-4">
                                        {comments.length === 0 ? (
                                            <div className="text-center py-10">
                                                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                                                <p className="text-xs text-muted-foreground">Start the conversation.</p>
                                            </div>
                                        ) : (
                                            comments.map(comment => (
                                                <GoalCommentItem key={comment.id} comment={comment} goalId={selectedGoal?.id || ""} />
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-3 border-t bg-background/80 backdrop-blur pb-safe">
                                    <form onSubmit={handleAddComment} className="flex gap-2 relative">
                                        <Input
                                            placeholder="Write an update..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            className="h-10 text-sm pl-3 pr-10 rounded-full bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all"
                                        />
                                        <Button type="submit" size="icon" className="absolute right-1 top-1 h-8 w-8 rounded-full" disabled={!newComment.trim()}>
                                            <Send className="h-3.5 w-3.5" />
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t bg-muted/5 shrink-0">
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="rounded-full">Close</Button>
                        {isEditMode && (
                            <Button onClick={handleSaveDetails} className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">Save Changes</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog >

        </div >
    );
}
