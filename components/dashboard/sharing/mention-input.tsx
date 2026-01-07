"use client"

import { useState, useRef, useEffect } from "react"
import { getOrganizationMembers, getFriends, type User, db } from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover"

interface MentionInputProps {
    value: string
    onChange: (value: string, mentions: string[]) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    onSubmit?: () => void
}

export function MentionInput({ value, onChange, placeholder, className, disabled, onSubmit }: MentionInputProps) {
    const [members, setMembers] = useState<User[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [cursorPosition, setCursorPosition] = useState(0)
    const [filterText, setFilterText] = useState("")
    const [mentions, setMentions] = useState<string[]>([]) // List of user IDs mention

    // Position for the suggestions popup
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const loadMembers = async () => {
            try {
                const currentUser = auth.currentUser
                if (!currentUser) return

                const userDoc = await getDoc(doc(db, "users", currentUser.uid))
                const orgId = userDoc.exists() ? userDoc.data().orgId : null

                // Fetch friends
                const friendsPromise = getFriends(currentUser.uid)

                // Fetch org members if orgId exists
                const orgMembersPromise = orgId ? getOrganizationMembers(orgId) : Promise.resolve([])

                const [friends, orgMembers] = await Promise.all([friendsPromise, orgMembersPromise])

                // Map org members to User type and deduplicate
                const mappedOrgMembers: User[] = (orgMembers as any[]).map(m => ({
                    uid: m.id,
                    email: m.email,
                    displayName: m.displayName,
                    photoURL: m.photoURL,
                    createdAt: m.createdAt || { seconds: 0, nanoseconds: 0 },
                    ...m
                }))

                // Merge: Friends + Org Members
                // Use Map to deduplicate by uid
                const uniqueMembers = new Map<string, User>()
                friends.forEach(f => uniqueMembers.set(f.uid, f))
                mappedOrgMembers.forEach(m => uniqueMembers.set(m.uid, m))

                // Exclude current user
                uniqueMembers.delete(currentUser.uid)

                setMembers(Array.from(uniqueMembers.values()))
            } catch (error) {
                console.error("Failed to load members for mentions", error)
            }
        }
        loadMembers()
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (showSuggestions && filteredMembers.length > 0) {
                handleSelectUser(filteredMembers[0]) // Select first on enter if open
            } else {
                onSubmit?.()
            }
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value
        const newPosition = e.target.selectionStart
        setCursorPosition(e.target.selectionStart)

        // Simple Mention Logic: check if the word before cursor starts with @
        const textBeforeCursor = newValue.substring(0, newPosition)
        const lastWord = textBeforeCursor.split(/\s/).pop()

        if (lastWord && lastWord.startsWith("@")) {
            setFilterText(lastWord.substring(1)) // Remove @
            setShowSuggestions(true)
        } else {
            setShowSuggestions(false)
        }

        onChange(newValue, mentions)
    }

    const handleSelectUser = (user: User) => {
        const textBeforeCursor = value.substring(0, cursorPosition)
        const textAfterCursor = value.substring(cursorPosition)

        const lastWordIndex = textBeforeCursor.lastIndexOf("@")
        if (lastWordIndex === -1) return

        const newTextBefore = textBeforeCursor.substring(0, lastWordIndex) + `@${user.displayName} `
        const newValue = newTextBefore + textAfterCursor

        // Add to mentions list if not already there
        if (!mentions.includes(user.uid)) {
            const newMentions = [...mentions, user.uid]
            setMentions(newMentions)
            onChange(newValue, newMentions)
        } else {
            onChange(newValue, mentions)
        }

        setShowSuggestions(false)

        // Reset cursor focus
        if (textareaRef.current) {
            textareaRef.current.focus()
            // Setting selection range needs timeout in React sometimes
            setTimeout(() => {
                textareaRef.current?.setSelectionRange(newTextBefore.length, newTextBefore.length)
            }, 0)
        }
    }

    // Filter suggestions
    const filteredMembers = members.filter(m =>
        m.displayName.toLowerCase().includes(filterText.toLowerCase())
    ).slice(0, 5) // Limit to 5 suggestions

    return (
        <Popover open={showSuggestions && filteredMembers.length > 0} onOpenChange={setShowSuggestions}>
            <PopoverAnchor asChild>
                <div className="relative w-full">
                    <Textarea
                        ref={textareaRef}
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={cn("min-h-[40px] max-h-[120px] resize-none pr-12", className)}
                        disabled={disabled}
                    />
                </div>
            </PopoverAnchor>
            <PopoverContent
                className="w-64 p-0"
                align="start"
                side="top"
                onOpenAutoFocus={(e) => e.preventDefault()} // Don't steal focus from textarea
            >
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-xs font-medium text-slate-500">Suggested People</p>
                </div>
                <ScrollArea className="max-h-[200px]">
                    <div className="p-1">
                        {filteredMembers.map(member => (
                            <button
                                key={member.uid}
                                onClick={() => handleSelectUser(member)}
                                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.photoURL} />
                                    <AvatarFallback>{member.displayName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{member.displayName}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{member.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
