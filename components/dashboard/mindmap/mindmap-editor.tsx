"use client";

import { useCallback, useEffect, useState, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    BackgroundVariant,
    Connection,
    Edge,
    Node,
    Panel,
    ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GradientNode } from './custom-node';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Save, Plus, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mindmap, updateMindmap, getMindmap } from '@/lib/firebase/firestore';

const initialNodes: Node[] = [
    { id: '1', position: { x: 250, y: 250 }, data: { label: 'Central Idea', subLabel: 'Root' }, type: 'gradient' },
];
const initialEdges: Edge[] = [];

const nodeTypes = {
    gradient: GradientNode,
};

interface MindmapEditorProps {
    mindmapId: string;
}

function Editor({ mindmapId }: MindmapEditorProps) {
    const router = useRouter();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [newLabel, setNewLabel] = useState("");

    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

    useEffect(() => {
        const load = async () => {
            const data = await getMindmap(mindmapId);
            if (data) {
                setTitle(data.title);
                if (data.nodes && data.nodes.length > 0) {
                    setNodes(data.nodes);
                    setEdges(data.edges || []);
                }
            } else {
                toast.error("Mindmap not found");
                router.push('/dashboard/mindmap');
            }
            setLoading(false);
        };
        load();
    }, [mindmapId, setNodes, setEdges, router]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const onSave = async () => {
        setSaving(true);
        try {
            await updateMindmap(mindmapId, {
                title,
                nodes,
                edges
            });
            toast.success("Mindmap saved");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const addNode = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNode: Node = {
            id,
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            },
            data: { label: 'New Node', subLabel: 'Idea' },
            type: 'gradient'
        };
        setNodes((nds) => [...nds, newNode]);
    };

    const deleteSelected = () => {
        if (!selectedNodeId) return;
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
        setSelectedNodeId(null);
    };

    const handleNodeClick = (_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
        setNewLabel(node.data.label as string);
    };

    const updateNodeLabel = () => {
        if (!selectedNodeId) return;
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === selectedNodeId) {
                    return { ...n, data: { ...n.data, label: newLabel } };
                }
                return n;
            })
        );
        toast.info("Updated node text");
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-screen w-full flex flex-col bg-background">
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-muted/10 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/mindmap')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <Input
                            className="h-8 border-none font-bold text-lg bg-transparent px-0 focus-visible:ring-0"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save
                    </Button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 w-full h-full relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={handleNodeClick}
                    onPaneClick={() => setSelectedNodeId(null)}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-background"
                >
                    <Controls />
                    <MiniMap />
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

                    <Panel position="top-right" className="bg-card p-2 rounded-lg border shadow-sm flex flex-col gap-2 w-64">
                        <div className="font-semibold text-sm mb-1">Tools</div>
                        <Button size="sm" onClick={addNode} className="justify-start">
                            <Plus className="h-4 w-4 mr-2" /> Add Node
                        </Button>

                        {selectedNodeId && (
                            <div className="mt-4 pt-4 border-t space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground">Selected Node</div>
                                <div className="flex gap-2">
                                    <Input
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                    <Button size="sm" variant="secondary" onClick={updateNodeLabel}>Update</Button>
                                </div>
                                <Button size="sm" variant="destructive" className="w-full justify-start mt-2" onClick={deleteSelected}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Node
                                </Button>
                            </div>
                        )}
                    </Panel>
                </ReactFlow>
            </div>
        </div>
    );
}

export function MindmapEditor(props: MindmapEditorProps) {
    return (
        <ReactFlowProvider>
            <Editor {...props} />
        </ReactFlowProvider>
    );
}
