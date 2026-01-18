"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek, getWeek, getYear, differenceInDays } from "date-fns";
import {
    ensureWeeklyPlan,
    updateWeeklyObjective,
    updateWeeklyRetrospective,
    subscribeToWeeklyPlan,
    subscribeToWeeklyHistory,
    type WeeklyPlan,
    type WeeklyObjective,
    type WeeklyRetrospective
} from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, ChevronRight, Calendar, CheckCircle2, Plus, Trophy, AlertTriangle, Lightbulb, History, Minus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/components/shared/language-context";

// --- Components ---

function TimeNavigation({
    currentDate,
    onPrev,
    onNext,
    onToday
}: {
    currentDate: Date,
    onPrev: () => void,
    onNext: () => void,
    onToday: () => void
}) {
    const { t } = useLanguage();
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekNum = getWeek(currentDate, { weekStartsOn: 1 });
    const isCurrentWeek = isSameWeek(new Date(), currentDate, { weekStartsOn: 1 });

    // Progress Bar (Mon = 0%, Sun = 100%)
    const today = new Date();
    let progress = 0;
    if (isCurrentWeek) {
        const diff = differenceInDays(today, start);
        progress = Math.min(100, Math.max(0, ((diff + 1) / 7) * 100));
    } else if (today > end) {
        progress = 100;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 md:p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                    <Button variant="outline" size="icon" onClick={onPrev} className="shrink-0">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center px-2 md:px-4 min-w-[140px] md:min-w-[200px]">
                        <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">{t("week_label")} {weekNum}</h2>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium whitespace-nowrap">
                            {format(start, "MMM d")} - {format(end, "MMM d, yyyy")}
                        </p>
                    </div>
                    <Button variant="outline" size="icon" onClick={onNext} className="shrink-0">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Button
                    variant={isCurrentWeek ? "secondary" : "default"}
                    size="sm"
                    onClick={onToday}
                    className="w-full md:w-auto text-xs md:text-sm"
                >
                    {t("this_week_btn")}
                </Button>
            </div>

            {/* Week Progress */}
            <div className="px-1">
                <div className="flex justify-between text-[10px] md:text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">
                    <span>{t("mon")}</span>
                    <span>{t("sun")}</span>
                </div>
                <Progress value={progress} className="h-1.5 md:h-2" />
            </div>
        </div>
    );
}

