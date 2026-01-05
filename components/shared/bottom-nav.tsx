"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, CheckSquare, Target, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
    { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
    { icon: Target, label: "Goals", href: "/dashboard/goals" },
    { icon: BookOpen, label: "Planner", href: "/planner" },
]

export function BottomNav() {
    const pathname = usePathname()

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background px-4 md:hidden">
            {navItems.map((item, index) => (
                <Link
                    key={index}
                    href={item.href}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary",
                        pathname === item.href && "text-primary"
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                </Link>
            ))}
        </div>
    )
}
