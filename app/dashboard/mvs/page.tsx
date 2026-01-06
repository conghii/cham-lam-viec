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
    GripVertical,
    Target
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
            toast.success("MVS North Star updated!");
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
        setEditStrategies(editStrategies.filter(s => s.id !== id));
        toast.info("Strategy removed (Save to apply)");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
        );
    }

    const canEdit = userRole === 'owner' || userRole === 'member';

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Top Toolbar */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Organization DNA</span>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">The North Star</h1>
                </div>
                {canEdit && (
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving} className="text-slate-500 hover:text-slate-900">
                                    <X className="h-4 w-4 mr-2" /> Cancel
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white hover:bg-slate-800 shadow-md">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </>
                        ) : (
                            <Button size="sm" variant="outline" onClick={handleEdit} className="hover:bg-slate-100 border-dashed border-slate-300">
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit MVS
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="max-w-5xl mx-auto px-6 py-10 space-y-16">

                {/* HERO SECTION: MISSION */}
                <section className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-white rounded-3xl blur-3xl -z-10" />
                    <div className={cn(
                        "relative rounded-3xl p-8 md:p-12 transition-all duration-300 border border-white/50 shadow-sm",
                        isEditing ? "bg-white/80 ring-2 ring-indigo-500/20" : "bg-white/60 backdrop-blur-sm"
                    )}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <Rocket className="h-6 w-6" />
                            </div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-600">Our Mission</h2>
                        </div>

                        {isEditing ? (
                            <Textarea
                                value={editMission}
                                onChange={(e) => setEditMission(e.target.value)}
                                placeholder="State your core purpose..."
                                className="text-3xl md:text-5xl font-black tracking-tight leading-tight min-h-[140px] bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-slate-300 resize-none"
                            />
                        ) : (
                            <h2 className={cn(
                                "text-3xl md:text-5xl font-black tracking-tight leading-tight text-slate-900",
                                !mvs?.mission && "text-slate-300 italic"
                            )}>
                                {mvs?.mission || "What is your reason for being?"}
                            </h2>
                        )}

                        <p className="mt-6 text-slate-500 max-w-2xl font-medium">
                            This is our "Why". It guides every decision we make.
                        </p>
                    </div>
                </section>

                {/* VISION SECTION */}
                <section className="relative md:pl-20">
                    {/* Connecting Line */}
                    <div className="absolute left-8 md:left-[3.5rem] top-[-4rem] h-24 w-0.5 bg-gradient-to-b from-indigo-200 to-cyan-200 -z-10 hidden md:block" />

                    <div className={cn(
                        "relative rounded-3xl p-8 transition-all duration-300 border border-slate-100",
                        isEditing ? "bg-white ring-2 ring-cyan-500/20" : "bg-gradient-to-br from-white to-cyan-50/30 hover:shadow-md"
                    )}>
                        <div className="flex items-start gap-6">
                            <div className="h-10 w-10 shrink-0 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                                <Telescope className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-600 mb-3">Our Vision</h3>
                                {isEditing ? (
                                    <Textarea
                                        value={editVision}
                                        onChange={(e) => setEditVision(e.target.value)}
                                        placeholder="Where are we going?"
                                        className="text-xl md:text-2xl font-medium leading-relaxed min-h-[100px] bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-slate-300 resize-none"
                                    />
                                ) : (
                                    <p className={cn(
                                        "text-xl md:text-2xl font-medium leading-relaxed text-slate-700",
                                        !mvs?.vision && "text-slate-300 italic"
                                    )}>
                                        {mvs?.vision || "Paint a picture of the future we are building."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* STRATEGIES SECTION */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-slate-200 flex-1" />
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Core Strategies</span>
                        <div className="h-px bg-slate-200 flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {(isEditing ? editStrategies : (mvs?.strategies || [])).map((strategy, index) => (
                                <motion.div
                                    key={strategy.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                >
                                    <div className={cn(
                                        "relative h-full rounded-2xl p-6 border transition-all duration-300 flex flex-col group",
                                        isEditing ? "bg-white border-dashed border-slate-300" : "bg-white border-slate-100 hover:shadow-lg hover:-translate-y-1 shadow-sm"
                                    )}>
                                        {isEditing && (
                                            <button
                                                onClick={() => removeStrategy(strategy.id)}
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-rose-600 hover:text-white"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}

                                        <div className="mb-4 flex items-center justify-between">
                                            <div className="text-4xl font-black text-slate-100 select-none">
                                                0{index + 1}
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                <Target className="h-4 w-4" />
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <>
                                                <Input
                                                    value={strategy.title}
                                                    onChange={(e) => updateStrategy(strategy.id, 'title', e.target.value)}
                                                    placeholder="Strategy Title"
                                                    className="font-bold text-lg border-none px-0 focus-visible:ring-0 p-0 h-auto"
                                                />
                                                <Textarea
                                                    value={strategy.description}
                                                    onChange={(e) => updateStrategy(strategy.id, 'description', e.target.value)}
                                                    placeholder="Brief description..."
                                                    className="mt-2 text-sm text-slate-500 border-none px-0 focus-visible:ring-0 min-h-[80px] resize-none"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="font-bold text-lg text-slate-800 mb-2">
                                                    {strategy.title || "Untitled"}
                                                </h3>
                                                <p className="text-sm text-slate-500 leading-relaxed">
                                                    {strategy.description || "No description provided."}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Add Button */}
                            {isEditing && (
                                <motion.button
                                    layout
                                    onClick={addStrategy}
                                    className="h-full min-h-[200px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-100 transition-all"
                                >
                                    <Plus className="h-8 w-8" />
                                    <span className="font-medium text-sm">Add Strategy</span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* Empty State (Read Mode) */}
                {!isEditing && (!mvs?.mission && !mvs?.vision && (!mvs?.strategies || mvs.strategies.length === 0)) && (
                    <div className="text-center py-20">
                        <div className="h-16 w-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Rocket className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">Set your North Star</h3>
                        <p className="text-slate-500 max-w-md mx-auto mt-2 mb-6">
                            Define your mission, vision, and core strategies to align your team and drive execution.
                        </p>
                        {canEdit && (
                            <Button onClick={handleEdit}>
                                Start Defining MVS
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
