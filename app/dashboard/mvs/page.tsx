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
import { useLanguage } from "@/components/shared/language-context";

export default function MVSPage() {
    const [mvs, setMvs] = useState<MVS | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer'>('member');
    const { t } = useLanguage();

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
            toast.success(t("mvs_updated"));
        } catch (error) {
            console.error("Failed to save MVS:", error);
            toast.error(t("save_mvs_error"));
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
        toast.info(t("remove_strategy"));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
        );
    }

    const canEdit = userRole === 'owner' || userRole === 'member';

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-transparent pb-20">
            {/* Top Toolbar */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("org_dna")}</span>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{t("mvs_title")}</h1>
                </div>
                {canEdit && (
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving} className="text-slate-500 hover:text-slate-900">
                                    <X className="h-4 w-4 mr-2" /> {t("cancel")}
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white hover:bg-slate-800 shadow-md">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    {t("save_changes")}
                                </Button>
                            </>
                        ) : (
                            <Button size="sm" variant="outline" onClick={handleEdit} className="hover:bg-slate-100 dark:hover:bg-slate-800 border-dashed border-slate-300 dark:border-slate-700 dark:text-slate-300">
                                <Pencil className="h-3.5 w-3.5 mr-2" /> {t("edit_mvs")}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto px-6 py-10 space-y-16">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {/* HERO SECTION: MISSION */}
                    <section className="relative group h-full">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-white dark:to-slate-900/50 rounded-3xl blur-3xl -z-10 opacity-50" />
                        <div className={cn(
                            "relative rounded-3xl p-8 md:p-10 transition-all duration-300 border border-white/50 dark:border-slate-800 shadow-sm h-full flex flex-col",
                            isEditing ? "bg-white/80 dark:bg-slate-900/80 ring-2 ring-indigo-500/20" : "bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm"
                        )}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                                    <Rocket className="h-6 w-6" />
                                </div>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-600">{t("our_mission")}</h2>
                            </div>

                            <div className="flex-1 flex flex-col">
                                {isEditing ? (
                                    <Textarea
                                        value={editMission}
                                        onChange={(e) => setEditMission(e.target.value)}
                                        placeholder={t("mission_placeholder")}
                                        className="text-2xl md:text-3xl font-black tracking-tight leading-tight min-h-[140px] bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-slate-300 resize-none flex-1"
                                    />
                                ) : (
                                    <h2 className={cn(
                                        "text-2xl md:text-3xl font-black tracking-tight leading-tight text-slate-900 dark:text-white flex-1",
                                        !mvs?.mission && "text-slate-300 dark:text-slate-600 italic"
                                    )}>
                                        {mvs?.mission || t("mission_fallback")}
                                    </h2>
                                )}

                                <p className="mt-8 text-slate-500 dark:text-slate-400 font-medium text-sm border-t border-slate-100 dark:border-slate-800 pt-6">
                                    {t("mission_why")}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* VISION SECTION */}
                    <section className="relative h-full">
                        <div className={cn(
                            "relative rounded-3xl p-8 md:p-10 transition-all duration-300 border border-slate-100 dark:border-slate-800 h-full flex flex-col",
                            isEditing ? "bg-white dark:bg-slate-900 ring-2 ring-cyan-500/20" : "bg-gradient-to-br from-white to-cyan-50/30 dark:from-slate-900 dark:to-cyan-950/10 hover:shadow-md"
                        )}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                                    <Telescope className="h-6 w-6" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-600">{t("our_vision")}</h3>
                            </div>

                            <div className="flex-1 flex flex-col">
                                {isEditing ? (
                                    <Textarea
                                        value={editVision}
                                        onChange={(e) => setEditVision(e.target.value)}
                                        placeholder={t("vision_placeholder")}
                                        className="text-xl md:text-2xl font-medium leading-relaxed min-h-[140px] bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-slate-300 resize-none flex-1"
                                    />
                                ) : (
                                    <p className={cn(
                                        "text-xl md:text-2xl font-medium leading-relaxed text-slate-700 dark:text-slate-200 flex-1",
                                        !mvs?.vision && "text-slate-300 dark:text-slate-600 italic"
                                    )}>
                                        {mvs?.vision || t("vision_fallback")}
                                    </p>
                                )}

                                <p className="mt-8 text-slate-400 dark:text-slate-500 font-medium text-sm border-t border-slate-100 dark:border-slate-800 pt-6 italic">
                                    {t("vision_why") || "Painting the picture of the future we are building."}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* STRATEGIES SECTION */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("core_strategies")}</span>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
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
                                        isEditing ? "bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:shadow-lg dark:hover:shadow-slate-900/50 hover:-translate-y-1 shadow-sm"
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
                                            <div className="text-4xl font-black text-slate-100 dark:text-slate-800 select-none">
                                                0{index + 1}
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                <Target className="h-4 w-4" />
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <>
                                                <Input
                                                    value={strategy.title}
                                                    onChange={(e) => updateStrategy(strategy.id, 'title', e.target.value)}
                                                    placeholder={t("strategy_title_placeholder")}
                                                    className="font-bold text-lg border-none px-0 focus-visible:ring-0 p-0 h-auto"
                                                />
                                                <Textarea
                                                    value={strategy.description}
                                                    onChange={(e) => updateStrategy(strategy.id, 'description', e.target.value)}
                                                    placeholder={t("strategy_desc_placeholder")}
                                                    className="mt-2 text-sm text-slate-500 border-none px-0 focus-visible:ring-0 min-h-[80px] resize-none"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">
                                                    {strategy.title || t("untitled_strategy")}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                                    {strategy.description || t("no_strategy_desc")}
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
                                    className="h-full min-h-[200px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                                >
                                    <Plus className="h-8 w-8" />
                                    <span className="font-medium text-sm">{t("add_strategy")}</span>
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
                        <h3 className="text-xl font-bold text-slate-700">{t("set_north_star")}</h3>
                        <p className="text-slate-500 max-w-md mx-auto mt-2 mb-6">
                            {t("mvs_desc")}
                        </p>
                        {canEdit && (
                            <Button onClick={handleEdit}>
                                {t("start_defining")}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
