"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Wand2, Sparkles, Send, Bot, User } from "lucide-react"
import { format, addMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/shared/language-context"
import { DeepDiveFlow, DeepDiveData } from "@/components/planner/deep-dive-flow"
import { ScrollArea } from "@/components/ui/scroll-area"

const INSPIRATION_CHIPS = [
    { label: "🏃 Run 21km", goal: "Run a half-marathon (21km)", time: "1" },
    { label: "📚 Read 10 books", goal: "Read 10 non-fiction books", time: "1" },
    { label: "💻 Learn Python", goal: "Learn Python programming basics", time: "2" },
    { label: "💰 Save 100M", goal: "Save 100 million VND", time: "4" },
    { label: "🎸 Learn Guitar", goal: "Learn to play guitar", time: "1" },
]

type Message = {
    role: "user" | "assistant"
    content: string
}

interface PlannerChatProps {
    onGenerate: (data: {
        goal: string,
        deadline: Date | undefined,
        hoursPerDay: string,
        context: string,
        deepDiveData: DeepDiveData | null
    }) => void
    isGenerating: boolean
}

export function PlannerChat({ onGenerate, isGenerating }: PlannerChatProps) {
    const { t } = useLanguage()
    const [goalInput, setGoalInput] = useState("")
    const [dateInput, setDateInput] = useState<Date | undefined>(addMonths(new Date(), 2))
    const [hoursInput, setHoursInput] = useState("2")

    // Deep Dive State
    const [isDeepDive, setIsDeepDive] = useState(false)
    const [deepDiveData, setDeepDiveData] = useState<DeepDiveData | null>(null)

    const handleGenerateClick = () => {
        if (!goalInput) return
        onGenerate({
            goal: goalInput,
            deadline: dateInput,
            hoursPerDay: hoursInput,
            context: "", // Simple flow passes empty context initially or we can add chat here later involved in the "Interview"
            deepDiveData
        })
    }

    // Note: The previous "Start Interview" logic was mixed. 
    // For this refactor, we are keeping the "Conversational UI Form" style which was the main view.
    // If we want the full chat interview, we can add it back as a mode.
    // But based on the code provided, the main view was the form on the right.

    return (
        <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-3xl p-4 md:p-10 shadow-2xl shadow-indigo-100/50 dark:shadow-none">
                <div className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-6">
                            <div className="text-lg md:text-3xl font-light leading-relaxed text-slate-600 dark:text-slate-400 flex flex-col md:block gap-4 md:gap-2">
                                <div className="inline-flex flex-col md:inline md:flex-row gap-2 md:gap-0">
                                    <span>{t("i_want_to")}{" "}</span>
                                    <input
                                        type="text"
                                        placeholder="learn React Native..."
                                        value={goalInput}
                                        onChange={e => setGoalInput(e.target.value)}
                                        className="w-full max-w-full md:w-auto md:min-w-[200px] bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium transition-colors pb-1 md:text-center text-left"
                                    />
                                </div>

                                <div className="inline-flex flex-col md:inline md:flex-row gap-2 md:gap-0 mt-4 md:mt-0">
                                    <span>{" "}{t("by_date")}{" "}</span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className={cn(
                                                "inline-flex items-center border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-slate-900 dark:text-white font-medium pb-1 w-full md:w-auto md:min-w-[140px] justify-start md:justify-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left",
                                                !dateInput && "text-slate-400"
                                            )}>
                                                {dateInput ? format(dateInput, "PPP") : <span>{t("pick_date")}</span>}
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                                            <Calendar
                                                mode="single"
                                                selected={dateInput}
                                                onSelect={setDateInput}
                                                initialFocus
                                                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="inline-flex flex-col md:inline md:flex-row gap-2 md:gap-0 mt-4 md:mt-0">
                                    <span>{", "}{t("spending")}{" "}</span>
                                    <div className="inline-flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={hoursInput}
                                            onChange={e => setHoursInput(e.target.value)}
                                            className="w-20 md:w-[60px] bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-slate-900 dark:text-white font-medium transition-colors pb-1 text-center"
                                        />
                                        <span>{" "}{t("hours_day")}.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inspiration Chips */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="h-3 w-3" /> {t("inspiration")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {INSPIRATION_CHIPS.map((chip) => (
                                <button
                                    key={chip.label}
                                    onClick={() => {
                                        setGoalInput(chip.goal);
                                        setHoursInput(chip.time);
                                    }}
                                    className="px-3 py-1 md:px-4 md:py-2 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={handleGenerateClick}
                        disabled={isGenerating || !goalInput.trim()}
                        className="w-full h-12 md:h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-base md:text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:shadow-xl hover:shadow-indigo-300 dark:hover:shadow-indigo-800/50 transition-all transform hover:-translate-y-1 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out" />
                        <span className="relative flex items-center gap-3">
                            <Wand2 className="h-6 w-6" /> {t("generate_plan")}
                        </span>
                    </Button>

                    <div className="flex items-center justify-center gap-3 pt-2">
                        <Switch
                            id="deep-dive-mode"
                            checked={isDeepDive}
                            onCheckedChange={setIsDeepDive}
                        />
                        <Label htmlFor="deep-dive-mode" className="text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                            {t("enable_deep_dive")}
                        </Label>
                    </div>

                    {/* Deep Dive Overlay */}
                    {isDeepDive && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="max-h-[90vh] overflow-y-auto w-full max-w-2xl no-scrollbar">
                                <DeepDiveFlow
                                    onCancel={() => setIsDeepDive(false)}
                                    onComplete={(data) => {
                                        setDeepDiveData(data)
                                        setIsDeepDive(false)
                                        // Auto-trigger generation
                                        onGenerate({
                                            goal: goalInput,
                                            deadline: dateInput,
                                            hoursPerDay: hoursInput,
                                            context: "",
                                            deepDiveData: data
                                        })
                                    }}
                                    initialData={deepDiveData || {}}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
