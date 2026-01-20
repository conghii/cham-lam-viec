"use client";

import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/shared/language-context";
import { Goal, KeyResult } from "@/lib/firebase/firestore";
import { GoalCard } from "./goal-card";
import { OrganizationMember, Group } from "@/lib/firebase/firestore";

interface GoalListProps {
    goals: Goal[];
    loading: boolean;
    canEdit: boolean;
    members: OrganizationMember[];
    groups: Group[];
    onOpenAddGoal: () => void;
    onOpenDetails: (goal: Goal, isEdit: boolean) => void;
    onDeleteGoal: (goalId: string) => void;
    onAddKR: (goalId: string) => void;
    onEditKR: (goalId: string, kr: KeyResult) => void;
    onDeleteKR: (goalId: string, krId: string) => void;
}

export function GoalList({
    goals,
    loading,
    canEdit,
    members,
    groups,
    onOpenAddGoal,
    onOpenDetails,
    onDeleteGoal,
    onAddKR,
    onEditKR,
    onDeleteKR
}: GoalListProps) {
    const { t } = useLanguage();

    return (
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
                <div className="col-span-full flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : goals.length === 0 ? (
                <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/50">
                    <Target className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t("no_goals_visible")}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">{t("create_first_goal")}</p>
                    <Button onClick={onOpenAddGoal} variant="outline">{t("create_goal_action")}</Button>
                </div>
            ) : (
                goals.map((goal) => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        members={members}
                        groups={groups}
                        canEdit={canEdit}
                        onOpenDetails={onOpenDetails}
                        onDelete={onDeleteGoal}
                        onAddKR={onAddKR}
                        onEditKR={onEditKR}
                        onDeleteKR={onDeleteKR}
                    />
                ))
            )}
        </div>
    );
}
