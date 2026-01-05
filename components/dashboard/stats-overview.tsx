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
        <div className="flex items-center justify-center gap-24 px-1 py-2 w-full">
            {/* Active Tasks */}
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <ListTodo className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-xl font-bold leading-none">{activeTasksCount}</div>
                        {highPriorityCount > 0 && (
                            <div className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">
                                {highPriorityCount} High
                            </div>
                        )}
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">Active Tasks</div>
                </div>
            </div>

            <div className="h-8 w-px bg-border/60" />

            {/* Active Goals */}
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-xl font-bold leading-none">{activeGoalsCount}</div>
                        <div className="text-[10px] text-muted-foreground/70 font-medium">
                            / {completedGoalsCount} Done
                        </div>
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">Active Goals</div>
                </div>
            </div>

            <div className="h-8 w-px bg-border/60" />

            {/* Completion Rate */}
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <div className="text-xl font-bold leading-none">{completionRate}%</div>
                        <div className="text-[10px] text-muted-foreground/70 font-medium whitespace-nowrap">
                            ({completedTasksCount} finished)
                        </div>
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">Completion Rate</div>
                </div>
            </div>
        </div>
    );
}
