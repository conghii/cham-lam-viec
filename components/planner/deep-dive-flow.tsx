"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
    Target,
    BarChart,
    Clock,
    Brain,
    ChevronRight,
    ChevronLeft,
    Check,
    Mic,
    Paperclip,
    Plus,
    X,
    Sparkles
} from "lucide-react"

export type DeepDiveData = {
    keyResults: string[]
    domain: string
    currentLevel: "Beginner" | "Intermediate" | "Advanced" | null
    pastExperience: string
    weeklyHours: { [key: string]: number } // Simple map for now: "Mon": 2
    blockers: string[]
    brainDump: string
}

const DOMAINS = ["Technology", "Health & Fitness", "Finance", "Languages", "Arts & Creativity", "Soft Skills", "Other"]
const LEVELS = [
    { id: "Beginner", label: "Beginner", icon: "🌱", description: "Starting from scratch. No prior knowledge." },
    { id: "Intermediate", label: "Intermediate", icon: "🌿", description: "Know the basics. Ready to level up." },
    { id: "Advanced", label: "Advanced", icon: "🌳", description: "Seeking mastery and optimization." },
]
const BLOCKERS = ["Procrastination", "Busy Schedule", "Limited Budget", "Lack of Motivation", "No Clear Path", "Burnout"]

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface DeepDiveFlowProps {
    onComplete: (data: DeepDiveData) => void
    onCancel: () => void
    initialData?: Partial<DeepDiveData>
}

