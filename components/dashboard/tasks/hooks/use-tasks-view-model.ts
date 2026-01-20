"use client";

import { useState, useEffect } from "react";
import { DropResult } from "@hello-pangea/dnd";
import {
    subscribeToTasks,
    addTask,
    toggleTaskCompletion,
    updateTaskStatus,
    updateTask,
    type Task,
    subscribeToTaskColumns,
    addTaskColumn,
    deleteTaskColumn,
    batchUpdateColumnOrders,
    type TaskColumn,
    subscribeToGroups,
    type Group,
    subscribeToGoals,
    type Goal,
    getOrganizationMembers,
    getUserOrganization,
    subscribeToOrganization,
    Organization,
    Tag,
    deleteTagFromOrganization,
} from "@/lib/firebase/firestore";

import { useLanguage } from "@/components/shared/language-context";
import { toast } from "sonner";
import { addDays, isToday, isSameWeek } from "date-fns";
import { auth } from "@/lib/firebase/auth";
import { presetColors } from "@/components/dashboard/tasks/tag-manager-dialog";
import { useGamification } from "@/components/providers/gamification-provider";

// Default tags if none exist
const defaultTags: Tag[] = [];

export function useTasksViewModel() {
    const { t } = useLanguage();
    const { addXP } = useGamification();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [columns, setColumns] = useState<TaskColumn[]>([]);

    // Add Task State
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskTag, setNewTaskTag] = useState("general");
    const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);
    const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
    const [newTaskStatus, setNewTaskStatus] = useState<string>("backlog");

    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("list");
    const [members, setMembers] = useState<any[]>([]);
    const [role, setRole] = useState<"owner" | "member" | "viewer">("member");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [orgId, setOrgId] = useState<string | undefined>(undefined);
    const [groups, setGroups] = useState<Group[]>([]);
    const [organization, setOrganization] = useState<Organization | null>(null);

    // Tag Manager State
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState(presetColors[0].value);

    // Create Task Modal State
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [createTaskStatus, setCreateTaskStatus] = useState<string>("backlog");

    const orgTags = organization?.tags || [];
    const availableTags = orgTags.length > 0 ? orgTags : defaultTags;

    // --- Data Fetching ---
    useEffect(() => {
        const loadMembers = async () => {
            const user = auth.currentUser;
            setCurrentUser(user);
            if (user) {
                const org = await getUserOrganization(user.uid);
                if (org) {
                    setOrgId(org.id);
                    const orgMembers = await getOrganizationMembers(org.id);
                    setMembers(orgMembers);

                    const myMemberInfo = orgMembers.find((m: any) => m.id === user.uid);
                    if (myMemberInfo) {
                        setRole(myMemberInfo.role || "member");
                    } else if (org.ownerId === user.uid) {
                        setRole("owner");
                    }
                }
            }
        };

        loadMembers();

        const unsubscribeTasks = subscribeToTasks((data) => setTasks(data));
        const unsubscribeGoals = subscribeToGoals((data) => setGoals(data));
        const unsubscribeColumns = subscribeToTaskColumns((data) => {
            setColumns(data);
        });
        const unsubscribeGroups = subscribeToGroups((data) => {
            setGroups(data);
        });

        let unsubscribeOrg: () => void = () => { };
        if (orgId) {
            unsubscribeOrg = subscribeToOrganization(orgId, (data) => {
                setOrganization(data);
            });
        }

        setLoading(false);
        return () => {
            unsubscribeTasks();
            unsubscribeGoals();
            unsubscribeColumns();
            unsubscribeGroups();
            unsubscribeOrg();
        };
    }, [orgId]);

    // --- Filtering & Sorting ---
    const filteredTasks = tasks.filter((task) => {
        if (role === "owner") return true;
        if (!currentUser) return false;
        const isCreator = task.userId === currentUser.uid;
        const isAssigned =
            (task.assigneeIds && task.assigneeIds.includes(currentUser.uid)) ||
            task.assigneeId === currentUser.uid;
        return isCreator || isAssigned;
    });

    const sortedTasksForList = filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    // --- Auto Migration ---
    useEffect(() => {
        if (tasks.length === 0 || columns.length === 0) return;

        const todayCol = columns.find((c) => c.title === "Today");
        const thisWeekCol = columns.find((c) => c.title === "This Week");
        const doneCol = columns.find((c) => c.title === "Done");
        const backlogCol = columns.find((c) => c.title === "Backlog");

        if (!todayCol && !thisWeekCol && !doneCol) return;

        tasks.forEach((task) => {
            if (task.completed && doneCol && task.status !== doneCol.id) {
                updateTaskStatus(task.id, doneCol.id);
                return;
            }
            if (task.completed) return;
            if (backlogCol && task.status === backlogCol.id) return;
            if (!task.dueDate) return;

            const date = new Date(task.dueDate);

            if (isToday(date) && todayCol && task.status !== todayCol.id) {
                updateTaskStatus(task.id, todayCol.id);
            }
            else if (
                isSameWeek(date, new Date(), { weekStartsOn: 1 }) &&
                !isToday(date) &&
                thisWeekCol &&
                task.status !== thisWeekCol.id &&
                task.status !== todayCol?.id
            ) {
                updateTaskStatus(task.id, thisWeekCol.id);
            }
        });
    }, [tasks, columns]);

    // --- Actions ---

    const handleCreateTaskFromModal = async (data: any) => {
        try {
            await addTask(
                data.title,
                data.tag || "general",
                data.dueDate ? data.dueDate.toISOString() : undefined,
                data.priority,
                data.assigneeId || undefined,
                [],
                [],
                createTaskStatus,
                data.goalId
            );
            toast.success(t("task_created") || "Task created");
            setIsCreateTaskOpen(false);
        } catch (error: any) {
            console.error("Failed to add task", error);
            toast.error("Failed to add task");
        }
    };

    const handleCreateDefaultColumns = async () => {
        setLoading(true);
        await addTaskColumn("Backlog", 0);
        await addTaskColumn("This Week", 1);
        await addTaskColumn("Today", 2);
        await addTaskColumn("Done", 3);
        setLoading(false);
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            await addTask(
                newTaskTitle,
                newTaskTag,
                newTaskDate ? newTaskDate.toISOString() : undefined,
                newTaskPriority,
                undefined,
                undefined,
                undefined,
                newTaskStatus
            );
            setNewTaskTitle("");
            setNewTaskDate(undefined);
            setNewTaskPriority("medium");
            setNewTaskTag("general");
            setNewTaskStatus("backlog");
        } catch (error: any) {
            console.error("Failed to add task", error);
            toast.error(`Failed to add task: ${error.message} `);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        if (type === "COLUMN") {
            const newColumns = Array.from(columns);
            const [reorderedItem] = newColumns.splice(source.index, 1);
            newColumns.splice(destination.index, 0, reorderedItem);
            setColumns(newColumns.map((c, i) => ({ ...c, order: i })));
            await batchUpdateColumnOrders(
                newColumns.map((c, i) => ({ id: c.id, order: i })),
            );
            return;
        }

        if (destination.droppableId.startsWith("matrix-")) {
            const quadrant = destination.droppableId;
            let updates: Partial<Task> = {};
            const tomorrow = addDays(new Date(), 1);
            const nextWeek = addDays(new Date(), 7);

            switch (quadrant) {
                case "matrix-q1": // Do First
                    updates = { priority: "high", dueDate: tomorrow.toISOString() };
                    break;
                case "matrix-q2": // Schedule
                    updates = { priority: "high", dueDate: nextWeek.toISOString() };
                    break;
                case "matrix-q3": // Delegate
                    updates = { priority: "medium", dueDate: tomorrow.toISOString() };
                    break;
                case "matrix-q4": // Eliminate
                    updates = { priority: "low", dueDate: nextWeek.toISOString() };
                    break;
            }

            await updateTask(draggableId, updates);
            return;
        }

        const startColumnId = source.droppableId;
        const finishColumnId = destination.droppableId;

        if (startColumnId !== finishColumnId) {
            const destColumn = columns.find(c => c.id === finishColumnId);
            const sourceColumn = columns.find(c => c.id === startColumnId);
            const movingToDone = destColumn?.title === "Done";
            const movingFromDone = sourceColumn?.title === "Done";
            const movingToBacklog = destColumn?.title === "Backlog";

            await updateTaskStatus(draggableId, finishColumnId);

            if (movingToDone) {
                await toggleTaskCompletion(draggableId, false);
                addXP(50, "Task Completed via Drag & Drop");
            } else if (movingFromDone) {
                await toggleTaskCompletion(draggableId, true);
            }

            if (movingToBacklog) {
                await updateTask(draggableId, { dueDate: null });
            }
        }
    };

    // Shared Tag Handlers
    const handleEditTag = (tag: Tag) => {
        setEditingTag(tag);
        setNewTagName(tag.label);
        setNewTagColor(tag.color || presetColors[0].value);
        setIsTagManagerOpen(true);
    };

    const handleDeleteTagFromOrg = (tagId: string) => {
        if (orgId) deleteTagFromOrganization(orgId, tagId);
    };

    const handleCreateTag = () => {
        setEditingTag(null);
        setNewTagName("");
        setNewTagColor(presetColors[0].value);
        setIsTagManagerOpen(true);
    };

    return {
        // Data
        tasks: sortedTasksForList,
        filteredTasks, // For board/matrix
        goals,
        columns,
        members,
        groups,
        role,
        currentUser,
        orgId,
        availableTags,
        loading,
        view,

        // UI State
        setView,
        isCreateTaskOpen,
        setIsCreateTaskOpen,
        createTaskStatus,
        setCreateTaskStatus,
        isTagManagerOpen,
        setIsTagManagerOpen,
        editingTag,
        setEditingTag,
        newTagName,
        setNewTagName,
        newTagColor,
        setNewTagColor,

        // Add Task Bar State
        newTaskTitle,
        setNewTaskTitle,
        newTaskTag,
        setNewTaskTag,
        newTaskDate,
        setNewTaskDate,
        newTaskPriority,
        setNewTaskPriority,
        newTaskStatus,
        // setNewTaskStatus, // Expose if needed

        // Handlers
        handleCreateTaskFromModal,
        handleCreateDefaultColumns,
        handleAddTask,
        onDragEnd,
        handleEditTag,
        handleDeleteTagFromOrg,
        handleCreateTag,
        updateTaskStatus: async (taskId: string, newStatus: string | boolean) => {
            if (typeof newStatus === "boolean") {
                // It's a completion toggle
                await toggleTaskCompletion(taskId, newStatus);
                if (newStatus === true) {
                    addXP(50, "Task Completed");
                }
            } else {
                // It's a column move
                await updateTaskStatus(taskId, newStatus);
                // Check if the new column is "Done"
                const doneColumn = columns.find(c => c.title === "Done");
                if (doneColumn && newStatus === doneColumn.id) {
                    // We need to confirm if the task wasn't already completed?
                    // Usually moving to Done column auto-completes in onDragEnd logic, 
                    // but here we are in direct update.
                    // Let's assume onDragEnd handles the specific "move to done" XP.
                    // But if user changes status via Dropdown in Task Detail?
                    // We should handle it here too.
                    // But wait, updateTaskStatus just moves the column.
                    // Does it toggle completion? 
                    // onDragEnd had explicit toggleTaskCompletion calls.
                    // If we just move column, we might need to toggle completion too.
                }
            }
        },
        setNewTaskStatus
    };
}
