"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"

interface GamificationStats {
    xp: number
    level: number
    streak: number
    lastLogin: string | null
}

interface GamificationContextType {
    stats: GamificationStats
    addXP: (amount: number, reason?: string) => void
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined)

export function GamificationProvider({ children }: { children: React.ReactNode }) {
    const [stats, setStats] = useState<GamificationStats>({
        xp: 0,
        level: 1,
        streak: 0,
        lastLogin: null
    })
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem("gamification_stats")
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                // Ensure defaults if schema changes
                setStats({
                    xp: parsed.xp || 0,
                    level: parsed.level || 1,
                    streak: parsed.streak || 0,
                    lastLogin: parsed.lastLogin || null
                })
            } catch (e) {
                console.error("Failed to parse gamification stats", e)
            }
        }
        setIsLoaded(true)
    }, [])

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("gamification_stats", JSON.stringify(stats))
        }
    }, [stats, isLoaded])

    const calculateLevel = (xp: number) => {
        // Simple formula: Level 1 starts at 0. Level 2 at 100. Level 3 at 400 (if sqrt).
        // Let's make it linear-ish for early levels or standard gaming curve.
        // Level = 1 + floor(sqrt(XP / 50))
        return Math.floor(Math.sqrt(stats.xp / 50)) + 1
    }

    const addXP = (amount: number, reason?: string) => {
        setStats(prev => {
            const newXP = prev.xp + amount
            const currentLevel = Math.floor(Math.sqrt(prev.xp / 50)) + 1
            const newLevel = Math.floor(Math.sqrt(newXP / 50)) + 1

            if (newLevel > currentLevel) {
                toast.success(`Level Up! You are now Level ${newLevel}! 🎉`, {
                    description: "Keep up the great work!",
                    duration: 5000
                })
            } else if (reason) {
                toast.success(`+${amount} XP: ${reason}`)
            }

            return {
                ...prev,
                xp: newXP,
                level: newLevel
            }
        })
    }

    return (
        <GamificationContext.Provider value={{ stats, addXP }}>
            {children}
        </GamificationContext.Provider>
    )
}

export const useGamification = () => {
    const context = useContext(GamificationContext)
    if (!context) throw new Error("useGamification must be used within GamificationProvider")
    return context
}
