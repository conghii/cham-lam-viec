"use client"

import { useState, useEffect, useRef } from "react"
import { PlannerTimeline, Phase } from "@/components/planner/planner-timeline"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { savePlan, subscribeToPlans, deletePlan, type SavedPlan, type PlanPhase } from "@/lib/firebase/firestore"
import { Button } from "@/components/ui/button"
import { Trash2, History, Wand2, Sparkles, MoveRight, Calendar as CalendarIcon, Clock, Target, Send, Bot, User } from "lucide-react"
import { PlanDetailsDialog } from "@/components/planner/plan-details-dialog"
import { DeepDiveFlow, type DeepDiveData } from "@/components/planner/deep-dive-flow"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { format, addMonths } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
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

export default function PlannerPage() {
    const [isGenerating, setIsGenerating] = useState(false)
    const [plan, setPlan] = useState<Phase[] | null>(null)
    const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([])
    const [selectedPlan, setSelectedPlan] = useState<SavedPlan | null>(null)

    // Deep Dive State
    const [isDeepDive, setIsDeepDive] = useState(false)
    const [deepDiveData, setDeepDiveData] = useState<DeepDiveData | null>(null)

    // Suggestion State
    const [goalInput, setGoalInput] = useState("")
    const [dateInput, setDateInput] = useState<Date | undefined>(addMonths(new Date(), 2))
    const [hoursInput, setHoursInput] = useState("2")

    // Interview State
    const [isInterviewing, setIsInterviewing] = useState(false)
    const [chatHistory, setChatHistory] = useState<Message[]>([])
    const [chatInput, setChatInput] = useState("")
    const [questionCount, setQuestionCount] = useState(0)
    const [isChatLoading, setIsChatLoading] = useState(false)
    const scrollAreaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const unsubscribe = subscribeToPlans((data) => {
            setSavedPlans(data)
        })
        return () => unsubscribe()
    }, [])

    // Auto-scroll chat
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [chatHistory, isChatLoading])

    const startInterview = async () => {
        if (!goalInput.trim()) {
            toast.error("Please enter a goal")
            return
        }
        setIsInterviewing(true)
        setQuestionCount(1)
        setIsChatLoading(true)

        // Initial question
        try {
            const response = await fetch("/api/ai/planner-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goal: goalInput,
                    history: [],
                    questionCount: 1
                })
            })
            const data = await response.json()
            if (data.message) {
                setChatHistory([{ role: "assistant", content: data.message }])
            } else {
                setChatHistory([{ role: "assistant", content: "I'm ready to help. What is your main goal?" }])
            }
        } catch (error) {
            toast.error("Failed to start interview")
            setIsInterviewing(false) // Fallback handled?
        } finally {
            setIsChatLoading(false)
        }
    }

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return

        const newUserMsg: Message = { role: "user", content: chatInput }
        setChatHistory(prev => [...prev, newUserMsg])
        setChatInput("")
        setIsChatLoading(true)

        // Check if we should generate plan now (after 10 questions)
        if (questionCount >= 10) {
            await handleGenerateWithContext([...chatHistory, newUserMsg])
            return
        }

        // Get next question
        try {
            const nextCount = questionCount + 1
            setQuestionCount(nextCount)

            const response = await fetch("/api/ai/planner-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goal: goalInput,
                    history: [...chatHistory, newUserMsg],
                    questionCount: nextCount
                })
            })
            const data = await response.json()
            if (data.message) {
                setChatHistory(prev => [...prev, { role: "assistant", content: data.message }])
            } else {
                // Fallback for empty/error response locally if API returns generic error
                setChatHistory(prev => [...prev, { role: "assistant", content: "I'm having trouble thinking right now. Could you clarify?" }])
            }
        } catch (error) {
            console.error("Chat error", error)
        } finally {
            setIsChatLoading(false)
        }
    }

    const handleGenerateWithContext = async (finalHistory: Message[]) => {
        setIsGenerating(true)
        setIsInterviewing(false) // Close chat UI, show generation loading
        try {
            const context = finalHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")

            const response = await fetch("/api/ai/generate-goal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goal: goalInput,
                    deadline: dateInput ? format(dateInput, 'yyyy-MM-dd') : "As soon as possible",
                    hoursPerDay: parseInt(hoursInput) || 2,
                    interviewContext: context,
                    deepDiveData: deepDiveData // Pass this to the API
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.details || "Failed to generate plan");
            }

            const result = await response.json()

            // Map API response to Phase format
            const generatedPlan: Phase[] = result.phases.map((p: any, index: number) => ({
                id: index + 1,
                title: p.title,
                duration: p.duration,
                tasks: p.tasks
            }))

            setPlan(generatedPlan)
        } catch (error: any) {
            console.error("Generation failed", error)
            toast.error(error.message || "Failed to generate plan. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCommit = async () => {
        if (!plan) return
        try {
            await savePlan(goalInput || "New Plan", plan as PlanPhase[])
            setPlan(null)
            setGoalInput("")
            setChatHistory([])
            setIsInterviewing(false)
            toast.success("Plan saved successfully!")
        } catch (error) {
            console.error("Error saving plan:", error)
            toast.error("Failed to save plan.")
        }
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return ""
        return new Date(timestamp.toMillis()).toLocaleDateString()
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] -m-6 relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30 transition-colors duration-500">
            {/* Aurora Background (Light Pastel) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[120px] animate-pulse delay-1000" />
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-cyan-100/60 dark:bg-cyan-900/10 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-12 h-full flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">

                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
                        <div className="relative w-40 h-40">
                            <div className="absolute inset-0 bg-indigo-200/50 rounded-full blur-xl animate-pulse" />
                            <img
                                src="/images/ai-mascot.png"
                                alt="Generating"
                                className="relative w-full h-full object-contain animate-bounce"
                            />
                        </div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Crafting your master plan...
                        </h2>
                        <p className="text-slate-500 max-w-md text-center">
                            Analyzing your responses and building a perfect roadmap.
                        </p>
                    </div>
                ) : !plan ? (
                    <div className="grid lg:grid-cols-2 gap-12 w-full items-center">
                        {/* Left: Intro & Visuals */}
                        <div className="space-y-8 text-center lg:text-left">
                            <div className="space-y-4">
                                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-slate-900 dark:text-white pb-2">
                                    Dream Big.<br /> <span className="text-indigo-600 dark:text-indigo-400">Plan Smart.</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-light max-w-lg mx-auto lg:mx-0 leading-relaxed">
                                    Turn vague goals into actionable roadmaps. Our AI will guide you through a deep-dive interview to build the perfect plan.
                                </p>
                            </div>

                            {/* 3D Visual */}
                            <div className="relative w-64 h-64 mx-auto lg:mx-0 hidden md:block">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-200/50 to-purple-200/50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full blur-3xl animate-pulse" />
                                <img
                                    src="/images/ai-mascot.png"
                                    alt="AI Assistant"
                                    className="relative w-full h-full object-contain drop-shadow-xl animate-in slide-in-from-bottom-8 duration-1000"
                                    style={{ filter: "drop-shadow(0 0 20px rgba(99, 102, 241, 0.2))" }}
                                />
                            </div>

                            {/* Saved Plans Teaser */}
                            {savedPlans.length > 0 && (
                                <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4 justify-center lg:justify-start">
                                        <History className="h-4 w-4" /> Recent Plans
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 justify-center lg:justify-start snap-x">
                                        {savedPlans.slice(0, 3).map(saved => (
                                            <div
                                                key={saved.id}
                                                onClick={() => setSelectedPlan(saved)}
                                                className="shrink-0 w-48 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all cursor-pointer snap-start"
                                            >
                                                <p className="font-medium text-sm truncate text-slate-700 dark:text-slate-300">{saved.title}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{formatDate(saved.createdAt)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Conversational UI Form */}
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-3xl p-8 md:p-10 shadow-2xl shadow-indigo-100/50 dark:shadow-none">
                                <div className="space-y-8">
                                    <div className="space-y-6">
                                        <p className="text-2xl md:text-3xl font-light leading-relaxed text-slate-600 dark:text-slate-400">
                                            I want to{" "}
                                            <span className="relative inline-block min-w-[200px]">
                                                <input
                                                    type="text"
                                                    placeholder="learn React Native..."
                                                    value={goalInput}
                                                    onChange={e => setGoalInput(e.target.value)}
                                                    className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium transition-colors pb-1 text-center md:text-left"
                                                />
                                            </span>
                                            {" "}by{" "}
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button className={cn(
                                                        "inline-flex items-center border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-slate-900 dark:text-white font-medium pb-1 min-w-[140px] justify-center md:justify-start hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors",
                                                        !dateInput && "text-slate-400"
                                                    )}>
                                                        {dateInput ? format(dateInput, "PPP") : <span>pick a date</span>}
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
                                            , spending{" "}
                                            <span className="relative inline-block w-[60px]">
                                                <input
                                                    type="number"
                                                    value={hoursInput}
                                                    onChange={e => setHoursInput(e.target.value)}
                                                    className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-slate-900 dark:text-white font-medium transition-colors pb-1 text-center"
                                                />
                                            </span>
                                            {" "}hours/day.
                                        </p>
                                    </div>

                                    {/* Inspiration Chips */}
                                    <div className="space-y-3">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles className="h-3 w-3" /> Inspiration
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {INSPIRATION_CHIPS.map((chip) => (
                                                <button
                                                    key={chip.label}
                                                    onClick={() => {
                                                        setGoalInput(chip.goal);
                                                        setHoursInput(chip.time);
                                                    }}
                                                    className="px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                                >
                                                    {chip.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleGenerateWithContext([])}
                                        disabled={isGenerating}
                                        className="w-full h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:shadow-xl hover:shadow-indigo-300 dark:hover:shadow-indigo-800/50 transition-all transform hover:-translate-y-1 relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out" />
                                        <span className="relative flex items-center gap-3">
                                            <Wand2 className="h-6 w-6" /> Generate Magic Plan
                                        </span>
                                    </Button>

                                    <div className="flex items-center justify-center gap-3 pt-2">
                                        <Switch
                                            id="deep-dive-mode"
                                            checked={isDeepDive}
                                            onCheckedChange={setIsDeepDive}
                                        />
                                        <Label htmlFor="deep-dive-mode" className="text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                                            Enable Deep Dive Mode (Detailed Plan)
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
                                                        handleGenerateWithContext([]) // Trigger generation immediately on complete
                                                    }}
                                                    initialData={deepDiveData || {}}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <Button
                                variant="ghost"
                                onClick={() => setPlan(null)}
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <MoveRight className="h-4 w-4 mr-2 rotate-180" /> Back to Planner
                            </Button>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Your Magic Plan</h2>
                                <p className="text-sm text-slate-500">Ready to conquer {goalInput}?</p>
                            </div>
                            <div className="w-24" /> {/* Spacer */}
                        </div>
                        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-1 shadow-xl shadow-indigo-100/50 dark:shadow-none">
                            <PlannerTimeline plan={plan} onCommit={handleCommit} />
                        </div>
                    </div>
                )}
            </div>

            {/* Existing Details Dialog (Hidden logic wrapper) */}
            <PlanDetailsDialog
                plan={selectedPlan}
                open={!!selectedPlan}
                onOpenChange={(open) => !open && setSelectedPlan(null)}
            />
        </div>
    )
}
