"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, addWeeks, subWeeks, addMonths, subMonths, addQuarters, subQuarters, addYears, subYears } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingUp, Target, Trophy, Shield, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/shared/language-context";

import {
    subscribeToGoals, deleteGoal, deleteKeyResult,
    type Goal, type KeyResult, OrganizationMember,
    getOrganizationMembers, getUserOrganization, subscribeToGroups, Group
} from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/auth";

// Imported Components
import { GoalList } from "@/components/dashboard/goals/goal-list";
import { GoalDetailsDialog } from "@/components/dashboard/goals/goal-details-dialog";
import { KeyResultDialog } from "@/components/dashboard/goals/key-result-dialog";
import { CreateGoalDialog } from "@/components/dashboard/goals/create-goal-dialog";

type FilterType = 'all' | 'week' | 'month' | 'quarter' | 'year';

export default function GoalsPage() {
    const { t } = useLanguage();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer' | 'restricted' | null>(null);

    // Dialog States
    const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
    const [isKRModalOpen, setIsKRModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Selection & Edit States
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Key Result Edit State
    const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
    const [editingKR, setEditingKR] = useState<KeyResult | null>(null);

    // Context Data
    const [orgId, setOrgId] = useState<string | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);

    // Filtering State
    const searchParams = useSearchParams();
    const viewParam = searchParams.get('view');
    const validFilters: FilterType[] = ['all', 'week', 'month', 'quarter', 'year'];
    const initialFilter = validFilters.includes(viewParam as FilterType) ? (viewParam as FilterType) : 'all';
    const [filterType, setFilterType] = useState<FilterType>(initialFilter);
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- Data Fetching ---
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

    // Sync selectedGoal with real-time updates
    useEffect(() => {
        if (selectedGoal && goals.length > 0) {
            const updatedGoal = goals.find(g => g.id === selectedGoal.id);
            if (updatedGoal && JSON.stringify(updatedGoal) !== JSON.stringify(selectedGoal)) {
                setSelectedGoal(updatedGoal);
            }
        }
    }, [goals, selectedGoal]);

    // --- Actions ---

    const openGoalDetails = (goal: Goal, edit: boolean = false) => {
        setSelectedGoal(goal);
        setIsEditMode(edit);
        setIsDetailsOpen(true);
    };

    const handleDeleteGoal = async (goalId: string) => {
        try {
            await deleteGoal(goalId);
            toast.success("Objective deleted");
            if (selectedGoal?.id === goalId) setIsDetailsOpen(false);
        } catch (error) {
            toast.error("Failed to delete objective");
        }
    }

    // Key Result Actions (passed to sub-components)
    const openAddKR = (goalId: string) => {
        setActiveGoalId(goalId);
        setEditingKR(null);
        setIsKRModalOpen(true);
    };

    const openEditKR = (goalId: string, kr: KeyResult) => {
        setActiveGoalId(goalId);
        setEditingKR(kr);
        setIsKRModalOpen(true);
    };

    const handleDeleteKR = async (goalId: string, krId: string) => {
        try {
            await deleteKeyResult(goalId, krId);
            toast.success("Key Result deleted");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // --- Filtering Logic ---
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

    const filteredGoals = goals.filter(goal => {
        if (!currentUser) return false;

        // Permissions
        let allow = false;
        if (goal.userId === currentUser.uid) allow = true;
        if (goal.assigneeIds?.includes(currentUser.uid)) allow = true;

        const userGroupIds = groups.filter(g => g.memberIds.includes(currentUser.uid)).map(g => g.id);
        if (goal.groupIds?.some(gid => userGroupIds.includes(gid))) allow = true;

        const hasAssignments = (goal.assigneeIds && goal.assigneeIds.length > 0) || (goal.groupIds && goal.groupIds.length > 0);
        if (!hasAssignments) allow = true;

        if (!allow) return false;

        // Time Filtering
        if (filterType === 'all') return true;
        if (!goal.targetDate) return false;

        const target = new Date(goal.targetDate);
        let start, end;

        if (filterType === 'week') {
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
        } else if (filterType === 'month') {
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

    // Stats
    const totalGoals = filteredGoals.length;
    const completedGoals = filteredGoals.filter(g => g.progress >= 100).length;
    const activeGoals = totalGoals - completedGoals;
    const overallProgress = totalGoals > 0 ? Math.round(filteredGoals.reduce((acc, g) => acc + g.progress, 0) / totalGoals) : 0;

    // View for restricted users
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
        <div className="min-h-screen bg-slate-50/50 dark:bg-transparent">
            <div className="space-y-8 max-w-7xl mx-auto p-6 md:p-8 pb-32">

                {/* 1. Stats Overview */}
                <div className="grid grid-cols-3 gap-2 md:gap-6">
                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center text-center h-full">
                            <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-2 shrink-0">
                                <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-1">{t("total_progress")}</div>
                                <div className="text-lg md:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                                    {overallProgress}%
                                </div>
                                <div className="text-[10px] font-medium text-emerald-600 md:hidden">↑ 12%</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center text-center h-full">
                            <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-2 shrink-0">
                                <Target className="h-4 w-4 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-1">{t("active_goals")}</div>
                                <div className="text-lg md:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                                    {activeGoals}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center text-center h-full">
                            <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-2 shrink-0">
                                <Trophy className="h-4 w-4 md:h-6 md:w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-1">{t("completed_goals")}</div>
                                <div className="text-lg md:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                                    {completedGoals}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Actions & Filters */}
                <div className="flex flex-col-reverse md:flex-row justify-between items-stretch md:items-center gap-4">
                    {/* Time Filters */}
                    <div className="flex items-center gap-2 md:gap-4 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)} className="w-auto shrink-0">
                            <TabsList className="bg-transparent h-9 p-0 gap-1">
                                <TabsTrigger value="all" className="rounded-lg h-9 px-3 text-xs md:text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">All</TabsTrigger>
                                <TabsTrigger value="week" className="rounded-lg h-9 px-3 text-xs md:text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">Week</TabsTrigger>
                                <TabsTrigger value="month" className="rounded-lg h-9 px-3 text-xs md:text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">Month</TabsTrigger>
                                <TabsTrigger value="quarter" className="rounded-lg h-9 px-3 text-xs md:text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">Quarter</TabsTrigger>
                                <TabsTrigger value="year" className="rounded-lg h-9 px-3 text-xs md:text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-foreground data-[state=active]:shadow-none">Year</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {filterType !== 'all' && (
                            <div className="flex items-center gap-1 md:gap-2 pl-2 md:pl-4 border-l border-slate-200 dark:border-slate-800 ml-auto md:ml-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigateTime('prev')}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs md:text-sm font-medium w-24 md:w-36 text-center tabular-nums truncate">{getPeriodLabel()}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigateTime('next')}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Create Goal Button */}
                    {canEdit && (
                        <CreateGoalDialog
                            open={isAddGoalOpen}
                            onOpenChange={setIsAddGoalOpen}
                            orgId={orgId}
                            members={members}
                            trigger={
                                <Button size="lg" className="shadow-lg hover:shadow-primary/20 transition-all w-full md:w-auto">
                                    <Plus className="h-5 w-5 mr-2" /> {t("create_objective")}
                                </Button>
                            }
                        />
                    )}
                </div>

                {/* 3. Goals Grid */}
                <GoalList
                    goals={filteredGoals}
                    loading={loading}
                    canEdit={canEdit}
                    members={members}
                    groups={groups}
                    onOpenAddGoal={() => setIsAddGoalOpen(true)}
                    onOpenDetails={openGoalDetails}
                    onDeleteGoal={handleDeleteGoal}
                    onAddKR={openAddKR}
                    onEditKR={openEditKR}
                    onDeleteKR={handleDeleteKR}
                />

                {/* 4. Shared Dialogs */}
                <KeyResultDialog
                    open={isKRModalOpen}
                    onOpenChange={setIsKRModalOpen}
                    goalId={activeGoalId}
                    editingKR={editingKR}
                />

                <GoalDetailsDialog
                    open={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                    goal={selectedGoal}
                    isEditMode={isEditMode}
                    orgId={orgId}
                    members={members}
                    canEdit={canEdit}
                    onAddKR={openAddKR}
                    onEditKR={openEditKR}
                    onDeleteKR={handleDeleteKR}
                />
            </div>
        </div>
    );
}
