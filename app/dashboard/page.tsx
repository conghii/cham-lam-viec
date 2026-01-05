import { ThreeWins } from "@/components/dashboard/three-wins"
import { GoalOverview } from "@/components/dashboard/goal-overview"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { TasksView } from "@/components/dashboard/tasks-view"

export default function DashboardPage() {
    return (
        <div className="space-y-4 pb-10">
            {/* <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
            </div> */}

            <StatsOverview />

            <div className="grid gap-8">
                {/* Main Tasks Section */}
                <div className="bg-background rounded-2xl">
                    <TasksView compact={true} className="border-t pt-6" />
                </div>

                {/* Bottom Widgets */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-2 lg:col-span-4">
                        <GoalOverview />
                    </div>
                    <div className="col-span-2 lg:col-span-3 h-full">
                        <ThreeWins />
                    </div>
                </div>
            </div>
        </div>
    )
}
