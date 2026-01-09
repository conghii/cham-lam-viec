"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

export const GradientNode = memo(({ data, selected }: NodeProps) => {
    return (
        <div className={cn(
            "px-4 py-2 shadow-md rounded-xl bg-card border-2 min-w-[150px] transition-all duration-300",
            selected
                ? "border-primary shadow-lg ring-2 ring-primary/20 scale-105"
                : "border-border hover:border-primary/50"
        )}>
            <div className="flex flex-col">
                <div className="text-xs font-bold uppercase text-muted-foreground mb-1 tracking-wider">
                    {data.subLabel as string || "Idea"}
                </div>
                <div className="text-sm font-semibold text-foreground">
                    {data.label as string}
                </div>
            </div>

            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground/50 border-2 border-background" />
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary border-2 border-background" />
            <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-primary border-2 border-background" />
            <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-muted-foreground/50 border-2 border-background" />
        </div>
    );
});

GradientNode.displayName = "GradientNode";
