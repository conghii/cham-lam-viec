"use client"


import { useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Save } from "lucide-react"
import Link from "next/link"

function EditorContent() {
    const searchParams = useSearchParams()
    const initialTitle = searchParams.get("title") || ""
    const initialContent = searchParams.get("content") || ""

    const [title, setTitle] = useState(initialTitle)
    const [content, setContent] = useState(initialContent)

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-8 flex items-center justify-between">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <div className="flex gap-2">
                    <Button variant="ghost">Saved</Button>
                    <Button className="gap-2">
                        <Save className="h-4 w-4" />
                        Publish
                    </Button>
                </div>
            </header>

            <main className="space-y-6">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Post Title..."
                    className="border-none text-4xl font-bold shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50"
                />
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing..."
                    className="min-h-[500px] resize-none border-none text-lg leading-relaxed shadow-none focus-visible:ring-0 px-0 font-serif"
                />
            </main>
        </div>
    )
}

export default function EditorPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading editor...</div>}>
            <EditorContent />
        </Suspense>
    )
}

