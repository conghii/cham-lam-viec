"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveDailyWins, subscribeToTodayWins } from "@/lib/firebase/firestore"

// Simple debounce
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export function ThreeWins() {
    const [wins, setWins] = useState(["", "", ""])
    const [loading, setLoading] = useState(true)

    // Load initial data
    useEffect(() => {
        const unsubscribe = subscribeToTodayWins((remoteWins) => {
            if (remoteWins && remoteWins.length > 0) {
                // Only update if we are loading or distinct change to avoid typing jitter?
                // Actually, real-time sync while typing is annoying. 
                // Let's just load ONCE or if it's external change.
                // For now, simple setWins.
                setWins(remoteWins)
            }
            setLoading(false)
        })
        return () => { if (unsubscribe) unsubscribe() }
    }, [])

    const [showSaved, setShowSaved] = useState(false)

    const handleWinChange = (index: number, value: string) => {
        const newWins = [...wins]
        newWins[index] = value
        setWins(newWins)
        setShowSaved(false)
    }

    // Manual Save
    const handleSave = async () => {
        setLoading(true)
        try {
            await saveDailyWins(wins)
            setShowSaved(true)
            setTimeout(() => setShowSaved(false), 3000)
        } catch (error) {
            console.error("Failed to save wins", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading && wins.every(w => !w)) { // Only show full loader if retrieving initial empty state
        return (
            <Card className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </Card>
        )
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium text-foreground/80">
                    3 Wins for Today
                </CardTitle>
                <div className="flex items-center gap-2">
                    {showSaved && (
                        <span className="text-xs font-medium text-green-600 flex items-center gap-1 animate-in fade-in duration-300">
                            <CheckCircle2 className="h-3 w-3" /> Saved to Profile
                        </span>
                    )}
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={loading}
                        className="h-8 px-3 text-xs"
                    >
                        {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                        Save
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
                {wins.map((win, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                            win ? "border-green-500 bg-green-500/10 text-green-500" : "border-muted text-muted-foreground"
                        )}>
                            {index + 1}
                        </div>
                        <Input
                            value={win}
                            onChange={(e) => handleWinChange(index, e.target.value)}
                            placeholder={`Win #${index + 1}`}
                            className="flex-1 border-none bg-secondary/50 shadow-none focus-visible:ring-1"
                        />
                        <CheckCircle2 className={cn(
                            "h-5 w-5 transition-all duration-300",
                            win ? "text-green-500 opacity-100 scale-100" : "text-muted opacity-0 scale-75"
                        )} />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
