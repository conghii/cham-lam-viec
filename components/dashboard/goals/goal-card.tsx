"use client";

import { format } from "date-fns";
import {
    Pencil, Trash2, MoreVertical, Plus, Target,
    Calendar as CalendarIcon, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/shared/language-context";
import { Goal, KeyResult } from "@/lib/firebase/firestore";
import { KeyResultItem } from "./key-result-item";
import { AssigneeDisplay } from "@/components/dashboard/assignee-display";
import { OrganizationMember, Group } from "@/lib/firebase/firestore";

interface GoalCardProps {
    goal: Goal;
    members: OrganizationMember[];
    groups: Group[];
    canEdit: boolean;
    onOpenDetails: (goal: Goal, isEdit: boolean) => void;
    onDelete: (goalId: string) => void;
    onAddKR: (goalId: string) => void;
    onEditKR: (goalId: string, kr: KeyResult) => void;
    onDeleteKR: (goalId: string, krId: string) => void;
}

export function GoalCard({
    goal,
    members,
    groups,
    canEdit,
    onOpenDetails,
    onDelete,
    onAddKR,
    onEditKR,
    onDeleteKR
}: GoalCardProps) {
    const { t } = useLanguage();

    return (
        <Card
            onClick={() => onOpenDetails(goal, false)}
            className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-300 cursor-pointer flex flex-col h-full"
        >
            <CardHeader className="pb-3 md:pb-3 p-4 md:p-6 relative z-10 flex-shrink-0">
                <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1 flex-1 mr-2 min-w-0">
                        <CardTitle className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2" title={goal.title}>
                            {goal.title}
                        </CardTitle>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 shrink-0">
                                <CalendarIcon className="h-3.5 w-3.5 opacity-70" />
                                {goal.targetDate ? format(new Date(goal.targetDate), "MMM d, yyyy") : "No deadline"}
                            </span>
                        </div>
                    </div>
                    {canEdit && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-slate-900 -mr-2 -mt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetails(goal, true); }}>
                                    <Pencil className="h-4 w-4 mr-2" /> {t("edit_objective")}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }}>
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
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] uppercase font-semibold text-slate-400 hover:text-blue-600 hover:bg-blue-50 -mr-2 px-2" onClick={(e) => { e.stopPropagation(); onAddKR(goal.id); }}>
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
                                    onEdit={canEdit ? (kr) => onEditKR(goal.id, kr) : undefined}
                                    onDelete={canEdit ? (krId) => onDeleteKR(goal.id, krId) : undefined}
                                />
                            ))}
                        </div>
                    ) : (
                        canEdit ? (
                            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all group/empty h-full flex flex-col items-center justify-center min-h-[100px]" onClick={(e) => { e.stopPropagation(); onAddKR(goal.id); }}>
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
                        <AssigneeDisplay
                            assigneeIds={goal.assigneeIds}
                            groupIds={goal.groupIds}
                            members={members}
                            groups={groups}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
