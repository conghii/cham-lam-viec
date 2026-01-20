"use client";

import { DragDropContext } from "@hello-pangea/dnd";
import {
    LayoutList,
    Kanban,
    Grid2X2,
    Maximize2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/shared/language-context";
import { cn } from "@/lib/utils";

import { TagManagerDialog } from "@/components/dashboard/tasks/tag-manager-dialog";
import { AddTaskBar } from "@/components/dashboard/tasks/add-task-bar";
import { CreateTaskDialog } from "@/components/dashboard/create-task-dialog";
import { TasksListView } from "@/components/dashboard/tasks/views/list-view";
import { TasksBoardView } from "@/components/dashboard/tasks/views/board-view";
import { TasksMatrixView } from "@/components/dashboard/tasks/views/matrix-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasksViewModel } from "@/components/dashboard/tasks/hooks/use-tasks-view-model";

interface TasksViewProps {
    compact?: boolean;
    className?: string;
}

export function TasksView({ compact = false, className }: TasksViewProps) {
    const { t } = useLanguage();
    const vm = useTasksViewModel();

    return (
        <DragDropContext onDragEnd={vm.onDragEnd}>
            <div className={cn("flex-1 flex flex-col", className)}>
                {/* 1. Header / Toolbar */}
                <div className="flex flex-col gap-4 mb-4">
                    {/* View Switcher and Toolbar */}
                    {!compact ? (
                        <div className="flex justify-between items-center">
                            <div className="bg-muted p-1 rounded-lg flex gap-1 shrink-0">
                                <Button
                                    variant={vm.view === "list" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => vm.setView("list")}
                                    className="h-8 px-3 text-xs"
                                >
                                    <LayoutList className="mr-2 h-4 w-4" />
                                    {t("list_view")}
                                </Button>
                                <Button
                                    variant={vm.view === "board" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => vm.setView("board")}
                                    className="h-8 px-3 text-xs"
                                >
                                    <Kanban className="mr-2 h-4 w-4" />
                                    {t("board_view")}
                                </Button>
                                <Button
                                    variant={vm.view === "matrix" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => vm.setView("matrix")}
                                    className="h-8 px-3 text-xs"
                                >
                                    <Grid2X2 className="mr-2 h-4 w-4" />
                                    {t("matrix_view")}
                                </Button>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 text-xs gap-2 ml-auto"
                                onClick={() => window.open('/dashboard/tasks/widget', 'TasksWidget', 'width=350,height=600')}
                            >
                                <Maximize2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Mini Widget</span>
                            </Button>
                        </div>
                    ) : null}

                    {/* Add Task Bar - Only show in full view or if tailored for compact */}
                    {!compact || true ? (
                        <AddTaskBar
                            newTaskTitle={vm.newTaskTitle}
                            setNewTaskTitle={vm.setNewTaskTitle}
                            newTaskDate={vm.newTaskDate}
                            setNewTaskDate={vm.setNewTaskDate}
                            newTaskPriority={vm.newTaskPriority}
                            setNewTaskPriority={vm.setNewTaskPriority}
                            newTaskTag={vm.newTaskTag}
                            setNewTaskTag={vm.setNewTaskTag}
                            newTaskStatus={vm.newTaskStatus}
                            handleAddTask={vm.handleAddTask}
                            availableTags={vm.availableTags}
                            role={vm.role}
                            orgId={vm.orgId}
                            columns={vm.columns}
                            isTagManagerOpen={vm.isTagManagerOpen}
                            setIsTagManagerOpen={vm.setIsTagManagerOpen}
                            editingTag={vm.editingTag}
                            setEditingTag={vm.setEditingTag}
                            newTagName={vm.newTagName}
                            setNewTagName={vm.setNewTagName}
                            newTagColor={vm.newTagColor}
                            setNewTagColor={vm.setNewTagColor}
                            onDeleteTag={vm.handleDeleteTagFromOrg}
                        />
                    ) : null}
                </div>

                {/* 2. Main Content */}
                {vm.loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : vm.tasks.length === 0 && vm.columns.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <LayoutList className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{t("no_tasks_yet")}</h3>
                        <p className="text-slate-500 max-w-sm mb-6">{t("no_tasks_desc")}</p>
                        <Button onClick={vm.handleCreateDefaultColumns}>
                            {t("create_default_board")}
                        </Button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-visible px-2 py-1">
                        {vm.view === "list" && (
                            <TasksListView
                                tasks={vm.tasks}
                                columns={vm.columns}
                                onMove={vm.updateTaskStatus}
                                tags={vm.availableTags}
                                onEditTag={vm.handleEditTag}
                                onDeleteTag={vm.handleDeleteTagFromOrg}
                                onCreateTag={vm.handleCreateTag}
                                members={vm.members}
                                role={vm.role}
                                orgId={vm.orgId}
                                groups={vm.groups}
                            />
                        )}

                        {vm.view === "board" && (
                            <TasksBoardView
                                columns={vm.columns}
                                tasks={vm.filteredTasks}
                                tags={vm.availableTags}
                                onEditTag={vm.handleEditTag}
                                onDeleteTag={vm.handleDeleteTagFromOrg}
                                onCreateTag={vm.handleCreateTag}
                                members={vm.members}
                                role={vm.role}
                                orgId={vm.orgId}
                                groups={vm.groups}
                                onMove={vm.updateTaskStatus}
                                setCreateTaskStatus={vm.setCreateTaskStatus}
                                setIsCreateTaskOpen={vm.setIsCreateTaskOpen}
                                handleCreateDefaultColumns={vm.handleCreateDefaultColumns}
                            />
                        )}

                        {vm.view === "matrix" && (
                            <TasksMatrixView
                                tasks={vm.filteredTasks}
                                tags={vm.availableTags}
                                onEditTag={vm.handleEditTag}
                                onDeleteTag={vm.handleDeleteTagFromOrg}
                                onCreateTag={vm.handleCreateTag}
                                members={vm.members}
                                role={vm.role}
                                orgId={vm.orgId}
                                groups={vm.groups}
                            />
                        )}
                    </div>
                )}

                {/* 3. Dialogs */}
                <CreateTaskDialog
                    open={vm.isCreateTaskOpen}
                    onOpenChange={vm.setIsCreateTaskOpen}
                    initialStatus={vm.createTaskStatus}
                    statusLabel={vm.columns.find(c => c.id === vm.createTaskStatus)?.title || "Backlog"}
                    onSubmit={vm.handleCreateTaskFromModal}
                    goals={vm.goals}
                    members={vm.members}
                    tags={vm.availableTags}
                />

                <TagManagerDialog
                    open={vm.isTagManagerOpen}
                    onOpenChange={vm.setIsTagManagerOpen}
                    editingTag={vm.editingTag}
                    newTagName={vm.newTagName}
                    setNewTagName={vm.setNewTagName}
                    newTagColor={vm.newTagColor}
                    setNewTagColor={vm.setNewTagColor}
                    setEditingTag={vm.setEditingTag}
                    orgId={vm.orgId}
                    tags={vm.availableTags}
                />
            </div>
        </DragDropContext>
    );
}
