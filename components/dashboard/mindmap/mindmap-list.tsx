"use client";

import { useState, useEffect } from "react";
import { Plus, Network, MoreVertical, Trash2, Edit2, ExternalLink, Search, Sparkles, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
    Mindmap,
    subscribeToMindmaps,
    addMindmap,
    deleteMindmap,
    updateMindmap
} from "@/lib/firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase/auth"; // Direct auth import for user info
import { useLanguage } from "@/components/shared/language-context";
import { cn } from "@/lib/utils";

export function MindmapList() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const [mindmaps, setMindmaps] = useState<Mindmap[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(auth.currentUser);

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiCreating, setIsAiCreating] = useState(false);

    // Rename State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");

    useEffect(() => {
        const unsubscribe = subscribeToMindmaps((data) => {
            setMindmaps(data);
            setLoading(false);
        });
        const unsubscribeAuth = auth.onAuthStateChanged((u) => setUser(u));
        return () => {
            unsubscribe();
            unsubscribeAuth();
        }
    }, []);

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            // Fallback default title if empty (e.g. from Manual Draw button)
            await createMindmap("Untitled Mindmap");
            return;
        }
        await createMindmap(newTitle);
    };

    const createMindmap = async (title: string) => {
        setIsCreating(true);
        try {
            await addMindmap(title);
            setIsCreateOpen(false);
            setNewTitle("");
            toast.success("Mindmap created!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create mindmap");
        } finally {
            setIsCreating(false);
        }
    }

    const handleCreateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsAiCreating(true);
        try {
            const title = "AI: " + (aiPrompt.length > 20 ? aiPrompt.slice(0, 20) + "..." : aiPrompt);
            const id = await addMindmap(title);
            // Redirect with prompt query param
            router.push(`/dashboard/mindmap/${id}?prompt=${encodeURIComponent(aiPrompt)}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create mindmap");
            setIsAiCreating(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this mindmap?")) {
            try {
                await deleteMindmap(id);
                toast.success("Mindmap deleted");
            } catch (error) {
                toast.error("Failed to delete");
            }
        }
    };

    const handleRename = async () => {
        if (!editingId || !editTitle.trim()) return;
        try {
            await updateMindmap(editingId, { title: editTitle });
            setEditingId(null);
            toast.success("Renamed successfully");
        } catch (error) {
            toast.error("Failed to rename");
        }
    };

    const openRename = (e: React.MouseEvent, m: Mindmap) => {
        e.stopPropagation();
        setEditingId(m.id);
        setEditTitle(m.title);
    };

    const getDisplayName = () => {
        if (!user || !user.displayName) return "User";
        // Get first name
        return user.displayName.split(" ").pop() || user.displayName;
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
    }

    return (
        <div className="min-h-full space-y-12 pb-10">
            {/* Hero Section */}
            <div className="flex flex-col items-center justify-center pt-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground/90 max-w-4xl leading-tight">
                    {t("mindmap_welcome_1")} <span className="text-primary">{getDisplayName()}</span>, {t("mindmap_welcome_2").split(" ").slice(0, 3).join(" ")} <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary/80">
                        {t("mindmap_welcome_2").split(" ").slice(3).join(" ")}
                    </span>
                </h1>

                {/* Search Bar */}
                <div className="w-full max-w-3xl relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-2 shadow-lg ring-1 ring-white/5">
                        <Search className="ml-4 h-5 w-5 text-muted-foreground shrink-0" />
                        <Input
                            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-lg h-12 placeholder:text-muted-foreground/50"
                            placeholder={t("mindmap_search_placeholder")}
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateAI()}
                        />

                        <div className="flex items-center gap-2 shrink-0">
                            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => setIsCreateOpen(true)}>
                                <Plus className="h-4 w-4" />
                                {t("draw_manually")}
                            </Button>
                            <Button
                                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all"
                                onClick={handleCreateAI}
                                disabled={!aiPrompt.trim() || isAiCreating}
                            >
                                {isAiCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                {t("create_ai")}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Mindmaps */}
            <div className="space-y-6 max-w-6xl mx-auto px-4">
                <h2 className="text-lg font-semibold text-muted-foreground/80 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {t("recent_mindmaps")}
                </h2>

                {mindmaps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/50 rounded-2xl bg-muted/5">
                        <div className="p-4 rounded-full bg-primary/10 mb-4 animate-pulse">
                            <Network className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium">No mindmaps yet</h3>
                        <p className="text-muted-foreground mt-2 mb-6">Start your first brainstorming session.</p>
                        <Button onClick={() => setIsCreateOpen(true)}>Create New</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mindmaps.slice(0, 6).map((map, i) => (
                            <div
                                key={map.id}
                                onClick={() => router.push(`/dashboard/mindmap/${map.id}`)}
                                className="group relative aspect-[16/10] bg-card/50 hover:bg-card border border-border/50 hover:border-primary/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
                            >
                                {/* Gradient Placeholder implementation of preview */}
                                <div className={cn(
                                    "absolute inset-0 opacity-30 transition-opacity bg-gradient-to-br",
                                    // Generate different gradients based on index
                                    i % 3 === 0 ? "from-blue-500/20 via-transparent to-purple-500/20" :
                                        i % 3 === 1 ? "from-emerald-500/20 via-transparent to-teal-500/20" :
                                            "from-orange-500/20 via-transparent to-rose-500/20"
                                )}>
                                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
                                    {/* Mock nodes visual */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 border border-primary/20 rounded-lg flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-primary/40 shadow-[0_0_10px_currentColor]" />
                                    </div>
                                </div>

                                {/* Content Overlay */}
                                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-background via-background/90 to-transparent pt-12">
                                    <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-primary transition-colors">{map.title}</h3>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {t("edited")} {map.updatedAt ? formatDistanceToNow(map.updatedAt.toDate(), { addSuffix: true, locale: language === 'vi' ? vi : enUS }) : 'Just now'}
                                        </p>

                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => openRename(e, map)}>
                                                        <Edit2 className="h-3 w-3 mr-2" /> Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => handleDelete(map.id, e)} className="text-destructive">
                                                        <Trash2 className="h-3 w-3 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("draw_manually")}</DialogTitle>
                        <DialogDescription>Give your mindmap a name to get started.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="e.g. Project Brainstorm"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating}>
                            {isCreating ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Mindmap</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRename()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={!editTitle.trim()}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
