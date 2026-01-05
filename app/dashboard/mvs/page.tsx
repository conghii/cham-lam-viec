"use client";

import { useEffect, useState, useRef } from "react";
import { auth } from "@/lib/firebase/auth";
import {
    getUserOrganization,
    subscribeToMVS,
    updateMVS,
    type MVS,
    type Strategy,
    type Organization,
    getOrganizationMembers
} from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Pencil,
    Save,
    X,
    Plus,
    Trash2,
    Rocket,
    Telescope,
    Zap,
    Loader2,
    CheckCircle2,
    GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function MVSPage() {
    const [mvs, setMvs] = useState<MVS | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer'>('member');

    // Edit state
    const [editMission, setEditMission] = useState("");
    const [editVision, setEditVision] = useState("");
    const [editStrategies, setEditStrategies] = useState<Strategy[]>([]);

    useEffect(() => {
        let unsubscribeMVS: (() => void) | undefined;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const org = await getUserOrganization(user.uid);
                setCurrentOrg(org);

                if (org) {
                    // Check user role
                    const members = await getOrganizationMembers(org.id);
                    const member = members.find(m => m.id === user.uid);
                    if (member) {
                        setUserRole(member.role as any);
                    }

                    unsubscribeMVS = subscribeToMVS(org.id, (data) => {
                        setMvs(data);
                        if (data) {
                            setEditMission(data.mission);
                            setEditVision(data.vision);
                            setEditStrategies(data.strategies || []);
                        }
                        setIsLoading(false);
                    });
                } else {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeMVS) unsubscribeMVS();
        };
    }, []);

    const handleEdit = () => {
        if (mvs) {
            setEditMission(mvs.mission);
            setEditVision(mvs.vision);
            setEditStrategies(mvs.strategies || []);
        } else {
            setEditMission("");
            setEditVision("");
            setEditStrategies([]);
        }
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!currentOrg) return;
        setIsSaving(true);
        try {
            await updateMVS(currentOrg.id, {
                mission: editMission,
                vision: editVision,
                strategies: editStrategies
            });
            setIsEditing(false);
            toast.success("MVS updated successfully!");
        } catch (error) {
            console.error("Failed to save MVS:", error);
            toast.error("Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const addStrategy = () => {
        const newStrategy: Strategy = {
            id: Math.random().toString(36).substr(2, 9),
            title: "",
            description: "",
        };
        setEditStrategies([...editStrategies, newStrategy]);
    };

    const updateStrategy = (id: string, field: keyof Strategy, value: string) => {
        setEditStrategies(editStrategies.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        ));
    };

    const removeStrategy = (id: string) => {
        if (confirm("Are you sure you want to remove this strategy?")) {
            setEditStrategies(editStrategies.filter(s => s.id !== id));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
        );
    }

    const canEdit = userRole === 'owner' || userRole === 'member';

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">MVS</h1>
                    <p className="text-muted-foreground mt-2">Mission, Vision, and Strategy for your organization.</p>
                </div>
                {canEdit && (
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
                                    <X className="h-4 w-4 mr-2" /> Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={handleEdit} className="hover:bg-accent/50">
                                <Pencil className="h-4 w-4 mr-2" /> Edit MVS
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Mission & Vision Row */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Mission Card */}
                <Card className={cn(
                    "relative overflow-hidden border-border/40 transition-all duration-300",
                    isEditing ? "ring-2 ring-primary/20 bg-muted/5" : "hover:shadow-lg hover:border-primary/20 shadow-sm"
                )}>
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Rocket className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Mission</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {isEditing ? (
                            <Textarea
                                value={editMission}
                                onChange={(e) => setEditMission(e.target.value)}
                                placeholder="What is your organization's core purpose? (e.g., To accelerate the world's transition to sustainable energy)"
                                className="min-h-[160px] text-lg leading-relaxed resize-none focus-visible:ring-primary/30 border-border/50 bg-white dark:bg-slate-950"
                            />
                        ) : (
                            <p className={cn(
                                "text-lg leading-relaxed text-foreground/80 min-h-[100px] whitespace-pre-wrap",
                                !mvs?.mission && "text-muted-foreground italic font-light"
                            )}>
                                {mvs?.mission || "Define your mission to help your team stay focused on the core objective."}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Vision Card */}
                <Card className={cn(
                    "relative overflow-hidden border-border/40 transition-all duration-300",
                    isEditing ? "ring-2 ring-primary/20 bg-muted/5" : "hover:shadow-lg hover:border-primary/20 shadow-sm"
                )}>
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Telescope className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Vision</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {isEditing ? (
                            <Textarea
                                value={editVision}
                                onChange={(e) => setEditVision(e.target.value)}
                                placeholder="Where do you see the organization in 5-10 years? (e.g., To be the world's most customer-centric company)"
                                className="min-h-[160px] text-lg leading-relaxed resize-none focus-visible:ring-primary/30 border-border/50 bg-white dark:bg-slate-950"
                            />
                        ) : (
                            <p className={cn(
                                "text-lg leading-relaxed text-foreground/80 min-h-[100px] whitespace-pre-wrap",
                                !mvs?.vision && "text-muted-foreground italic font-light"
                            )}>
                                {mvs?.vision || "Set a bold vision to inspire your team for the long-term journey."}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Strategies Section */}
            <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Zap className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Core Strategies</h2>
                    </div>
                    {isEditing && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addStrategy}
                            className="text-primary border-primary/20 hover:bg-primary/5"
                        >
                            <Plus className="h-4 w-4 mr-2" /> Add Strategy
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {(isEditing ? editStrategies : (mvs?.strategies || [])).map((strategy, index) => (
                            <motion.div
                                key={strategy.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className={cn(
                                    "relative group border-border/40 h-full flex flex-col transition-all duration-300",
                                    isEditing ? "bg-muted/5 border-dashed" : "hover:scale-[1.02] hover:shadow-md hover:border-primary/30"
                                )}>
                                    {isEditing && (
                                        <button
                                            onClick={() => removeStrategy(strategy.id)}
                                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10 hover:bg-rose-600"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold border border-primary/10">
                                                {index + 1}
                                            </div>
                                            {isEditing && (
                                                <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                                            )}
                                        </div>
                                        {isEditing ? (
                                            <Input
                                                value={strategy.title}
                                                onChange={(e) => updateStrategy(strategy.id, 'title', e.target.value)}
                                                placeholder="Strategy Title"
                                                className="mt-4 font-bold border-transparent px-0 focus-visible:ring-0 bg-transparent text-lg placeholder:text-muted-foreground/40"
                                            />
                                        ) : (
                                            <CardTitle className="mt-4 text-xl">
                                                {strategy.title || "Untitled Strategy"}
                                            </CardTitle>
                                        )}
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        {isEditing ? (
                                            <Textarea
                                                value={strategy.description}
                                                onChange={(e) => updateStrategy(strategy.id, 'description', e.target.value)}
                                                placeholder="How will you achieve this strategy?"
                                                className="min-h-[100px] border-transparent px-0 focus-visible:ring-0 bg-transparent resize-none leading-relaxed placeholder:text-muted-foreground/40"
                                            />
                                        ) : (
                                            <p className={cn(
                                                "text-muted-foreground leading-relaxed",
                                                !strategy.description && "italic text-muted-foreground/50"
                                            )}>
                                                {strategy.description || "Describe your strategic approach here."}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}

                        {isEditing && editStrategies.length === 0 && (
                            <div className="col-span-full py-12 border-2 border-dashed border-muted rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
                                <Zap className="h-10 w-10 mb-4 opacity-20" />
                                <p>No strategies defined yet.</p>
                                <Button variant="link" onClick={addStrategy} className="mt-2">Add your first strategy</Button>
                            </div>
                        )}

                        {!isEditing && (!mvs?.strategies || mvs.strategies.length === 0) && (
                            <div className="col-span-full py-12 border border-border/40 rounded-2xl bg-muted/5 flex flex-col items-center justify-center text-muted-foreground">
                                <Zap className="h-10 w-10 mb-4 opacity-20" />
                                <p>No strategies defined yet.</p>
                                {canEdit && (
                                    <Button variant="link" onClick={handleEdit} className="mt-2">Start defining your strategies</Button>
                                )}
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Add Strategy Button (Visual Cue in Edit Mode) */}
                    {isEditing && (
                        <button
                            onClick={addStrategy}
                            className="group border-2 border-dashed border-muted rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all hover:border-primary/30 hover:bg-primary/5 min-h-[220px]"
                        >
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                                <Plus className="h-6 w-6" />
                            </div>
                            <span className="font-medium text-muted-foreground group-hover:text-primary transition-colors">Add New Strategy</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Empty State / Instructional State */}
            {!isLoading && !mvs && !isEditing && (
                <div className="rounded-3xl bg-primary/5 border border-primary/10 p-12 text-center max-w-2xl mx-auto mt-12">
                    <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <Rocket className="h-10 w-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-4">Master Your Vision</h2>
                    <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                        A clear mission and vision are the foundation of every successful organization.
                        Define yours today and start mapping out the strategies to get there.
                    </p>
                    {canEdit && (
                        <Button size="lg" onClick={handleEdit} className="h-14 px-8 text-lg font-semibold shadow-xl shadow-primary/20">
                            Set up MVS Profile
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
