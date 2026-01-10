"use client";

import { memo, useState } from 'react';
import { Handle, Position, NodeProps, NodeToolbar, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Palette, Bold, Italic, StickyNote, Sparkles, Trash2, Smile, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GradientNodeData extends Record<string, unknown> {
    isCentral?: boolean;
    dimmed?: boolean;
    onDelete?: () => void;
    subLabel?: string;
    label?: string;
}

type GradientNode = Node<GradientNodeData>;

export const GradientNode = memo(({ data, selected, id }: NodeProps<GradientNode>) => {
    const isCentral = data.isCentral === true;
    const isDimmed = data.dimmed === true;

    // Handlers for toolbar actions (placeholder props)
    const onDelete = data.onDelete as () => void;
    const onColor = () => { };

    return (
        <>
            <NodeToolbar isVisible={selected} position={Position.Top} className="flex items-center gap-1 bg-background/95 backdrop-blur-md border shadow-xl rounded-full p-1.5 animate-in fade-in zoom-in-95 duration-200">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={onColor}>
                    <Palette className="h-4 w-4 text-blue-500" />
                </Button>
                <div className="w-px h-4 bg-border/50 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                    <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                    <Italic className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border/50 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                    <Smile className="h-4 w-4 text-yellow-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                    <StickyNote className="h-4 w-4 text-orange-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                </Button>
                <div className="w-px h-4 bg-border/50 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 text-destructive hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </NodeToolbar>

            <div className={cn(
                "px-6 py-4 shadow-sm rounded-2xl bg-card border transition-all duration-300 group",
                isCentral
                    ? "min-w-[200px] border-primary/50 shadow-[0_0_30px_rgba(37,99,235,0.15)] bg-gradient-to-br from-background to-primary/5" // Central styling
                    : "min-w-[150px] border-border/50 hover:border-primary/50 hover:shadow-md", // Child styling
                selected && "ring-2 ring-primary/20 border-primary",
                isDimmed && "opacity-20 blur-[1px] grayscale scale-95"
            )}>
                <div className="flex flex-col items-center text-center">
                    {data.subLabel && (
                        <div className="text-[10px] font-bold uppercase text-muted-foreground/70 mb-1 tracking-widest">
                            {data.subLabel as string}
                        </div>
                    )}
                    <div className={cn(
                        "font-medium text-foreground outline-none empty:before:content-['Node'] empty:before:text-muted-foreground",
                        isCentral ? "text-xl" : "text-sm",
                        "max-w-[200px] break-words"
                    )}>
                        {data.label as string}
                    </div>
                </div>

                {/* Handles - Only show source handle on hover (creating "Invisible" feel) */}
                <Handle type="target" position={Position.Left} className="w-1 h-3 rounded-full bg-border -ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle
                    type="source"
                    position={Position.Right}
                    className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center -mr-3 opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-all cursor-crosshair z-10"
                >
                    <Plus className="w-3 h-3 pointer-events-none" />
                </Handle>
            </div>
        </>
    );
});

GradientNode.displayName = "GradientNode";
