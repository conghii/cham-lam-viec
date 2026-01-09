"use client";

import { MindmapEditor } from "@/components/dashboard/mindmap/mindmap-editor";
import { useParams } from "next/navigation";

export default function MindmapEditorPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <MindmapEditor mindmapId={id} />
    );
}