function BigObjectiveCard({
    objective,
    index,
    onUpdate,
    readOnly
}: {
    objective?: WeeklyObjective,
    index: number,
    onUpdate: (data: Partial<WeeklyObjective>) => void,
    readOnly?: boolean
}) {
    const { t } = useLanguage();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            inputRef.current?.blur();
        }
    };

    const toggleComplete = (val: boolean) => {
        if (readOnly) return;
        onUpdate({
            status: val ? 'completed' : 'pending'
        });
        if (val) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    };

    const saveContent = () => {
        if (readOnly) return;
        const val = inputRef.current?.value;
        if (val && val !== objective?.content) {
            onUpdate({ content: val });
        }
    };

    const handleMetricUpdate = (key: 'target' | 'current' | 'unit', val: any) => {
        const newData = { ...objective, [key]: val };
        // Auto-complete check
        if (key === 'current' && newData.target && Number(val) >= Number(newData.target)) {
            newData.status = 'completed';
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } else if (key === 'current' && newData.status === 'completed' && Number(val) < Number(newData.target)) {
            newData.status = 'pending';
        }
        onUpdate(newData);
    }

    if (!objective || !objective.content && !readOnly) {
        // Empty State
        return (
            <Card className="h-40 md:h-48 border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer group"
                onClick={() => {
                    // Initialize empty obj
                    onUpdate({ content: "New Objective", status: 'pending' });
                }}
            >
                <Plus className="h-8 w-8 md:h-10 md:w-10 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm md:text-base">{t("set_key_result")} #{index + 1}</span>
            </Card>
        );
    }

    const isCompleted = objective.status === 'completed';
    const hasMetric = objective?.target !== undefined && objective?.target !== null;

    return (
        <Card className={cn(
            "min-h-[12rem] md:min-h-[14rem] transition-all relative overflow-hidden group flex flex-col justify-between",
            isCompleted
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : "bg-white dark:bg-slate-900 hover:shadow-md"
        )}>
            {/* Status Toggle (Top Right) */}
            <div className="absolute top-0 right-0 p-2 md:p-3 z-10">
                <button
                    disabled={readOnly}
                    onClick={() => toggleComplete(!isCompleted)}
                    className={cn(
                        "rounded-full p-1 transition-all",
                        isCompleted
                            ? "text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                            : "text-slate-200 hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                >
                    <CheckCircle2 className={cn("h-5 w-5 md:h-6 md:w-6", isCompleted ? "fill-current" : "")} />
                </button>
            </div>

            <CardContent className="h-full flex flex-col p-4 md:p-6 gap-2 md:gap-4">
                <div>
                    <div className="flex justify-between items-center mb-2 md:mb-3 pr-8">
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {t("key_results")} #{index + 1}
                        </p>

                        {!readOnly && (
                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                {!hasMetric && (
                                    <Button variant="ghost" size="sm" onClick={() => onUpdate({ target: 1, current: 0, unit: "" })} className="h-6 text-[10px] md:text-xs text-slate-400 hover:text-blue-500 p-0 hover:bg-transparent px-2">
                                        <Plus className="h-3 w-3 mr-1" /> {t("add_metric")}
                                    </Button>
                                )}
                                {hasMetric && (
                                    <Button variant="ghost" size="sm" onClick={() => onUpdate({ target: undefined, current: undefined, unit: undefined })} className="h-6 text-[10px] md:text-xs text-slate-400 hover:text-red-500 p-0 hover:bg-transparent px-2">
                                        {t("remove_metric")}
                                    </Button>
                                )}
                                {objective.status !== 'completed' && (
                                    <Button variant="ghost" size="icon" title={t("migrate_next_week")}
                                        className="h-6 w-6 text-slate-300 hover:text-slate-500 hidden md:inline-flex"
                                        onClick={() => toast.info(t("migration_feature_soon"))}
                                    >
                                        <Calendar className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <input
                        disabled={readOnly}
                        ref={inputRef}
                        defaultValue={objective.content}
                        className={cn(
                            "w-full bg-transparent border-none text-lg md:text-2xl font-bold placeholder:text-slate-300 focus:ring-0 p-0 resize-none mb-2",
                            isCompleted ? "text-emerald-800 dark:text-emerald-100 line-through decoration-emerald-500/50" : "text-slate-900 dark:text-white"
                        )}
                        placeholder="What is your main focus?"
                        onBlur={saveContent}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {/* Metric Section - Refined Layout with Unit Below */}
                {hasMetric && (
                    <div className="mt-auto pt-4 flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center gap-6 w-full group/metric">
                            {/* Minus Button */}
                            <Button
                                disabled={readOnly}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all opacity-0 group-hover/metric:opacity-100"
                                onClick={() => handleMetricUpdate('current', Math.max(0, (objective.current || 0) - 1))}
                            >
                                <Minus className="h-5 w-5" />
                            </Button>

                            {/* Centered Numbers + Unit */}
                            <div className="flex flex-col items-center justify-center -space-y-0.5">
                                <div className="flex items-baseline gap-1.5">
                                    <span className={cn(
                                        "text-4xl font-black tracking-tighter tabular-nums",
                                        (objective.current || 0) >= (objective.target || 1) ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"
                                    )}>
                                        {objective.current || 0}
                                    </span>
                                    <div className="flex items-baseline text-slate-400 gap-1">
                                        <span className="text-xl font-light">/</span>
                                        <Input
                                            type="number"
                                            className="h-7 w-10 text-center bg-transparent border-none focus:ring-0 p-0 text-lg font-bold text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors [&::-webkit-inner-spin-button]:appearance-none"
                                            value={objective.target || 0}
                                            disabled={readOnly}
                                            onChange={(e) => handleMetricUpdate('target', Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <Input
                                    className="h-5 w-auto min-w-[60px] text-center bg-transparent border-none focus:ring-0 p-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                    placeholder="UNIT"
                                    value={objective.unit || ""}
                                    disabled={readOnly}
                                    onChange={(e) => handleMetricUpdate('unit', e.target.value)}
                                />
                            </div>

                            {/* Plus Button */}
                            <Button
                                disabled={readOnly}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-95 transition-all opacity-0 group-hover/metric:opacity-100"
                                onClick={() => handleMetricUpdate('current', (objective.current || 0) + 1)}
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Subtle Progress Bar */}
                        <div className="relative h-1 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={cn("absolute top-0 left-0 h-full transition-all duration-500", isCompleted ? "bg-emerald-500 w-full" : "bg-blue-500")}
                                style={{ width: isCompleted ? '100%' : `${Math.min(100, ((objective.current || 0) / (objective.target || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RetrospectiveSection({
    data,
    onUpdate,
    readOnly
}: {
    data: WeeklyRetrospective,
    onUpdate: (key: keyof WeeklyRetrospective, val: string) => void,
    readOnly?: boolean
}) {
    const { t } = useLanguage();
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 bg-purple-500 rounded-full" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t("weekly_retrospective")}</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/50">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                            <Trophy className="h-5 w-5" /> {t("wins_of_week")}
                        </div>
                        <Textarea
                            disabled={readOnly}
                            value={data.wins}
                            onChange={(e) => onUpdate('wins', e.target.value)}
                            className="bg-white/50 dark:bg-black/20 border-transparent focus:border-amber-300 resize-none min-h-[120px]"
                            placeholder={t("wins_placeholder")}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/50">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
                            <AlertTriangle className="h-5 w-5" /> {t("challenges")}
                        </div>
                        <Textarea
                            disabled={readOnly}
                            value={data.challenges}
                            onChange={(e) => onUpdate('challenges', e.target.value)}
                            className="bg-white/50 dark:bg-black/20 border-transparent focus:border-rose-300 resize-none min-h-[120px]"
                            placeholder={t("challenges_placeholder")}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/50">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold">
                            <Lightbulb className="h-5 w-5" /> {t("lessons_learned")}
                        </div>
                        <Textarea
                            disabled={readOnly}
                            value={data.lessons}
                            onChange={(e) => onUpdate('lessons', e.target.value)}
                            className="bg-white/50 dark:bg-black/20 border-transparent focus:border-indigo-300 resize-none min-h-[120px]"
                            placeholder={t("lessons_placeholder")}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function WeeklyPulsePage() {
    const { t } = useLanguage();
    // State
    const [viewDate, setViewDate] = useState(new Date());
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<WeeklyPlan[]>([]);

    // Derived
    const weekNumber = getWeek(viewDate, { weekStartsOn: 1 });
    const year = getYear(viewDate);
    const isCurrentWeek = isSameWeek(new Date(), viewDate, { weekStartsOn: 1 });

    // Load Plan
    useEffect(() => {
        setLoading(true);
        const start = startOfWeek(viewDate, { weekStartsOn: 1 });
        const end = endOfWeek(viewDate, { weekStartsOn: 1 });

        // First ensure it exists (async) then listen
        ensureWeeklyPlan(year, weekNumber, start, end).then((p) => {
            // Subscribe for real-time updates (and to catch the ensure creation)
            const unsub = subscribeToWeeklyPlan(year, weekNumber, (updated) => {
                setPlan(updated);
                setLoading(false);
            });
            return unsub;
        });

        // Also load history for sidebar
        const unsubHistory = subscribeToWeeklyHistory(setHistory);

        return () => {
            unsubHistory();
        };
    }, [year, weekNumber]); // Re-run when date changes

    // Update Handlers
    const handleUpdateObjective = async (index: number, data: Partial<WeeklyObjective>) => {
        if (!plan) return;

        let newObjs = [...(plan.objectives || [])];
        if (!newObjs[index]) {
            newObjs[index] = { id: crypto.randomUUID(), content: "", status: 'pending' };
        }

        newObjs[index] = { ...newObjs[index], ...data };

        // Optimistic update
        setPlan({ ...plan, objectives: newObjs });

        await updateWeeklyObjective(plan.id, newObjs);
    };

    const handleUpdateRetro = async (key: keyof WeeklyRetrospective, val: string) => {
        if (!plan) return;
        const newRetro = { ...(plan.retrospective || { wins: "", challenges: "", lessons: "" }), [key]: val };
        // Optimistic
        setPlan({ ...plan, retrospective: newRetro });
    };

    // Better Retro Updater with Debounce
    // Using a ref to hold the timeout
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const saveRetroDebounced = (newRetro: WeeklyRetrospective) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (plan) updateWeeklyRetrospective(plan.id, newRetro);
        }, 1000);
    }

    // Change Handler for Retro updates (State + Debounced Save)
    const onRetroChange = (key: keyof WeeklyRetrospective, val: string) => {
        if (!plan) return;
        const newRetro = { ...(plan.retrospective || { wins: "", challenges: "", lessons: "" }), [key]: val };
        setPlan({ ...plan, retrospective: newRetro }); // Update UI immediately
        saveRetroDebounced(newRetro); // Persist later
    };


    return (
        <div className="h-full p-4 md:p-8 max-w-6xl mx-auto space-y-8 relative">
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-blue-600 border-blue-100 hover:bg-blue-50 dark:border-blue-900/50 dark:hover:bg-blue-900/20"
                    onClick={() => {
                        window.open('/dashboard/weekly-okr/widget', 'ChamLamWidget', 'width=380,height=600,menubar=no,toolbar=no,location=no,status=no');
                    }}
                >
                    <Maximize2 className="h-4 w-4" /> {t("open_widget")}
                </Button>

                {/* History Trigger (Mobile/Desktop) */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <History className="h-4 w-4" /> {t("history")}
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>{t("weekly_archive")}</SheetTitle>
                        </SheetHeader>
                        <div className="py-6 space-y-4">
                            {history.map(h => {
                                const completedCount = (h.objectives || []).filter(o => o.status === 'completed').length;
                                return (
                                    <div
                                        key={h.id}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",
                                            h.year === year && h.weekNumber === weekNumber ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" : "border-slate-200"
                                        )}
                                        onClick={() => {
                                            if (h.startDate?.toDate) setViewDate(h.startDate.toDate())
                                        }}
                                    >
                                        <div>
                                            <div className="font-bold text-sm">{t("week_label")} {h.weekNumber}, {h.year}</div>
                                            <div className="text-xs text-slate-500">
                                                {h.startDate?.toDate ? format(h.startDate.toDate(), "MMM d") : "N/A"} -
                                                {h.endDate?.toDate ? format(h.endDate.toDate(), "MMM d") : "N/A"}
                                            </div>
                                        </div>
                                        <Badge variant={completedCount === 3 ? "default" : "secondary"}>
                                            {completedCount}/3
                                        </Badge>
                                    </div>
                                )
                            })}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Time Nav */}
            <TimeNavigation
                currentDate={viewDate}
                onPrev={() => setViewDate(d => subWeeks(d, 1))}
                onNext={() => setViewDate(d => addWeeks(d, 1))}
                onToday={() => setViewDate(new Date())}
            />

            {/* Big 3 Section */}
            <div>
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" /> {t("the_big_3")}
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />)
                    ) : (
                        [0, 1, 2].map(i => (
                            <BigObjectiveCard
                                key={i}
                                index={i}
                                objective={plan?.objectives?.[i]}
                                onUpdate={(data) => handleUpdateObjective(i, data)}
                                readOnly={!isCurrentWeek && viewDate < new Date()}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Retrospective Zone */}
            <div className="pb-10">
                {!loading && plan && (
                    <RetrospectiveSection
                        data={plan.retrospective || { wins: "", challenges: "", lessons: "" }}
                        onUpdate={onRetroChange}
                        readOnly={viewDate < startOfWeek(new Date(), { weekStartsOn: 1 })}
                    />
                )}
            </div>
        </div>
    );
}
