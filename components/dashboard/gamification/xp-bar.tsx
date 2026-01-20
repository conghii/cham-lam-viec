"use client"

import { useGamification } from "@/components/providers/gamification-provider"
import { Progress } from "@/components/ui/progress"
import { Trophy } from "lucide-react"

export function XPBar() {
    const { stats } = useGamification()

    // Formula from provider: Level = floor(sqrt(XP/50)) + 1
    // => Level - 1 = floor(sqrt(XP/50))
    // Threshold for Level L: XP = 50 * (L-1)^2

    const currentLevelMinXP = 50 * Math.pow(stats.level - 1, 2)
    const nextLevelMinXP = 50 * Math.pow(stats.level, 2)
    const range = nextLevelMinXP - currentLevelMinXP
    const currentProgress = stats.xp - currentLevelMinXP

    // Safety check for range=0 (should not happen for Level >=1)
    const safeRange = range > 0 ? range : 100
    const percent = Math.min(100, Math.max(0, (currentProgress / safeRange) * 100))

    return (
        <div className="mx-2 mt-2 px-3 py-3 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl space-y-2 border border-indigo-100/50 dark:border-indigo-900/50">
            <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Trophy className="h-3.5 w-3.5" />
                    <span>Level {stats.level}</span>
                </div>
                <span className="text-muted-foreground text-[10px] tracking-wider font-mono">{Math.floor(stats.xp)} XP</span>
            </div>
            <div className="space-y-1">
                <Progress value={percent} className="h-1.5 bg-indigo-100 dark:bg-indigo-900/50" indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-600" />
                <div className="text-right text-[9px] text-muted-foreground font-medium">
                    {Math.floor(nextLevelMinXP - stats.xp)} XP to Level {stats.level + 1}
                </div>
            </div>
        </div>
    )
}
