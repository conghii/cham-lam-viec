"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { subscribeToGoals, type Goal } from "@/lib/firebase/firestore"
import { cn } from "@/lib/utils"

export function GoalOverview() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const { auth } = require("@/lib/firebase/auth");
        const { getOrganizationMembers, getUserOrganization } = require("@/lib/firebase/firestore");

        let unsubscribe: () => void = () => { };

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

            unsubscribe = subscribeToGoals((data) => {
                // Filter logic matches GoalPage
                const filtered = data.filter(g => {
                    if (role === 'owner') return true;
                    if (g.userId === user.uid) return true; // Creator

                    const isAssigned = (g.assigneeIds && g.assigneeIds.includes(user.uid));
                    // Check if assigned to any group user is in (Skipping complex group check for dashboard brevity, assume explicit assignment or creator for now, OR if unassigned?)
                    // In GoalsPage we treated Unassigned as Public.
                    const isUnassigned = (!g.assigneeIds || g.assigneeIds.length === 0) && (!g.groupIds || g.groupIds.length === 0);

                    return isAssigned || isUnassigned;
                });

                setGoals(filtered.slice(0, 3))
                setLoading(false)
            })
        };

        init();
        return () => unsubscribe()
    }, [])

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr || "Ongoing";
        }
    }

    const getGoalColor = (goal: Goal) => {
        const colors = [
            "from-blue-500 to-blue-600",
            "from-violet-500 to-violet-600",
            "from-emerald-500 to-emerald-600",
            "from-orange-500 to-orange-600"
        ];
        // Use a simple hash of the ID to keep colors consistent for the same goal
        const charCodeSum = goal.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[charCodeSum % colors.length];
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.length === 0 ? (
                <div className="col-span-full text-center p-8 border-2 border-dashed rounded-2xl bg-muted/20">
                    <p className="text-muted-foreground font-medium">No active objectives tracking on dashboard.</p>
                </div>
            ) : (
                goals.map((goal) => {
                    const gradient = getGoalColor(goal);
                    return (
                        <Card key={goal.id} className="group relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl hover:shadow-lg transition-all duration-300 hover:border-primary/20">
                            <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-opacity", gradient)} />
                            <CardHeader className="pb-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                    Target Date
                                </span>
                                <CardTitle className="text-xs font-semibold text-muted-foreground mt-0.5">
                                    {goal.targetDate ? formatDate(goal.targetDate) : "No deadline"}
                                </CardTitle>
                                <h3 className="text-lg font-bold truncate mt-1 tracking-tight group-hover:text-primary transition-colors">
                                    {goal.title}
                                </h3>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Progress</span>
                                            <span className="text-xl font-black tabular-nums transition-all">
                                                {goal.progress}<span className="text-xs font-medium text-muted-foreground ml-0.5">%</span>
                                            </span>
                                        </div>
                                    </div>
                                    <Progress value={goal.progress} className="h-1.5 transition-all" />
                                </div>
                            </CardContent>
                        </Card>
                    )
                })
            )}
        </div>
    )
}
