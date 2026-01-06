"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase/auth"
import { Sidebar } from "@/components/shared/sidebar"
import { Header } from "@/components/shared/header"
import { BottomNav } from "@/components/shared/bottom-nav"
import { Loader2 } from "lucide-react"
import { ContentWrapper } from "@/components/dashboard/content-wrapper"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user)
                setLoading(false)
            } else {
                router.push("/login")
            }
        })

        return () => unsubscribe()
    }, [router])

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) return null



    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <ResizablePanelGroup
                direction="horizontal"
                className="hidden md:flex"
            >
                <ResizablePanel
                    defaultSize={20}
                    minSize={15}
                    maxSize={250}
                    collapsible={true}
                    collapsedSize={4}
                    className={cn(isCollapsed && "min-w-[50px] transition-all duration-300 ease-in-out")}
                    onResize={(size: any) => setIsCollapsed(size < 10)}
                >
                    <Sidebar isCollapsed={isCollapsed} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={80}>
                    <div className="flex flex-1 flex-col overflow-hidden h-full">
                        <Header />
                        <ContentWrapper>
                            {children}
                        </ContentWrapper>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Mobile Layout (No Resizable Panels) */}
            <div className="flex flex-col h-full w-full md:hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <ContentWrapper>
                        {children}
                    </ContentWrapper>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
