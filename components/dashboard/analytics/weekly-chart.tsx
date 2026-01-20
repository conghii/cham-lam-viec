"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, parseISO } from "date-fns"
import { subscribeToTasks, Task } from "@/lib/firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export function WeeklyChart() {
    const [data, setData] = useState<{ day: string; count: number; date: Date }[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCompleted, setTotalCompleted] = useState(0)

    useEffect(() => {
        const { auth } = require("@/lib/firebase/auth")

        let unsubscribe: () => void = () => { }

        const init = async () => {
            const user = auth.currentUser
            if (!user) return

            unsubscribe = subscribeToTasks((tasks) => {
                const now = new Date()
                const start = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
                const end = endOfWeek(now, { weekStartsOn: 1 })

                const days = eachDayOfInterval({ start, end })

                // Filter tasks completed this week by the current user
                const weeklyCompletedTasks = tasks.filter(t => {
                    if (!t.completed || !t.completedAt) return false
                    // Check if user is owner or assignee
                    const isRelevant = t.userId === user.uid || (t.assigneeIds && t.assigneeIds.includes(user.uid)) || t.assigneeId === user.uid
                    if (!isRelevant) return false

                    const completedDate = t.completedAt.toDate()
                    return completedDate >= start && completedDate <= end
                })

                setTotalCompleted(weeklyCompletedTasks.length)

                const chartData = days.map(day => {
                    const count = weeklyCompletedTasks.filter(t =>
                        isSameDay(t.completedAt!.toDate(), day)
                    ).length
                    return {
                        day: format(day, "EEE"), // Mon, Tue, etc.
                        fullDate: format(day, "MMM d"),
                        count,
                        date: day
                    }
                })

                setData(chartData)
                setLoading(false)
            })
        }

        init()

        return () => {
            unsubscribe()
        }
    }, [])

    if (loading) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Card className="shadow-sm border-slate-100 dark:border-slate-800">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Weekly Focus</CardTitle>
                <CardDescription>
                    You completed <span className="font-bold text-primary">{totalCompleted}</span> tasks this week.
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis
                                dataKey="day"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#94a3b8' }}
                                dy={10}
                            />
                            <YAxis
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                tick={{ fill: '#94a3b8' }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload
                                        return (
                                            <div className="bg-slate-900 text-white text-xs rounded-lg py-1 px-2 shadow-xl">
                                                <div className="font-bold mb-0.5">{data.fullDate}</div>
                                                <div>Tasks: {data.count}</div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Bar
                                dataKey="count"
                                fill="currentColor"
                                radius={[4, 4, 0, 0]}
                                className="fill-indigo-500 hover:fill-indigo-600 transition-colors"
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
