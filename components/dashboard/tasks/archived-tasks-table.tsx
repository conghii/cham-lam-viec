"use client";

import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Calendar, CheckCircle2, Filter, Search, Tag as TagIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Task, Tag, Goal } from "@/lib/firebase/firestore";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskDetailDialog } from "./task-detail-dialog";
import { cn } from "@/lib/utils";

interface ArchivedTasksTableProps {
    data: Task[];
    loading?: boolean;
    tags?: Tag[];
    members?: any[];
    goals?: Goal[];
}

export function ArchivedTasksTable({ data, loading, tags = [], members = [], goals = [] }: ArchivedTasksTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [globalFilter, setGlobalFilter] = React.useState("");

    // Task Details State
    const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

    // Dynamic columns to access `tags`
    const columns = React.useMemo<ColumnDef<Task>[]>(() => [
        {
            accessorKey: "title",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        Title
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="flex flex-col gap-0.5">
                    <span className={cn("font-medium line-clamp-1 max-w-[400px]")}>
                        {row.original.title}
                    </span>
                    {/* Tiny metadata row for quick scan */}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {row.original.subtasks && row.original.subtasks.length > 0 && (
                            <span className="flex items-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3" /> {row.original.subtasks.filter(s => s.completed).length}/{row.original.subtasks.length}
                            </span>
                        )}
                        {row.original.assigneeIds && row.original.assigneeIds.length > 0 && (
                            <span className="flex -space-x-1.5 overflow-hidden">
                                {row.original.assigneeIds.map(uid => {
                                    const m = members.find(mem => mem.uid === uid);
                                    if (!m) return null;
                                    return <Avatar key={uid} className="h-4 w-4 border border-background"><AvatarImage src={m.photoURL} /></Avatar>
                                })}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "completedAt",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const date = row.getValue("completedAt") as any;
                const updated = row.original.updatedAt as any;
                const created = row.original.createdAt as any;

                let displayDate = date;
                let label = "Completed date";
                let isFallback = false;

                if (!displayDate) {
                    if (updated) {
                        displayDate = updated;
                        label = "Last updated date";
                        isFallback = true;
                    } else if (created) {
                        displayDate = created;
                        label = "Created date";
                        isFallback = true;
                    }
                }

                if (!displayDate) return <div className="text-muted-foreground/30 text-xs">-</div>;

                const dateObj = displayDate.toDate ? displayDate.toDate() : new Date(displayDate);
                return (
                    <div className="text-muted-foreground text-xs whitespace-nowrap flex items-center gap-1.5" title={`${label} ${isFallback ? "(fallback)" : ""}`}>
                        {format(dateObj, "MMM d, yyyy")}
                        {isFallback && <span className="text-[10px] text-muted-foreground/50">*</span>}
                    </div>
                );
            }
        },
        {
            accessorKey: "priority",
            header: "Priority",
            cell: ({ row }) => {
                const priority = (row.getValue("priority") as string) || "low";
                const colors = {
                    high: "text-rose-600 bg-rose-50 border-rose-200",
                    medium: "text-amber-600 bg-amber-50 border-amber-200",
                    low: "text-slate-500 bg-slate-100 border-slate-200"
                };
                return <Badge variant="outline" className={cn("capitalize font-normal text-[10px] h-5", colors[priority as keyof typeof colors])}>{priority}</Badge>;
            }
        },
        {
            accessorKey: "tag",
            header: "Tag",
            cell: ({ row }) => {
                const tagId = row.getValue("tag") as string;
                if (!tagId) return null;
                const t = tags.find(tag => tag.id === tagId || tag.label === tagId); // Match ID or Label for query
                const label = t ? t.label : (tagId === "general" ? "General" : tagId); // Default to capitalize or ID
                // If we don't find it, use a neutral color
                const color = t ? t.color : "bg-slate-100 text-slate-500 border-slate-200";

                return (
                    <Badge variant="outline" className={cn("font-normal text-[10px] h-5", color)}>
                        <TagIcon className="h-2.5 w-2.5 mr-1 opacity-50" />
                        {label}
                    </Badge>
                );
            }
        }
    ], [tags, members]);

    const table = useReactTable({
        data,
        columns,

        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
    });

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading archived tasks...</div>;
    }

    return (
        <div className="w-full flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter tasks..."
                            value={globalFilter ?? ""}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-0 focus-visible:ring-1 focus-visible:ring-primary/20 pl-9 h-9 w-[250px] lg:w-[350px]"
                        />
                    </div>
                    {/* Additional Filters can go here (Priority select, Date range) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2 border-dashed">
                                <Filter className="h-3.5 w-3.5" />
                                Priority
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => table.getColumn("priority")?.setFilterValue(undefined)}>
                                All Priorities
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => table.getColumn("priority")?.setFilterValue("high")}>
                                High
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => table.getColumn("priority")?.setFilterValue("medium")}>
                                Medium
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => table.getColumn("priority")?.setFilterValue("low")}>
                                Low
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="ml-auto h-9">
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="whitespace-nowrap h-10 py-2">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-100 dark:border-slate-800/50 transition-colors"
                                    onClick={() => setSelectedTask(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2.5">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 gap-2">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredRowModel().rows.length} archived tasks
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Task Detail Dialog */}
            {selectedTask && (
                <TaskDetailDialog
                    task={selectedTask}
                    open={!!selectedTask}
                    onOpenChange={(open) => !open && setSelectedTask(null)}
                    tags={tags}
                    members={members}
                    goals={goals}
                />
            )}
        </div>
    );
}
