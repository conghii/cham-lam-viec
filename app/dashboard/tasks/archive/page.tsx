"use client";

import { useEffect, useState } from "react";
import { Archive, ArrowLeft, Calendar as CalendarIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Task, subscribeToCompletedTasks, Tag, Goal, subscribeToOrganization, subscribeToGoals, getOrganizationMembers, getUserOrganization } from "@/lib/firebase/firestore";
import { ArchivedTasksTable } from "@/components/dashboard/tasks/archived-tasks-table";
import { ArchivedTasksStats } from "@/components/dashboard/tasks/archived-tasks-stats";
import { useAuth } from "@/lib/firebase/auth";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ArchivedTasksPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Context Data
    const [tags, setTags] = useState<Tag[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [members, setMembers] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        let unsubscribeOrg: () => void = () => { };
        let unsubscribeTasks: () => void = () => { };
        let unsubscribeGoals: () => void = () => { };

        const initData = async () => {
            try {
                // 1. Subscribe to Tasks
                unsubscribeTasks = subscribeToCompletedTasks((fetchedTasks) => {
                    setTasks(fetchedTasks);
                    setLoading(false);
                });

                // 2. Subscribe to Goals
                unsubscribeGoals = subscribeToGoals((fetchedGoals) => {
                    setGoals(fetchedGoals);
                });

                // 3. Subscribe to Org (Tags & Members) using getUserOrganization
                try {
                    const org = await getUserOrganization(user.uid);
                    if (org) {
                        unsubscribeOrg = subscribeToOrganization(org.id, (fetchedOrg) => {
                            setTags(fetchedOrg.tags || []);
                        });
                        // Fetch members once
                        getOrganizationMembers(org.id).then(setMembers);
                    }
                } catch (e) {
                    console.error("Failed to load organization data:", e);
                }

            } catch (error) {
                console.error("Error initializing archive page:", error);
                setLoading(false);
            }
        };

        initData();

        return () => {
            if (unsubscribeTasks) unsubscribeTasks();
            if (unsubscribeGoals) unsubscribeGoals();
            if (unsubscribeOrg) unsubscribeOrg();
        };
    }, [user]);

    const filteredTasks = tasks.filter(t => {
        if (!dateRange || !dateRange.from) return true;
        if (!t.completedAt) return false;

        const completedDate = t.completedAt && typeof t.completedAt.toDate === 'function'
            ? t.completedAt.toDate()
            : new Date(t.completedAt as any);
        const from = dateRange.from;
        const to = dateRange.to || dateRange.from;

        // Simple day comparison (inclusive)
        return completedDate >= from && completedDate <= new Date(to.getTime() + 86400000);
    });

    const handleExport = () => {
        const headers = ["Title", "Status", "Priority", "Completed At", "Tag"];
        const csvContent = [
            headers.join(","),
            ...filteredTasks.map(t => {
                const date = t.completedAt ? (typeof t.completedAt.toDate === 'function' ? t.completedAt.toDate() : new Date(t.completedAt as any)) : null;
                // Find tag label
                const tagName = tags.find(tag => tag.id === t.tag || tag.label === t.tag)?.label || t.tag || "";

                return [
                    `"${t.title.replace(/"/g, '""')}"`,
                    t.completed ? "Completed" : "Active",
                    t.priority || "Low",
                    date ? format(date, "yyyy-MM-dd HH:mm:ss") : "",
                    tagName
                ].join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `archived_tasks_${format(new Date(), "yyyyMMdd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-auto md:h-full flex flex-col space-y-6 pt-6 md:p-8 bg-slate-50/30 dark:bg-slate-950/30">
            <div className="flex flex-col gap-6 px-6 md:px-0">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="h-8 w-8 mt-1 shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <Archive className="h-6 w-6 text-muted-foreground hidden md:block" />
                                Archived Tasks
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base">
                                View and manage your completed tasks history.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    size="sm"
                                    className={cn(
                                        "flex-1 md:w-[240px] md:flex-none justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 md:flex-none md:w-auto px-2 md:px-4">
                            <Download className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">Export CSV</span>
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <ArchivedTasksStats tasks={filteredTasks} />
            </div>

            <div className="flex-1 px-6 md:px-0 md:overflow-hidden pb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-auto md:h-full flex flex-col md:overflow-hidden shadow-sm">
                    <ArchivedTasksTable
                        data={filteredTasks}
                        loading={loading}
                        tags={tags}
                        members={members}
                        goals={goals}
                    />
                </div>
            </div>
        </div>
    );
}
