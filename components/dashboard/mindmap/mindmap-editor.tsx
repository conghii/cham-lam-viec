"use client";

import { useCallback, useEffect, useState } from 'react';
import {
    ReactFlow,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    BackgroundVariant,
    Connection,
    Edge,
    Node,
    Panel,
    ReactFlowProvider,
    useReactFlow,
    OnConnectEnd,
    useViewport,
    ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GradientNode } from './custom-node';
import { AISidebar } from './ai-sidebar';
import { PresentationControls } from './presentation-controls';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import {
    Plus, ArrowLeft, Loader2,
    Play, Maximize, Sparkles, UserPlus, ArrowRight
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { updateMindmap, getMindmap } from '@/lib/firebase/firestore';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const initialNodes: Node[] = [
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'Central Idea', subLabel: 'Root', isCentral: true }, type: 'gradient' },
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
    const searchParams = useSearchParams();
    const { screenToFlowPosition, getNodes, fitView, setCenter } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // UI State
    const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    // Presentation State
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [slides, setSlides] = useState<Node[]>([]);

    // Load Mindmap
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


    // AI Generation Logic
    const onGenerateMap = async (prompt: string, type: 'text' | 'url') => {
        try {
            const res = await fetch('/api/ai/generate-mindmap', {
                method: 'POST',
                body: JSON.stringify({ prompt, type }),
            });

            if (!res.ok) throw new Error("Failed to generate");

            const data = await res.json();
            if (data.root) {
                // Parse hierarchical JSON to Nodes/Edges
                const newNodes: Node[] = [];
                const newEdges: Edge[] = [];

                const traverse = (item: any, parentId: string | null = null, depth = 0, index = 0, totalSiblings = 1) => {
                    const id = Math.random().toString(36).slice(2);

                    // Simple radial/tree layout calculation
                    // Root at 0,0
                    // Children spread out
                    let position = { x: 0, y: 0 };
                    if (parentId === null) {
                        position = { x: 0, y: 0 };
                    } else {
                        // Depth determines X (horizontal tree)
                        const xOffset = 250;
                        const ySpacing = 100;
                        const startY = -((totalSiblings - 1) * ySpacing) / 2;

                        // Find parent node
                        const parent = newNodes.find(n => n.id === parentId);
                        if (parent) {
                            position = {
                                x: parent.position.x + xOffset,
                                y: parent.position.y + startY + (index * ySpacing)
                            };
                        }
                    }

                    newNodes.push({
                        id,
                        position,
                        data: {
                            label: item.label,
                            isCentral: depth === 0
                        },
                        type: 'gradient',
                        origin: [0.5, 0.0]
                    });

                    if (parentId) {
                        newEdges.push({
                            id: `e-${parentId}-${id}`,
                            source: parentId,
                            target: id,
                            type: 'smoothstep',
                            animated: true,
                            style: { strokeWidth: 2 }
                        });
                    }

                    if (item.children && item.children.length > 0) {
                        item.children.forEach((child: any, i: number) => {
                            traverse(child, id, depth + 1, i, item.children.length);
                        });
                    }
                };

                traverse(data.root);

                setNodes(newNodes);
                setEdges(newEdges);
                toast.success("Mindmap Generated by AI!");
                setTimeout(() => fitView({ duration: 1000 }), 100);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to generate map");
        }
    };

    // Auto-generate from URL prompt
    useEffect(() => {
        const prompt = searchParams?.get('prompt');
        // Only generate if prompt exists, initial load finished, and only central node exists
        if (prompt && !loading && nodes.length <= 1) {
            const type = prompt.startsWith('http') ? 'url' : 'text';
            onGenerateMap(prompt, type);
            // Clear param
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('prompt');
            window.history.replaceState({}, '', newUrl.toString());
        }
    }, [searchParams, loading, nodes.length]);

    // Presentation Logic (Flatten & Sort)
    useEffect(() => {
        if (isPresentationMode) {
            const centralNode = nodes.find(n => n.data.isCentral) || nodes[0];
            const ordered: Node[] = [];
            const visited = new Set<string>();
            const queue = [centralNode];

            while (queue.length > 0) {
                const node = queue.shift();
                if (node && !visited.has(node.id)) {
                    visited.add(node.id);
                    ordered.push(node);
                    const childrenEdges = edges.filter(e => e.source === node.id);
                    const children = childrenEdges
                        .map(e => nodes.find(n => n.id === e.target))
                        .filter((n): n is Node => !!n)
                        .sort((a, b) => a.position.y - b.position.y);
                    queue.push(...children);
                }
            }
            nodes.forEach(n => { if (!visited.has(n.id)) ordered.push(n); });
            setSlides(ordered);
            setCurrentStep(0);
            setIsPlaying(true);
        }
    }, [isPresentationMode, nodes, edges]);

    // Camera Animation
    useEffect(() => {
        if (isPresentationMode && slides.length > 0) {
            const node = slides[currentStep];
            if (node) {
                const zoom = node.data.isCentral ? 1.2 : 1.5;
                setCenter(node.position.x + 75, node.position.y + 25, { zoom, duration: 1200 });
                setNodes(nds => nds.map(n => ({
                    ...n,
                    data: { ...n.data, dimmed: n.id !== node.id }
                })));
            }
        } else {
            setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, dimmed: false } })));
        }
    }, [isPresentationMode, currentStep, slides, setCenter, setNodes]);


    // Save Function
    const saveMindmap = async () => {
        setSaving(true);
        try {
            await updateMindmap(mindmapId, { title, nodes, edges });
        } catch (e) {
            console.error("Failed to save", e);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (nodes.length > 0) saveMindmap();
        }, 10000);
        return () => clearInterval(interval);
    }, [nodes, edges, title]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPresentationMode && isPlaying && slides.length > 0) {
            interval = setInterval(() => {
                setCurrentStep(prev => (prev < slides.length - 1 ? prev + 1 : prev));
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [isPresentationMode, isPlaying, slides.length]);


    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { strokeWidth: 2 } }, eds)),
        [setEdges],
    );

    const onConnectEnd: OnConnectEnd = useCallback(
        (event, connectionState) => {
            if (!connectionState.isValid) {
                const id = Math.random().toString(36).slice(2);
                const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
                const position = screenToFlowPosition({ x: clientX, y: clientY });
                const newNode: Node = {
                    id,
                    position,
                    data: { label: 'New Idea' },
                    type: 'gradient',
                    origin: [0.5, 0.0],
                };
                setNodes((nds) => nds.concat(newNode));
                setEdges((eds) => eds.concat({
                    id,
                    source: connectionState.fromNode!.id,
                    sourceHandle: connectionState.fromHandle!.id,
                    target: id,
                    type: 'smoothstep',
                    animated: true,
                    style: { strokeWidth: 2 }
                }),
                );
            }
        },
        [screenToFlowPosition, setNodes, setEdges],
    );

    const onAddSuggestion = (text: string) => {
        const parentId = selectedNodeId || nodes[0]?.id;
        const parentNode = nodes.find(n => n.id === parentId);
        if (!parentNode) return;

        const id = Math.random().toString(36).slice(2);
        const newNode: Node = {
            id,
            position: {
                x: parentNode.position.x + (Math.random() * 200 - 50) + 150,
                y: parentNode.position.y + (Math.random() * 200 - 50) + 50
            },
            data: { label: text },
            type: 'gradient',
            origin: [0.5, 0.0],
        };
        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => eds.concat({
            id,
            source: parentId,
            target: id,
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 }
        }),
        );
        toast.success("Idea added from AI");
    };

    const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleNext = () => { if (currentStep < slides.length - 1) setCurrentStep(prev => prev + 1); };
    const handlePrev = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };
    const togglePlay = () => setIsPlaying(!isPlaying);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="h-screen w-full bg-background relative overflow-hidden flex">
            <AISidebar
                open={isAiSidebarOpen}
                onClose={() => setIsAiSidebarOpen(false)}
                selectedNodeLabel={selectedNode?.data.label as string}
                onAddSuggestion={onAddSuggestion}
                onGenerateMap={onGenerateMap}
            />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                    if (!isPresentationMode) setSelectedNodeId(node.id);
                }}
                onPaneClick={() => setSelectedNodeId(null)}
                fitView
                className={cn("bg-background flex-1 transition-colors duration-1000", isPresentationMode && "bg-neutral-950")}
                defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { strokeWidth: 2, stroke: '#94a3b8' } }}
                connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
                connectionMode={ConnectionMode.Loose}
            >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={isPresentationMode ? "#333" : "#e2e8f0"} />

                {!isPresentationMode && (
                    <Panel position="top-left" className="m-4 ml-12 md:ml-4 flex items-center gap-2 bg-background/50 backdrop-blur-sm p-1 rounded-full border shadow-sm hover:shadow-md transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.push('/dashboard/mindmap')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Input
                            value={title}
                            onChange={onTitleChange}
                            className="h-8 w-[200px] border-none bg-transparent focus-visible:ring-0 font-medium text-sm"
                        />
                        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mr-2" />}
                    </Panel>
                )}

                {!isPresentationMode && (
                    <Panel position="top-right" className="m-4 flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full shadow-sm bg-background/80 backdrop-blur-sm border-border">
                            <UserPlus className="h-4 w-4" />
                            <span className="hidden md:inline">Share</span>
                        </Button>
                        <Button
                            className="h-9 gap-2 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => setIsPresentationMode(true)}
                        >
                            <Play className="h-4 w-4 fill-current" />
                            <span className="hidden md:inline">Present</span>
                        </Button>
                    </Panel>
                )}

                {!isPresentationMode && (
                    <Panel position="bottom-right" className="m-4 flex flex-col gap-2">
                        <div className="flex flex-col bg-background/80 backdrop-blur-sm border shadow-lg rounded-full p-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => fitView({ duration: 500 })}>
                                            <Maximize className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Fit to Screen</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </Panel>
                )}

                {!isPresentationMode && (
                    <Panel position="bottom-left" className="m-6 z-10">
                        <Button
                            size="icon"
                            onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
                            className={cn(
                                "h-12 w-12 rounded-full shadow-xl transition-all hover:scale-105",
                                isAiSidebarOpen
                                    ? "bg-background text-foreground border hover:bg-muted"
                                    : "bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                            )}
                        >
                            {isAiSidebarOpen ? <ArrowRight className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                        </Button>
                    </Panel>
                )}

                {isPresentationMode && (
                    <PresentationControls
                        isPlaying={isPlaying}
                        currentStep={currentStep}
                        totalSteps={slides.length}
                        onPlayPause={togglePlay}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onExit={() => setIsPresentationMode(false)}
                    />
                )}
            </ReactFlow>
        </div>
    );
}

export function MindmapEditor(props: MindmapEditorProps) {
    return (
        <ReactFlowProvider>
            <div style={{ width: '100vw', height: '100vh' }}>
                <Editor {...props} />
            </div>
        </ReactFlowProvider>
    );
}
