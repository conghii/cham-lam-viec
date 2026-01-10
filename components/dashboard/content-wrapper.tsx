"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isHabitPage = pathname?.includes('/habits');
    const isFocusPage = pathname?.includes('/focus');
    const isBlogPage = pathname?.includes('/blog');
    const isTeamPage = pathname?.includes('/team');
    const shouldRemovePadding = isHabitPage || isFocusPage || isBlogPage || isTeamPage;

    return (
        <div className={cn(
            "flex-1 overflow-y-auto pb-24",
            !shouldRemovePadding
        )}>
            {children}
        </div>
    );
}
