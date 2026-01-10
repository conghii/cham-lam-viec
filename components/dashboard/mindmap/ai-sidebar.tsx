"use client";

import { useState } from "react";
import {
    Lightbulb,
    FileText,
    Palette,
    UploadCloud,
    Wand2,
    X,
    Sparkles,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AISidebarProps {
    open: boolean;
    onClose: () => void;
    selectedNodeLabel?: string;
    onAddSuggestion: (text: string) => void;
    onGenerateMap?: (prompt: string, type: 'text' | 'url') => Promise<void>;
}

export function AISidebar({ open, onClose, selectedNodeLabel, onAddSuggestion, onGenerateMap }: AISidebarProps) {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Mock suggestions based on selected node, or generic if none
    const suggestions = selectedNodeLabel
        ? [
            `Why is "${selectedNodeLabel}" important?`,
            `Key components of ${selectedNodeLabel}`,
            `Risks associated with ${selectedNodeLabel}`,
            `Future trends in ${selectedNodeLabel}`
        ]
        : [
            "Start with a Brainstorming session",
            "Create a Project Timeline",
            "Analyze a potential problem",
            "Outline a Marketing Strategy"
        ];

    return (
        <div
            className={cn(
                "absolute top-0 left-0 h-full w-[350px] bg-background/95 backdrop-blur-md border-r shadow-2xl z-20 transition-transform duration-300 ease-in-out transform flex flex-col",
                open ? "translate-x-0" : "-translate-x-full"
            )}
        >
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2 font-semibold text-primary">
                    <Sparkles className="h-5 w-5" />
                    AI Hub
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <Tabs defaultValue="suggestions" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 pt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="suggestions">
                            <Lightbulb className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger value="generate">
                            <FileText className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger value="style">
                            <Palette className="h-4 w-4" />
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                    <ScrollArea className="h-full pr-4">
                        <TabsContent value="suggestions" className="space-y-4 mt-0 h-full">
                            <div className="space-y-1">
                                <h3 className="font-medium text-sm">
                                    {selectedNodeLabel ? `Ideas for "${selectedNodeLabel}"` : "Getting Started"}
                                </h3>
                                <p className="text-xs text-muted-foreground">Select an idea to add it to your map.</p>
                            </div>

                            <div className="grid gap-2">
                                {suggestions.map((s, i) => (
                                    <Button
                                        key={i}
                                        variant="outline"
                                        className="justify-start h-auto py-3 px-4 w-full text-left whitespace-normal hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                        onClick={() => onAddSuggestion(s)}
                                    >
                                        <span className="mr-2 text-primary">•</span> {s}
                                    </Button>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="generate" className="space-y-6 mt-0">
                            <div className="p-6 border-2 border-dashed border-muted-foreground/25 rounded-xl flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer group">
                                <div className="p-3 bg-muted rounded-full group-hover:scale-110 transition-transform">
                                    <UploadCloud className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Drop PDF or Word here</p>
                                    <p className="text-xs text-muted-foreground">AI will analyze and generate a map</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold">Custom Prompt or URL</label>
                                <Textarea
                                    placeholder="e.g. 'Business Plan for Coffee Shop' or paste a URL..."
                                    className="resize-none h-24"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                                <Button
                                    className="w-full gap-2"
                                    disabled={!prompt.trim() || isGenerating}
                                    onClick={async () => {
                                        if (!onGenerateMap) return;
                                        setIsGenerating(true);
                                        try {
                                            const type = prompt.startsWith('http') ? 'url' : 'text';
                                            await onGenerateMap(prompt, type);
                                            setPrompt("");
                                        } finally {
                                            setIsGenerating(false);
                                        }
                                    }}
                                >
                                    {isGenerating ? <Sparkles className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                    {isGenerating ? "Generating..." : "Generate Mindmap"}
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="style" className="space-y-4 mt-0">
                            <div className="space-y-1">
                                <h3 className="font-medium text-sm">Visual Style</h3>
                                <p className="text-xs text-muted-foreground">Apply a theme to your entire map.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <StyleCard title="Professional" color="bg-blue-500" />
                                <StyleCard title="Neon Cyber" color="bg-pink-500" />
                                <StyleCard title="Minimalist" color="bg-zinc-200 text-zinc-800" />
                                <StyleCard title="Hand Drawn" color="bg-yellow-100 text-yellow-800" />
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </div>
            </Tabs>
        </div>
    );
}

function StyleCard({ title, color }: { title: string, color: string }) {
    return (
        <div className="rounded-lg border bg-card p-3 cursor-pointer hover:ring-2 ring-primary/50 transition-all">
            <div className={cn("w-full h-16 rounded-md mb-2 flex items-center justify-center text-xs font-bold", color)}>
                Aa
            </div>
            <div className="text-center text-xs font-medium">{title}</div>
        </div>
    )
}
