"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/shared/language-context";
import { KeyResult, addKeyResult, updateKeyResult } from "@/lib/firebase/firestore";
import { toast } from "sonner";

interface KeyResultDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    goalId: string | null;
    editingKR: KeyResult | null;
    onSave?: () => void;
}

export function KeyResultDialog({ open, onOpenChange, goalId, editingKR, onSave }: KeyResultDialogProps) {
    const { t } = useLanguage();
    const [title, setTitle] = useState("");
    const [target, setTarget] = useState("");
    const [unit, setUnit] = useState("");

    useEffect(() => {
        if (open) {
            if (editingKR) {
                setTitle(editingKR.title);
                setTarget(String(editingKR.target));
                setUnit(editingKR.unit);
            } else {
                setTitle("");
                setTarget("");
                setUnit("");
            }
        }
    }, [open, editingKR]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!goalId) {
            toast.error("Internal Error: Goal ID missing.");
            return;
        }
        if (!title.trim()) {
            toast.error("Please enter a Key Result title.");
            return;
        }
        if (!target) {
            toast.error("Please enter a Target Value.");
            return;
        }

        try {
            if (editingKR) {
                await updateKeyResult(goalId, {
                    ...editingKR,
                    title,
                    target: Number(target),
                    unit: unit || "units"
                });
            } else {
                await addKeyResult(goalId, {
                    title,
                    target: Number(target),
                    current: 0,
                    unit: unit || "units"
                });
            }
            onOpenChange(false);
            onSave?.();
            toast.success("Key Result saved");
        } catch (error: any) {
            toast.error(`Failed to save Key Result: ${error.message}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingKR ? t("edit_key_result") : t("add_key_result")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t("result_title")}</label>
                        <Input
                            placeholder={t("result_placeholder")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">{t("target_value")}</label>
                            <Input
                                type="number"
                                placeholder="5"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">{t("unit")}</label>
                            <Input
                                placeholder="books"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">{editingKR ? t("save_changes_kr") : t("save_result")}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
