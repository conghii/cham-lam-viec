"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { updateKeyResultProgress, KeyResult } from "@/lib/firebase/firestore";

interface KeyResultItemProps {
    goalId: string;
    kr: KeyResult;
    onEdit?: (kr: KeyResult) => void;
    onDelete?: (krId: string) => void;
}

export function KeyResultItem({ goalId, kr, onEdit, onDelete }: KeyResultItemProps) {
    const [localCurrent, setLocalCurrent] = useState(kr.current);

    // Sync local state if prop changes (e.g. from DB update)
    useEffect(() => {
        setLocalCurrent(kr.current || 0);
    }, [kr.current]);

    // Ensure max is at least 1 to prevent division by zero or stuck slider
    const maxVal = Math.max(1, kr.target || 100);

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
