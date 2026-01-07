import { StatsOverview } from "@/components/dashboard/stats-overview"
import { TasksView } from "@/components/dashboard/tasks-view"
import { InvitationAlert } from "@/components/dashboard/invitation-alert"

export default function DashboardPage() {
    return (
        <div className="space-y-4 pb-10">
            {/* <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
            </div> */}

            <InvitationAlert />

            <StatsOverview />

            <div className="grid gap-8">
                {/* Main Tasks Section */}
                <div className="bg-slate-50/80 dark:bg-slate-900/20 rounded-3xl p-1">
                    <TasksView compact={true} className="pt-4" />
                </div>

                {/* Bottom Widgets */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    {/* Widgets removed as per request */}
                </div>
            </div>
        </div>
    )
}
