"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    CheckCircle2, Target, Calendar as CalendarIcon,
    Plus, Link, CheckSquare, Square, MessageSquare, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/shared/language-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Goal, KeyResult, Comment, Task, OrganizationMember, Group,
    updateGoal, subscribeToGoalComments, subscribeToGoalTasks, addGoalComment
} from "@/lib/firebase/firestore";
import { UserGroupSelect } from "@/components/dashboard/user-group-select";
import { useGamification } from "@/components/providers/gamification-provider";
import { KeyResultItem } from "./key-result-item";
import { GoalCommentItem } from "./goal-comment-item";

interface GoalDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    goal: Goal | null;
    isEditMode: boolean;
    orgId: string | null;
    members: OrganizationMember[];
    canEdit: boolean;
    onAddKR: (goalId: string) => void;
    onEditKR: (goalId: string, kr: KeyResult) => void;
    onDeleteKR: (goalId: string, krId: string) => void;
}

export function GoalDetailsDialog({
    open,
    onOpenChange,
    goal,
    isEditMode,
    orgId,
    members,
    canEdit,
    onAddKR,
    onEditKR,
    onDeleteKR
}: GoalDetailsDialogProps) {
    const { t } = useLanguage();

    // Local State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
    const [editGroupIds, setEditGroupIds] = useState<string[]>([]);

    // Subscribed Data
    const [comments, setComments] = useState<Comment[]>([]);
    const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
    const [newComment, setNewComment] = useState("");

    const { addXP } = useGamification();
    const [prevProgress, setPrevProgress] = useState(goal?.progress || 0);

    useEffect(() => {
        if (goal) {
            // Check for completion
            if ((goal.progress || 0) >= 100 && prevProgress < 100) {
                addXP(500, "Objective Completed! 🎯");
            }
            setPrevProgress(goal.progress || 0);

            // Init Form State
            setTitle(goal.title);
            setDescription(goal.description || "");
            setDate(goal.targetDate ? new Date(goal.targetDate) : undefined);
            setEditAssigneeIds(goal.assigneeIds || []);
            setEditGroupIds(goal.groupIds || []);

            // Subscribe to sub-collections
            const unsubComments = subscribeToGoalComments(goal.id, setComments);
            const unsubTasks = subscribeToGoalTasks(goal.id, setLinkedTasks);

            return () => {
                unsubComments();
                unsubTasks();
            };
        }
    }, [goal, open]); // We rely on goal updates to trigger this

    const handleSaveDetails = async () => {
        if (!goal || !title.trim()) return;
        try {
            await updateGoal(goal.id, {
                title,
                description,
                targetDate: date ? date.toISOString() : undefined,
                assigneeIds: editAssigneeIds,
                groupIds: editGroupIds
            });
            onOpenChange(false);
            toast.success("Objective updated");
        } catch (error: any) {
            toast.error(`Failed to update goal: ${error.message}`);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goal || !newComment.trim()) return;
        await addGoalComment(goal.id, newComment);
        setNewComment("");
    };

    if (!goal) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                                <Badge variant={(goal.progress || 0) >= 100 ? "default" : "secondary"} className="rounded-full px-3 py-0.5 font-medium transition-all">
                                    {(goal.progress || 0) >= 100 ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Target className="h-3.5 w-3.5 mr-1" />}
                                    {goal.progress}% {t("achieved")}
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
                                        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-medium border-dashed" onClick={() => onAddKR(goal.id)}>
                                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Result
                                        </Button>
                                    )}
                                </div>

                                <div className="grid gap-3">
                                    {goal.keyResults && goal.keyResults.length > 0 ? (
                                        goal.keyResults.map((kr) => (
                                            <div key={kr.id} className="bg-card/40 border border-border/40 rounded-xl p-1 transition-all hover:bg-card/80 hover:shadow-sm hover:border-primary/20">
                                                <KeyResultItem
                                                    goalId={goal.id}
                                                    kr={kr}
                                                    onEdit={isEditMode ? (kr) => onEditKR(goal.id, kr) : undefined}
                                                    onDelete={isEditMode ? (krId) => onDeleteKR(goal.id, krId) : undefined}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 border-2 border-dashed border-muted/50 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => isEditMode && onAddKR(goal.id)}>
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
                                            <GoalCommentItem key={comment.id} comment={comment} goalId={goal.id} />
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
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">Close</Button>
                    {isEditMode && (
                        <Button onClick={handleSaveDetails} className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">Save Changes</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
