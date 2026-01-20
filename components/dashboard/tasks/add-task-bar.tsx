"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TagSelector } from "@/components/dashboard/tag-selector";
import { presetColors } from "@/components/dashboard/tasks/tag-manager-dialog";
import { Tag, TaskColumn } from "@/lib/firebase/firestore";
import { useLanguage } from "@/components/shared/language-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddTaskBarProps {
    newTaskTitle: string;
    setNewTaskTitle: (value: string) => void;
    newTaskDate: Date | undefined;
    setNewTaskDate: (date: Date | undefined) => void;
    newTaskPriority: "low" | "medium" | "high";
    setNewTaskPriority: (priority: "low" | "medium" | "high") => void;
    newTaskTag: string;
    setNewTaskTag: (tag: string) => void;
    newTaskStatus: string;
    handleAddTask: (e: React.FormEvent) => void;
    availableTags: Tag[];
    role: string;
    orgId?: string;
    columns: TaskColumn[];
    isTagManagerOpen: boolean;
    setIsTagManagerOpen: (open: boolean) => void;
    editingTag: Tag | null;
    setEditingTag: (tag: Tag | null) => void;
    newTagName: string;
    setNewTagName: (name: string) => void;
    newTagColor: string;
    setNewTagColor: (color: string) => void;
    onDeleteTag: (tagId: string) => void;
}

export function AddTaskBar({
    newTaskTitle,
    setNewTaskTitle,
    newTaskDate,
    setNewTaskDate,
    newTaskPriority,
    setNewTaskPriority,
    newTaskTag,
    setNewTaskTag,
    newTaskStatus,
    handleAddTask,
    availableTags,
    role,
    orgId,
    columns,
    isTagManagerOpen,
    setIsTagManagerOpen,
    editingTag,
    setEditingTag,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    onDeleteTag,
}: AddTaskBarProps) {
    const { t } = useLanguage();

    return (
        <div className="bg-white dark:bg-slate-900 border border-border/40 dark:border-slate-800 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/10 transition-all rounded-2xl p-2 md:p-3 relative z-10">
            <form
                onSubmit={handleAddTask}
                className="flex flex-col gap-3"
            >
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <div className="flex-1 w-full flex items-center gap-2">
                        <Input
                            id="main-task-input"
                            placeholder={
                                newTaskStatus === "backlog"
                                    ? t("add_task_placeholder")
                                    : columns.find(c => c.id === newTaskStatus)?.title
                                        ? `${t("add_task")} to ${columns.find(c => c.id === newTaskStatus)?.title}...`
                                        : t("add_task_placeholder")
                            }
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="h-10 md:h-12 border-transparent bg-transparent text-base md:text-lg focus-visible:ring-0 px-2 md:px-4 placeholder:text-muted-foreground/60 dark:text-slate-100 shadow-none flex-1"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="h-10 w-10 bg-primary text-primary-foreground shrink-0 rounded-lg shadow-md hover:shadow-lg transition-all md:hidden"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto px-2 justify-between md:justify-end">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    size="sm"
                                    className={cn(
                                        "h-9 w-[130px] justify-start text-left font-normal border-blue-200/50 bg-blue-50/50 hover:bg-blue-100/50 hover:border-blue-300/50 transition-colors dark:bg-blue-900/20 dark:border-blue-800/50 dark:hover:bg-blue-900/30",
                                        !newTaskDate && "text-muted-foreground",
                                        newTaskDate && "text-blue-700 border-blue-300/70 bg-blue-100/70 dark:text-blue-400 dark:bg-blue-900/40"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {newTaskDate ? (
                                        format(newTaskDate, "MMM d")
                                    ) : (
                                        <span>{t("no_date")}</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={newTaskDate}
                                    onSelect={setNewTaskDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <Select
                            value={newTaskPriority}
                            onValueChange={(v: any) => setNewTaskPriority(v)}
                        >
                            <SelectTrigger className={cn(
                                "h-9 w-[100px] border transition-colors",
                                newTaskPriority === "low" && "border-slate-200/50 bg-slate-50/50 hover:bg-slate-100/50 text-slate-700",
                                newTaskPriority === "medium" && "border-amber-200/50 bg-amber-50/50 hover:bg-amber-100/50 text-amber-700",
                                newTaskPriority === "high" && "border-rose-200/50 bg-rose-50/50 hover:bg-rose-100/50 text-rose-700"
                            )}>
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                            <TagSelector
                                value={newTaskTag}
                                onChange={setNewTaskTag}
                                tags={availableTags}
                                role={role}
                                onEditTag={(tag) => {
                                    setEditingTag(tag);
                                    setNewTagName(tag.label);
                                    setNewTagColor(tag.color || presetColors[0].value);
                                    setIsTagManagerOpen(true);
                                }}
                                onDeleteTag={onDeleteTag}
                                onCreateTag={() => {
                                    setEditingTag(null);
                                    setNewTagName("");
                                    setNewTagColor(presetColors[0].value);
                                    setIsTagManagerOpen(true);
                                }}
                            />
                        </div>

                        <Button
                            type="submit"
                            size="icon"
                            className="h-9 w-9 bg-primary text-primary-foreground shrink-0 rounded-lg shadow-md hover:shadow-lg transition-all ml-1 hidden md:flex"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
