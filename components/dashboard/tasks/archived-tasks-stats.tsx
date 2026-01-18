"use client";

import { useMemo } from "react";
import { Task } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from "recharts";
import { subDays, format, isSameDay } from "date-fns";

interface ArchivedTasksStatsProps {
    tasks: Task[];
}

export function ArchivedTasksStats({ tasks }: ArchivedTasksStatsProps) {
    const stats = useMemo(() => {
        const total = tasks.length;
        const last7Days = tasks.filter(t => {
            if (!t.completedAt) return false;
            const date = t.completedAt && typeof t.completedAt.toDate === 'function' ? t.completedAt.toDate() : new Date(t.completedAt as any);
            return date >= subDays(new Date(), 7);
        }).length;

        // Completion Trend (Last 7 Days)
        const trendData = Array.from({ length: 7 }).map((_, i) => {
            const day = subDays(new Date(), 6 - i);
            const label = format(day, "EEE"); // Mon, Tue...
            const count = tasks.filter(t => {
                if (!t.completedAt) return false;
                const d = t.completedAt && typeof t.completedAt.toDate === 'function' ? t.completedAt.toDate() : new Date(t.completedAt as any);
                return isSameDay(d, day);
            }).length;
            return { name: label, count };
        });

        // Priority Distribution
        const pStats = { high: 0, medium: 0, low: 0 };
        tasks.forEach(t => {
            if (t.priority) {
                pStats[t.priority as keyof typeof pStats] = (pStats[t.priority as keyof typeof pStats] || 0) + 1;
            } else {
                pStats.low += 1; // Default
            }
        });
        const priorityData = [
            { name: "High", value: pStats.high, color: "#e11d48" }, // rose-600
            { name: "Medium", value: pStats.medium, color: "#d97706" }, // amber-600
            { name: "Low", value: pStats.low, color: "#64748b" }, // slate-500
        ].filter(d => d.value > 0);

        return { total, last7Days, trendData, priorityData };
    }, [tasks]);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">All time completed tasks</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.last7Days}</div>
                    <p className="text-xs text-muted-foreground">Recent completions</p>
                </CardContent>
            </Card>

            <Card className="col-span-1 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Weekly Trend</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.trendData}>
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="col-span-1 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">By Priority</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-[80px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.priorityData}
                                cx="50%"
                                cy="50%"
                                innerRadius={25}
                                outerRadius={35}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {stats.priorityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
