"use client";

import { Task, TaskColumn, Tag, Group } from "@/lib/firebase/firestore";
import { TaskCard } from "@/components/dashboard/tasks/task-card";

interface TasksListViewProps {
    tasks: Task[];
    columns: TaskColumn[];
    onMove: (taskId: string, status: string) => void;
    members: any[];
    groups: Group[];
    role: string;
    orgId?: string;
    tags: Tag[];
    onEditTag: (tag: Tag) => void;
    onDeleteTag: (tagId: string) => void;
    onCreateTag: () => void;
}

export function TasksListView({
    tasks,
    columns,
    onMove,
    members,
    groups,
    role,
    orgId,
    tags,
    onEditTag,
    onDeleteTag,
    onCreateTag,
}: TasksListViewProps) {
    return (
        <div className="space-y-3">
            {tasks.map((task) => (
                <TaskCard
                    key={task.id}
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
                />
            ))}
        </div>
    );
}
