"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PartyPopper } from "lucide-react"

interface ProofOfWorkDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    taskTitle: string
    onComplete: (note: string) => void
}

export function ProofOfWorkDialog({ open, onOpenChange, taskTitle, onComplete }: ProofOfWorkDialogProps) {
    const [note, setNote] = useState("")
    const router = useRouter()

    const handleSave = () => {
        // Show confetti logic here or in parent
        onComplete(note)
        onOpenChange(false)
        setNote("")
    }

    const handleBlog = () => {
        // Redirect to blog editor
        router.push(`/blog/editor?title=${encodeURIComponent(taskTitle)}&content=${encodeURIComponent(note)}`)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PartyPopper className="h-5 w-5 text-yellow-500" />
                        What did you learn?
                    </DialogTitle>
                    <DialogDescription>
                        Capture your key takeaway from "{taskTitle}".
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="note">Key Takeaway</Label>
                        <Textarea
                            id="note"
                            placeholder="I learned that..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={handleBlog}>Write Blog Post</Button>
                    <Button onClick={handleSave}>Save & Complete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
