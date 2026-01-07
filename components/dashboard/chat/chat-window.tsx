"use client";

import { useEffect, useState, useRef } from "react";
import {
    subscribeToMessages,
    sendMessage,
    markChatRead,
    type Message
} from "@/lib/firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Send, MoreVertical, Phone, Video, ArrowLeft, User, UserMinus } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FriendProfileDialog } from "@/components/dashboard/friends/friend-profile-dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

interface ChatWindowProps {
    chatId: string;
    currentUser: any;
    onBack?: () => void;
    className?: string;
}

export function ChatWindow({ chatId, currentUser, onBack, className }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [otherUser, setOtherUser] = useState<any>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch other user info
    useEffect(() => {
        const fetchChatDetails = async () => {
            if (!chatId || !currentUser) return;

            try {
                const chatRef = doc(db, "chats", chatId);
                const chatSnap = await getDoc(chatRef);

                if (chatSnap.exists()) {
                    const data = chatSnap.data();
                    const otherUserId = data.participants.find((id: string) => id !== currentUser.uid);

                    if (otherUserId) {
                        const userRef = doc(db, "users", otherUserId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            setOtherUser({ id: userSnap.id, ...userSnap.data() });
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching chat details:", error);
            }
        };

        fetchChatDetails();
    }, [chatId, currentUser]);

    // Subscribe to messages
    useEffect(() => {
        if (!chatId) return;

        const unsub = subscribeToMessages(chatId, (data) => {
            setMessages(data);
            // Scroll to bottom
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);

            // Mark as read
            markChatRead(chatId);
        });

        return () => unsub();
    }, [chatId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId) return;

        await sendMessage(chatId, newMessage);
        setNewMessage("");
    };

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur z-10 shrink-0">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden -ml-2"
                            onClick={onBack}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={otherUser?.photoURL} />
                        <AvatarFallback>{otherUser?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold text-sm">{otherUser?.displayName || "Loading..."}</h3>
                        <p className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground"><Phone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground"><Video className="h-4 w-4" /></Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
                                <User className="h-4 w-4 mr-2" />
                                View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20 cursor-pointer"
                                onClick={() => setIsProfileOpen(true)} // Open profile to unfriend
                            >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Unfriend
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <FriendProfileDialog
                        user={otherUser}
                        isOpen={isProfileOpen}
                        onClose={() => setIsProfileOpen(false)}
                        onUnfriend={() => {
                            // Close chat or show checkmark
                            if (onBack) onBack();
                        }}
                    />
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-muted/5 scroll-smooth" ref={scrollRef}>
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUser?.uid;
                    const prevMsg = messages[index - 1];
                    const isSequence = prevMsg && prevMsg.senderId === msg.senderId && (msg.createdAt?.toMillis() - prevMsg.createdAt?.toMillis() < 60000);

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col max-w-[70%]",
                                isMe ? "ml-auto items-end" : "mr-auto items-start",
                                isSequence ? "mt-1" : "mt-4"
                            )}
                        >
                            <div className={cn(
                                "px-4 py-2 rounded-2xl text-sm shadow-sm relative group break-words",
                                isMe
                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                    : "bg-white dark:bg-muted border rounded-bl-none"
                            )}>
                                {msg.content}
                                <span className="text-[9px] opacity-0 group-hover:opacity-70 transition-opacity absolute -bottom-5 right-0 text-muted-foreground whitespace-nowrap">
                                    {msg.createdAt ? format(msg.createdAt.toDate(), "h:mm a") : "Sending..."}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                    <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 rounded-full bg-muted/30 border-muted placeholder:text-muted-foreground/70 focus-visible:ring-1"
                        autoFocus
                    />
                    <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    );
}
