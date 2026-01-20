"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useLanguage } from "@/components/shared/language-context";
import { addGoal, OrganizationMember } from "@/lib/firebase/firestore";
import { toast } from "sonner";
import { UserGroupSelect } from "@/components/dashboard/user-group-select";

interface CreateGoalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string | null;
    members: OrganizationMember[];
    trigger?: React.ReactNode;
}

export function CreateGoalDialog({ open, onOpenChange, orgId, members, trigger }: CreateGoalDialogProps) {
    const { t } = useLanguage();
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [desc, setDesc] = useState("");
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [groupIds, setGroupIds] = useState<string[]>([]);

    const handleAddGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        try {
            await addGoal(title, date, desc, assigneeIds, groupIds);
            setTitle("");
            setDate("");
            setDesc("");
            setAssigneeIds([]);
            setGroupIds([]);
            onOpenChange(false);
            toast.success("Objective created successfully!");
        } catch (error: any) {
            console.error("Failed to add goal", error);
            toast.error(`Failed to add goal: ${error.message}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("create_objective")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddGoal} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t("objective_title")}</label>
                        <Input
                            placeholder={t("objective_placeholder")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t("overview")}</label>
                        <Input
                            placeholder={t("description_placeholder")}
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t("target_date")}</label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    {orgId && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("assignees_teams")}</label>
                            <UserGroupSelect
                                orgId={orgId}
                                assigneeIds={assigneeIds}
                                groupIds={groupIds}
                                onAssigneeChange={setAssigneeIds}
                                onGroupChange={setGroupIds}
                                members={members}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="submit" className="w-full sm:w-auto">{t("create_goal_button")}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
