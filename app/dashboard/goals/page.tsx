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
import { useLanguage } from "@/components/shared/language-context";

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, addWeeks, subWeeks, addMonths, subMonths, addQuarters, subQuarters, addYears, subYears } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";

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
    const progressPercent = Math.min(100, Math.round((localCurrent / maxVal) * 100));

    return (
        <div className="group/kr py-3 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start mb-2 gap-3">
                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-200 line-clamp-1" title={kr.title}>{kr.title}</span>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0 ml-2">
                            {localCurrent}/{kr.target} {kr.unit}
                        </span>
                    </div>
                </div>

                {/* EDIT / DELETE BUTTONS */}
                {(onEdit || onDelete) && (
                    <div className="flex items-center opacity-0 group-hover/kr:opacity-100 transition-opacity -mr-2">
                        {onEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-blue-600"
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
                                className="h-6 w-6 text-slate-400 hover:text-red-600"
                                onClick={() => onDelete(kr.id)}
                                title="Delete Key Result"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Slider with z-index to ensure it's clickable */}
            <div className="relative z-10 space-y-1.5" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <Slider
                    value={[localCurrent]}
                    min={0}
                    max={maxVal}
                    step={1}
                    onValueChange={(val) => setLocalCurrent(val[0])}
                    onValueCommit={(val) => updateKeyResultProgress(goalId, kr.id, val[0])}
                    className="cursor-pointer py-1 [&_.bg-primary]:bg-blue-500/80 hover:[&_.bg-primary]:bg-blue-600"
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

type FilterType = 'all' | 'week' | 'month' | 'quarter' | 'year';

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

    // Time Filtering
    const searchParams = useSearchParams();
    const viewParam = searchParams.get('view');
    const validFilters: FilterType[] = ['all', 'week', 'month', 'quarter', 'year'];
    const initialFilter = validFilters.includes(viewParam as FilterType) ? (viewParam as FilterType) : 'all';

    const [filterType, setFilterType] = useState<FilterType>(initialFilter);
    const [currentDate, setCurrentDate] = useState(new Date());

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

    // Keep selectedGoal in sync with goals updates (for Key Results etc)
    useEffect(() => {
        if (selectedGoal && goals.length > 0) {
            const updatedGoal = goals.find(g => g.id === selectedGoal.id);
            if (updatedGoal && JSON.stringify(updatedGoal) !== JSON.stringify(selectedGoal)) {
                setSelectedGoal(updatedGoal);
            }
        }
    }, [goals, selectedGoal]);

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

    // Time Navigation Helpers
    const navigateTime = (direction: 'prev' | 'next') => {
        if (filterType === 'week') {
            setCurrentDate(d => direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1));
        } else if (filterType === 'month') {
            setCurrentDate(d => direction === 'next' ? addMonths(d, 1) : subMonths(d, 1));
        } else if (filterType === 'quarter') {
            setCurrentDate(d => direction === 'next' ? addQuarters(d, 1) : subQuarters(d, 1));
        } else if (filterType === 'year') {
            setCurrentDate(d => direction === 'next' ? addYears(d, 1) : subYears(d, 1));
        }
    };

    const getPeriodLabel = () => {
        if (filterType === 'week') {
            const start = startOfWeek(currentDate);
            const end = endOfWeek(currentDate);
            return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
        } else if (filterType === 'month') {
            return format(currentDate, 'MMMM yyyy');
        } else if (filterType === 'quarter') {
            return `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${format(currentDate, 'yyyy')}`;
        } else if (filterType === 'year') {
            return format(currentDate, 'yyyy');
        }
        return '';
    };

    // Filter Logic
    const filteredGoals = goals.filter(goal => {
        if (!currentUser) return false;

        // 1. Author
        let allow = false;
        if (goal.userId === currentUser.uid) allow = true;

        // 2. Assigned
        if (goal.assigneeIds?.includes(currentUser.uid)) allow = true;

        // 3. Group Assigned
        const userGroupIds = groups.filter(g => g.memberIds.includes(currentUser.uid)).map(g => g.id);
        if (goal.groupIds?.some(gid => userGroupIds.includes(gid))) allow = true;

        // 4. Unassigned (Visible to all)
        const hasAssignments = (goal.assigneeIds && goal.assigneeIds.length > 0) || (goal.groupIds && goal.groupIds.length > 0);
        if (!hasAssignments) allow = true;

        if (!allow) return false;

        // 5. Time Filtering
        if (filterType === 'all') return true;
        if (!goal.targetDate) return false; // Hide goals without dates in specific filters

        const target = new Date(goal.targetDate);
        let start, end;

        if (filterType === 'week') {
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
        } else if (filterType === 'month') {
            start = startOfWeek(startOfMonth(currentDate)); // To see full weeks in calendar view context essentially, but stick to standard startOfMonth for logic if strict. Let's use strict month boundaries for now.
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        } else if (filterType === 'quarter') {
            start = startOfQuarter(currentDate);
            end = endOfQuarter(currentDate);
        } else if (filterType === 'year') {
            start = startOfYear(currentDate);
            end = endOfYear(currentDate);
        }

        if (start && end) {
            return isWithinInterval(target, { start, end });
        }

        return false;
    });

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

        // Validation with Feedback
        if (!activeGoalId) {
            toast.error("Internal Error: Goal ID missing.");
            return;
        }
        if (!newKRTitle.trim()) {
            toast.error("Please enter a Key Result title.");
            return;
        }
        if (!newKRTarget) {
            toast.error("Please enter a Target Value.");
            return;
        }

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
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-transparent">
            <div className="space-y-8 max-w-7xl mx-auto p-6 md:p-8 pb-32">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 hover:shadow-md transition-all duration-200">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("total_progress")}</CardDescription>
                                    <CardTitle className="text-4xl font-black text-slate-900 dark:text-white mt-1">
                                        {overallProgress}%
                                    </CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                                <span>↑ 12%</span>
                                <span className="text-slate-400 font-normal">{t("vs_last_month")}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 hover:shadow-md transition-all duration-200">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("active_goals")}</CardDescription>
                                    <CardTitle className="text-4xl font-black text-slate-900 dark:text-white mt-1">
                                        {activeGoals}
                                    </CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-500 font-medium">
                                {t("keep_it_up")}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 hover:shadow-md transition-all duration-200">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("completed_goals")}</CardDescription>
                                    <CardTitle className="text-4xl font-black text-slate-900 dark:text-white mt-1">
                                        {completedGoals}
                                    </CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-500 font-medium">
                                {t("keep_it_up")}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    {/* Filters */}
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)} className="w-auto">
                            <TabsList className="bg-transparent h-9 p-0 gap-1">
                                <TabsTrigger value="all" className="rounded-lg h-9 px-3 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">All</TabsTrigger>
                                <TabsTrigger value="week" className="rounded-lg h-9 px-3 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">Week</TabsTrigger>
                                <TabsTrigger value="month" className="rounded-lg h-9 px-3 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">Month</TabsTrigger>
                                <TabsTrigger value="quarter" className="rounded-lg h-9 px-3 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">Quarter</TabsTrigger>
                                <TabsTrigger value="year" className="rounded-lg h-9 px-3 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">Year</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {filterType !== 'all' && (
                            <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => navigateTime('prev')}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium w-36 text-center tabular-nums">{getPeriodLabel()}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => navigateTime('next')}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {canEdit && (
                        <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="shadow-lg hover:shadow-primary/20 transition-all">
                                    <Plus className="h-5 w-5 mr-2" /> {t("create_objective")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t("create_objective")}</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleAddGoal} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t("objective_title")}</label>
                                        <Input
                                            placeholder={t("objective_placeholder")}
                                            value={newGoalTitle}
                                            onChange={(e) => setNewGoalTitle(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t("overview")}</label>
                                        <Input
                                            placeholder={t("description_placeholder")}
                                            value={newGoalDesc}
                                            onChange={(e) => setNewGoalDesc(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t("target_date")}</label>
                                        <Input
                                            type="date"
                                            value={newGoalDate}
                                            onChange={(e) => setNewGoalDate(e.target.value)}
                                        />
                                    </div>
                                    {orgId && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t("assignees_teams")}</label>
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
                                        <Button type="submit">{t("create_goal_button")}</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Goals Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <div className="col-span-full flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                    ) : filteredGoals.length === 0 ? (
                        <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/50">
                            <Target className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t("no_goals_visible")}</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-4">{t("create_first_goal")}</p>
                            <Button onClick={() => setIsAddGoalOpen(true)} variant="outline">{t("create_goal_action")}</Button>
                        </div>
                    ) : (
                        filteredGoals.map((goal) => (
                            <Card key={goal.id} onClick={() => openGoalDetails(goal, false)} className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-300 cursor-pointer flex flex-col h-full">
                                <CardHeader className="pb-3 relative z-10 flex-shrink-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-1 flex-1 mr-2">
                                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2" title={goal.title}>
                                                {goal.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <CalendarIcon className="h-3.5 w-3.5 opacity-70" />
                                                    {goal.targetDate ? format(new Date(goal.targetDate), "MMM d, yyyy") : "No deadline"}
                                                </span>
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-slate-900 -mr-2 -mt-1" onClick={(e) => e.stopPropagation()}>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openGoalDetails(goal, true); }}>
                                                        <Pencil className="h-4 w-4 mr-2" /> {t("edit_objective")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> {t("delete_objective")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>

                                    <div className="mt-3 space-y-1.5">
                                        <div className="flex justify-between items-end text-xs">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{t("total_progress")}</span>
                                            <span className={cn("font-bold text-sm", goal.progress >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400")}>
                                                {goal.progress}%
                                            </span>
                                        </div>
                                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-500 ease-out",
                                                    goal.progress >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-blue-400 to-indigo-500"
                                                )}
                                                style={{ width: `${goal.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* Separator */}
                                <div className="px-6">
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />
                                </div>

                                <CardContent className="pt-4 flex-1 flex flex-col relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("key_results")}</h4>
                                        {canEdit && (
                                            <Button variant="ghost" size="sm" className="h-5 text-[10px] uppercase font-semibold text-slate-400 hover:text-blue-600 hover:bg-blue-50 -mr-2 px-2" onClick={(e) => { e.stopPropagation(); openAddKR(goal.id); }}>
                                                <Plus className="h-3 w-3 mr-1" /> {t("add_task")}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-1 flex-1">
                                        {(goal.keyResults && goal.keyResults.length > 0) ? (
                                            <div className="space-y-1">
                                                {goal.keyResults.map((kr) => (
                                                    <KeyResultItem
                                                        key={kr.id}
                                                        goalId={goal.id}
                                                        kr={kr}
                                                        onEdit={canEdit ? (kr) => openEditKR(goal.id, kr) : undefined}
                                                        onDelete={canEdit ? (krId) => handleDeleteKeyResult(goal.id, krId) : undefined}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            canEdit ? (
                                                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all group/empty h-full flex flex-col items-center justify-center min-h-[100px]" onClick={(e) => { e.stopPropagation(); openAddKR(goal.id); }}>
                                                    <Target className="h-5 w-5 text-slate-300 group-hover/empty:text-blue-400 mb-1" />
                                                    <p className="text-xs text-slate-500 group-hover/empty:text-blue-600 font-medium">{t("add_first_key_result")}</p>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-400 italic text-center py-4">{t("no_key_results")}</div>
                                            )
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            {/* Minimal Assignee Display directly here for cleaner look, or re-use refined component if needed. Using AssigneeDisplay for now but maybe wrap it? */}
                                            <AssigneeDisplay
                                                assigneeIds={goal.assigneeIds}
                                                groupIds={goal.groupIds}
                                                members={members}
                                                groups={groups}
                                            // max={3} // removed max as it caused type error
                                            />
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
                            <DialogTitle>{editingKR ? t("edit_key_result") : t("add_key_result")}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveKeyResult} className="space-y-4 mt-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t("result_title")}</label>
                                <Input
                                    placeholder={t("result_placeholder")}
                                    value={newKRTitle}
                                    onChange={(e) => setNewKRTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-medium">{t("target_value")}</label>
                                    <Input
                                        type="number"
                                        placeholder="5"
                                        value={newKRTarget}
                                        onChange={(e) => setNewKRTarget(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-medium">{t("unit")}</label>
                                    <Input
                                        placeholder="books"
                                        value={newKRUnit}
                                        onChange={(e) => setNewKRUnit(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">{editingKR ? t("save_changes_kr") : t("save_result")}</Button>
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
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t("objective_title")}</label>
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
                                            {selectedGoal?.progress}% {t("achieved")}
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

            </div>
        </div>
    );
}