export function DeepDiveFlow({ onComplete, onCancel, initialData }: DeepDiveFlowProps) {
    const [step, setStep] = useState(1)
    const [data, setData] = useState<DeepDiveData>({
        keyResults: initialData?.keyResults || [""],
        domain: initialData?.domain || DOMAINS[0],
        currentLevel: initialData?.currentLevel as any || null,
        pastExperience: initialData?.pastExperience || "",
        weeklyHours: initialData?.weeklyHours || {},
        blockers: initialData?.blockers || [],
        brainDump: initialData?.brainDump || ""
    })

    const updateData = (key: keyof DeepDiveData, value: any) => {
        setData(prev => ({ ...prev, [key]: value }))
    }

    const nextStep = () => setStep(prev => prev + 1)
    const prevStep = () => setStep(prev => prev - 1)

    const handleKeyResultChange = (index: number, value: string) => {
        const newResults = [...data.keyResults]
        newResults[index] = value
        updateData("keyResults", newResults)
    }

    const addKeyResult = () => updateData("keyResults", [...data.keyResults, ""])
    const removeKeyResult = (index: number) => {
        const newResults = [...data.keyResults]
        newResults.splice(index, 1)
        updateData("keyResults", newResults)
    }

    const toggleBlocker = (blocker: string) => {
        if (data.blockers.includes(blocker)) {
            updateData("blockers", data.blockers.filter(b => b !== blocker))
        } else {
            updateData("blockers", [...data.blockers, blocker])
        }
    }

    // Simple Weekly Grid Toggle (Mocking visual functionality for complexity reduction)
    const toggleDayAvailability = (day: string) => {
        const current = data.weeklyHours[day] || 0
        // Toggle between 0 (off), 2 (evening), 5 (weekend heavy) - Simplified logic
        let next = 0
        if (current === 0) next = 2
        else if (current === 2) next = 5
        else next = 0

        updateData("weeklyHours", { ...data.weeklyHours, [day]: next })
    }

    return (
        <div className="w-full max-w-2xl mx-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            {/* Steps Indicator */}
            <div className="flex justify-between items-center mb-8 px-2">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className="flex items-center">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500",
                            step === s ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/30" :
                                step > s ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        )}>
                            {step > s ? <Check className="w-4 h-4" /> : s}
                        </div>
                        {s < 4 && (
                            <div className={cn(
                                "h-1 w-12 md:w-24 mx-2 rounded-full transition-all duration-500",
                                step > s ? "bg-green-500" : "bg-slate-200 dark:bg-slate-800"
                            )} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[300px]">
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                                <Target className="w-6 h-6 text-indigo-500" /> Defining Success
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">What specific outcomes are you aiming for?</p>
                        </div>

                        <div className="space-y-4">
                            <Label>Key Results (Measurable Outcomes)</Label>
                            {data.keyResults.map((kr, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        value={kr}
                                        onChange={(e) => handleKeyResultChange(index, e.target.value)}
                                        placeholder={`e.g. ${index === 0 ? "Build a chat app" : "Apply for Senior jobs"}`}
                                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                    {data.keyResults.length > 1 && (
                                        <Button variant="ghost" size="icon" onClick={() => removeKeyResult(index)}>
                                            <X className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addKeyResult} className="gap-2 text-indigo-500 border-dashed border-indigo-200 dark:border-indigo-900">
                                <Plus className="w-4 h-4" /> Add Key Result
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Domain / Area</Label>
                            <div className="flex flex-wrap gap-2">
                                {DOMAINS.map(d => (
                                    <button
                                        key={d}
                                        onClick={() => updateData("domain", d)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                                            data.domain === d
                                                ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                                                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                                        )}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                                <BarChart className="w-6 h-6 text-indigo-500" /> Current State
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">Where are you starting from?</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {LEVELS.map(level => (
                                <div
                                    key={level.id}
                                    onClick={() => updateData("currentLevel", level.id)}
                                    className={cn(
                                        "p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105",
                                        data.currentLevel === level.id
                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-300 dark:hover:border-indigo-700"
                                    )}
                                >
                                    <div className="text-4xl mb-2">{level.icon}</div>
                                    <div className="font-bold text-slate-900 dark:text-white">{level.label}</div>
                                    <div className="text-xs text-slate-500 mt-1">{level.description}</div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label>Past Experience / History</Label>
                            <Textarea
                                value={data.pastExperience}
                                onChange={(e) => updateData("pastExperience", e.target.value)}
                                placeholder="Have you tried learning this before? Where did you get stuck?"
                                className="min-h-[100px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                                <Clock className="w-6 h-6 text-indigo-500" /> Reality Check
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">Let's plan around your actual life.</p>
                        </div>

                        <div className="space-y-4">
                            <Label>Typical Availability (Click to toggle intensity)</Label>
                            <div className="grid grid-cols-7 gap-2">
                                {DAYS.map(day => (
                                    <div
                                        key={day}
                                        onClick={() => toggleDayAvailability(day)}
                                        className={cn(
                                            "aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border",
                                            !data.weeklyHours[day] ? "bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-400" :
                                                data.weeklyHours[day] === 2 ? "bg-indigo-200 dark:bg-indigo-900/40 border-indigo-300 text-indigo-800 dark:text-indigo-200" :
                                                    "bg-indigo-500 dark:bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                        )}
                                    >
                                        <span className="text-xs font-bold">{day}</span>
                                        <span className="text-[10px]">{data.weeklyHours[day] ? `${data.weeklyHours[day]}h` : '-'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Potential Blockers</Label>
                            <div className="flex flex-wrap gap-2">
                                {BLOCKERS.map(b => (
                                    <button
                                        key={b}
                                        onClick={() => toggleBlocker(b)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                            data.blockers.includes(b)
                                                ? "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300"
                                                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-red-300"
                                        )}
                                    >
                                        {b}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                                <Brain className="w-6 h-6 text-indigo-500" /> Brain Dump
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">Tell us anything else. Don't hold back.</p>
                        </div>

                        <div className="relative">
                            <Textarea
                                value={data.brainDump}
                                onChange={(e) => updateData("brainDump", e.target.value)}
                                placeholder="I learn best by doing... I hate reading long docs... I want to focus on mobile first..."
                                className="min-h-[200px] p-6 text-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none shadow-inner"
                            />
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 shadow-md" title="Voice Input (Coming Soon)">
                                    <Mic className="w-5 h-5 text-slate-500" />
                                </Button>
                                <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 shadow-md" title="Attach File (Coming Soon)">
                                    <Paperclip className="w-5 h-5 text-slate-500" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Actions */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <Button
                    variant="ghost"
                    onClick={step === 1 ? onCancel : prevStep}
                    className="text-slate-500 dark:text-slate-400"
                >
                    {step === 1 ? "Cancel" : "Back"}
                </Button>

                {step < 4 ? (
                    <Button
                        onClick={nextStep}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-8 rounded-full"
                    >
                        Next Step <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        onClick={() => onComplete(data)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 rounded-full shadow-lg shadow-indigo-500/25"
                    >
                        Complete & Generate Plan <Sparkles className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    )
}
