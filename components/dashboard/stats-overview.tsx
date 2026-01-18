"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ListTodo, Target } from "lucide-react";
import { subscribeToTasks, subscribeToGoals, type Task, type Goal } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";

export function StatsOverview() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { auth } = require("@/lib/firebase/auth");
        const { getOrganizationMembers, getUserOrganization } = require("@/lib/firebase/firestore");

        let unsubTasks: () => void = () => { };
        let unsubGoals: () => void = () => { };

        const init = async () => {
            const user = auth.currentUser;
            if (!user) return;

            // Fetch user role info
            let role = 'member';
            const org = await getUserOrganization(user.uid);
            if (org) {
                if (org.ownerId === user.uid) role = 'owner';
                else {
                    const members = await getOrganizationMembers(org.id);
                    const me = members.find((m: any) => m.id === user.uid);
                    if (me) role = me.role;
                }
            }

            unsubTasks = subscribeToTasks((data) => {
                // Filter Logic: Matches TasksView (Strict: Creator or Assigned)
                const filtered = data.filter(task => {
                    if (role === 'owner') return true;
                    if (task.userId === user.uid) return true;
                    return (task.assigneeIds && task.assigneeIds.includes(user.uid)) || task.assigneeId === user.uid;
                });
                setTasks(filtered);
            });

            unsubGoals = subscribeToGoals((data) => {
                // Filter Logic: Matches GoalOverview (Public Unassigned)
                const filtered = data.filter(g => {
                    if (role === 'owner') return true;
                    if (g.userId === user.uid) return true;

                    const isAssigned = (g.assigneeIds && g.assigneeIds.includes(user.uid));
                    const isUnassigned = (!g.assigneeIds || g.assigneeIds.length === 0) && (!g.groupIds || g.groupIds.length === 0);
                    return isAssigned || isUnassigned;
                });
                setGoals(filtered);
                setLoading(false);
            });
        };

        init();

        return () => {
            unsubTasks();
            unsubGoals();
        };
    }, []);

    const activeTasksCount = tasks.filter(t => !t.completed).length;
    const highPriorityCount = tasks.filter(t => !t.completed && t.priority === 'high').length;

    const completedTasksCount = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

    const activeGoalsCount = goals.filter(g => g.progress < 100).length;
    const completedGoalsCount = goals.filter(g => g.progress === 100).length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 items-center gap-4 sm:gap-6 px-4 py-6 w-full bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            {/* Active Tasks */}
            <div className="col-span-1 flex items-center gap-3 px-2">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <ListTodo className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <div className="text-2xl font-black leading-none">{activeTasksCount}</div>
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Active Tasks</div>
                </div>
            </div>

            {/* Active Goals */}
            <div className="col-span-1 flex items-center gap-3 px-2 sm:border-l sm:border-slate-100 dark:sm:border-slate-800 border-l border-slate-100 dark:border-slate-800 sm:border-0 border-l-0">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-black leading-none">{activeGoalsCount}</div>
                        <div className="text-[10px] text-muted-foreground/70 font-bold uppercase">
                            / {goals.length}
                        </div>
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Active Goals</div>
                </div>
            </div>

            {/* Completion Rate - Full width on mobile if needed, or just next in grid */}
            {/* With grid-cols-2, this will be on the second row, col-span-1? Or maybe spanning 2 for better balance */}
            <div className="col-span-2 sm:col-span-1 flex items-center gap-3 px-2 sm:border-l sm:border-slate-100 dark:sm:border-slate-800 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-2xl font-black leading-none text-emerald-600">
                            {totalTasks > 0 ? `${completionRate}%` : "0%"}
                        </div>
                        {totalTasks > 0 && (
                            <div className="text-[10px] text-muted-foreground/70 font-bold uppercase">
                                ({completedTasksCount} done)
                            </div>
                        )}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Done Today</div>
                </div>
            </div>
        </div>
    );
}
