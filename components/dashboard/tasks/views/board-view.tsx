"use client";

import { useState, useEffect } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, X, ArrowRight } from "lucide-react";
import { TaskCard } from "@/components/dashboard/tasks/task-card";
import { Task, TaskColumn, Tag, Group, updateTaskColumn, addTaskColumn, deleteTaskColumn } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import { presetColors } from "@/components/dashboard/tasks/tag-manager-dialog";

interface TasksBoardViewProps {
    tasks: Task[];
    columns: TaskColumn[];
    members: any[];
    groups: Group[];
    role: string;
    orgId?: string;
    tags: Tag[];
    onEditTag: (tag: Tag) => void;
    onDeleteTag: (tagId: string) => void;
    onCreateTag: () => void;
    onMove: (taskId: string, status: string) => void;
    setCreateTaskStatus: (status: string) => void;
    setIsCreateTaskOpen: (open: boolean) => void;
    handleCreateDefaultColumns: () => void;
}

export function TasksBoardView({
    tasks,
    columns,
    members,
    groups,
    role,
    orgId,
    tags,
    onEditTag,
    onDeleteTag,
    onCreateTag,
    onMove,
    setCreateTaskStatus,
    setIsCreateTaskOpen,
    handleCreateDefaultColumns,
}: TasksBoardViewProps) {
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState("");

    // Column Resizing State
    const [resizingColId, setResizingColId] = useState<string | null>(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidth, setResizeStartWidth] = useState(0);
    const [resizeContainerWidth, setResizeContainerWidth] = useState(0);

    // Initialize/Sync column widths from Firestore
    useEffect(() => {
        const widths: Record<string, number> = {};
        columns.forEach(col => {
            if (col.width) widths[col.id] = col.width;
        });
        setColumnWidths(prev => ({ ...prev, ...widths }));
    }, [columns]);

    // Handle Resize Events
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingColId) return;

            const diff = e.clientX - resizeStartX;
            let newWidthPx = resizeStartWidth;

            if (resizeStartWidth <= 1) {
                newWidthPx = resizeStartWidth * resizeContainerWidth;
            }

            newWidthPx += diff;
            if (newWidthPx < 250) newWidthPx = 250;

            const newWidthPercent = newWidthPx / resizeContainerWidth;

            setColumnWidths(prev => ({
                ...prev,
                [resizingColId]: newWidthPercent
            }));
        };

        const handleMouseUp = () => {
            if (resizingColId) {
                const finalWidth = columnWidths[resizingColId];
                if (finalWidth) {
                    updateTaskColumn(resizingColId, { width: finalWidth });
                }
                setResizingColId(null);
                setResizeContainerWidth(0);
                document.body.style.cursor = 'default';
            }
        };

        if (resizingColId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [resizingColId, resizeStartX, resizeStartWidth, resizeContainerWidth, columnWidths]);

    const startResize = (e: React.MouseEvent, col: TaskColumn) => {
        e.preventDefault();
        e.stopPropagation();

        const boardContainer = e.currentTarget.closest('.board-container');
        if (!boardContainer) return;

        const containerWidth = boardContainer.getBoundingClientRect().width;

        setResizingColId(col.id);
        setResizeStartX(e.clientX);
        setResizeContainerWidth(containerWidth);
        const currentWidth = columnWidths[col.id] || col.width || 300;
        setResizeStartWidth(currentWidth);
    };

    const handleAddColumn = async () => {
        if (!newColumnTitle.trim()) return;
        await addTaskColumn(newColumnTitle, columns.length);
        setNewColumnTitle("");
        setIsAddingColumn(false);
    };

    const getTasksByColumn = (columnId: string, columnTitle: string) => {
        const tasksInColumn = tasks.filter((t) => {
            if (t.status === columnId) return true;
            if ((!t.status || t.status === "backlog") && columnTitle === "Backlog")
                return true;
            return false;
        });

        return tasksInColumn.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    };

    if (columns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center w-full py-10 border-2 border-dashed rounded-xl">
                <p className="mb-4 text-muted-foreground">
                    No columns configured.
                </p>
                <Button onClick={handleCreateDefaultColumns}>
                    Create Default Columns
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-[500px] overflow-x-auto">
            <Droppable
                droppableId="board"
                direction="horizontal"
                type="COLUMN"
            >
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex gap-3 md:gap-3 pb-6 items-start h-full board-container overflow-x-auto snap-x snap-mandatory px-4 md:px-0 scroll-pl-4 flex-nowrap"
                    >
                        {columns.map((col, index) => (
                            <Draggable
                                key={col.id}
                                draggableId={col.id}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex flex-col gap-2 bg-white dark:bg-slate-900 rounded-3xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 h-full max-h-[calc(100vh-220px)] border-t-[6px] relative snap-start shrink-0 min-w-[300px]"
                                        style={{
                                            ...provided.draggableProps.style,
                                            width: (columnWidths[col.id] || col.width || 0) <= 1
                                                ? `${(columnWidths[col.id] || col.width || 0) * 100}%`
                                                : (columnWidths[col.id] || col.width || 300),
                                            flexShrink: 0,
                                            borderColor: col.title === "Backlog" ? "#9ca3af" :
                                                col.title === "This Week" ? "#3b82f6" :
                                                    col.title === "Today" ? "#f97316" :
                                                        col.title === "Done" ? "#a855f7" : "#10b981"
                                        }}
                                    >
                                        <div
                                            {...provided.dragHandleProps}
                                            className="flex items-center justify-between px-2 cursor-grab active:cursor-grabbing group mb-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-base text-foreground">
                                                    {col.title}
                                                </h3>
                                                <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                                                    {getTasksByColumn(col.id, col.title).length}
                                                </span>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-secondary"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => deleteTaskColumn(col.id)}
                                                    >
                                                        Delete Column
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
                                            onMouseDown={(e) => startResize(e, col)}
                                        />

                                        <Droppable droppableId={col.id} type="TASK">
                                            {(provided, snapshot) => {
                                                const columnTasks = getTasksByColumn(col.id, col.title);
                                                return (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={cn(
                                                            "flex-1 overflow-y-auto min-h-[150px] space-y-3 px-1 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-muted/20 hover:scrollbar-thumb-muted/50 flex flex-col",
                                                            snapshot.isDraggingOver && "bg-secondary/20 rounded-xl ring-2 ring-primary/10",
                                                            columnTasks.length === 0 && "justify-center"
                                                        )}
                                                    >
                                                        {columnTasks.length === 0 && !snapshot.isDraggingOver ? (
                                                            <div className="text-center py-10 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl mx-2">
                                                                <p className="text-sm text-muted-foreground font-medium">No tasks</p>
                                                            </div>
                                                        ) : (
                                                            columnTasks.map((task, index) => (
                                                                <Draggable
                                                                    key={task.id}
                                                                    draggableId={task.id}
                                                                    index={index}
                                                                >
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            style={provided.draggableProps.style}
                                                                        >
                                                                            <TaskCard
                                                                                task={task}
                                                                                columns={columns}
                                                                                onMove={onMove}
                                                                                members={members}
                                                                                groups={groups}
                                                                                role={role}
                                                                                orgId={orgId}
                                                                                tags={tags}
                                                                                onEditTag={onEditTag}
                                                                                onDeleteTag={onDeleteTag}
                                                                                onCreateTag={onCreateTag}
                                                                                compact={true}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))
                                                        )}
                                                        {provided.placeholder}
                                                    </div>
                                                );
                                            }}
                                        </Droppable>

                                        <div className="mt-2 pt-2">
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-center text-muted-foreground hover:text-primary hover:bg-secondary/50 h-9"
                                                onClick={() => {
                                                    setCreateTaskStatus(col.id);
                                                    setIsCreateTaskOpen(true);
                                                }}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Task
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}

                        <div className="min-w-[50px] pt-1">
                            {isAddingColumn ? (
                                <div className="bg-background border rounded-lg p-2 space-y-2 shadow-sm w-[200px]">
                                    <Input
                                        autoFocus
                                        placeholder="Column Title"
                                        value={newColumnTitle}
                                        onChange={(e) => setNewColumnTitle(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6"
                                            onClick={() => setIsAddingColumn(false)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-primary"
                                            onClick={handleAddColumn}
                                        >
                                            <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    className="h-[50px] w-[50px] rounded-xl border-2 border-dashed border-muted hover:border-primary/50 hover:bg-secondary/50 text-muted-foreground"
                                    onClick={() => setIsAddingColumn(true)}
                                >
                                    <Plus className="h-6 w-6" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Droppable>
        </div>
    );
}
