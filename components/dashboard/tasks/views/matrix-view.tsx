"use client";

import { Draggable, Droppable } from "@hello-pangea/dnd";
import { TaskCard } from "@/components/dashboard/tasks/task-card";
import { Task, Tag, Group } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import { addDays, isBefore } from "date-fns";

interface TasksMatrixViewProps {
    tasks: Task[];
    members: any[];
    groups: Group[];
    role: string;
    orgId?: string;
    tags: Tag[];
    onEditTag: (tag: Tag) => void;
    onDeleteTag: (tagId: string) => void;
    onCreateTag: () => void;
}

export function TasksMatrixView({
    tasks,
    members,
    groups,
    role,
    orgId,
    tags,
    onEditTag,
    onDeleteTag,
    onCreateTag,
}: TasksMatrixViewProps) {

    const getTasksForMatrix = (urgent: boolean, important: boolean) => {
        const urgerntThreshold = addDays(new Date(), 2);
        return tasks.filter((t) => {
            if (t.completed) return false;
            const isImportant = t.priority === "high";
            const date = t.dueDate && t.dueDate !== "" ? new Date(t.dueDate) : null;
            const isUrgent = date ? isBefore(date, urgerntThreshold) : false; // Due within 2 days = Urgent

            return isImportant === important && isUrgent === urgent;
        });
    };

    const renderQuadrant = (id: string, title: string, subtitle: string, colorClass: string, urgent: boolean, important: boolean, number: number) => (
        <Droppable droppableId={id} type="MATRIX_TASK">
            {(provided, snapshot) => (
                <div
                    className={cn(
                        `bg-${colorClass}-50/50 dark:bg-${colorClass}-950/20 border border-${colorClass}-100 dark:border-${colorClass}-900/50 rounded-2xl p-4`,
                        snapshot.isDraggingOver &&
                        `bg-${colorClass}-100/50 ring-2 ring-${colorClass}-500/20`,
                    )}
                >
                    <h3 className={`text-${colorClass}-700 dark:text-${colorClass}-400 font-bold mb-4 flex items-center gap-2`}>
                        <span className={`bg-${colorClass}-100 dark:bg-${colorClass}-900/50 w-6 h-6 rounded-full flex items-center justify-center text-xs`}>
                            {number}
                        </span>
                        {title}{" "}
                        <span className="text-xs font-normal opacity-70">
                            {subtitle}
                        </span>
                    </h3>
                    <div
                        className="space-y-2 min-h-[100px]"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {getTasksForMatrix(urgent, important).map((task, index) => (
                            <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        style={provided.draggableProps.style}
                                    >
                                        <TaskCard
                                            task={task}
                                            compact
                                            dragHandleProps={
                                                role !== "viewer"
                                                    ? provided.dragHandleProps
                                                    : undefined
                                            }
                                            members={members}
                                            groups={groups}
                                            role={role}
                                            orgId={orgId}
                                            tags={tags}
                                            onEditTag={onEditTag}
                                            onDeleteTag={onDeleteTag}
                                            onCreateTag={onCreateTag}
                                            isDragging={snapshot.isDragging}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                </div>
            )}
        </Droppable>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto min-h-[600px]">
            {/* Q1: Do First (Urgent & Important) */}
            {renderQuadrant("matrix-q1", "Do First", "(Urgent & Important)", "rose", true, true, 1)}

            {/* Q2: Schedule (Not Urgent & Important) */}
            {renderQuadrant("matrix-q2", "Schedule", "(Not Urgent & Important)", "blue", false, true, 2)}

            {/* Q3: Delegate (Urgent & Not Important) */}
            {renderQuadrant("matrix-q3", "Delegate", "(Urgent & Not Important)", "amber", true, false, 3)}

            {/* Q4: Eliminate (Not Urgent & Not Important) */}
            {renderQuadrant("matrix-q4", "Eliminate", "(Not Urgent & Not Important)", "slate", false, false, 4)}
        </div>
    );
}
