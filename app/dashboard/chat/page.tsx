"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    subscribeToChats,
    subscribeToMessages,
    sendMessage,
    markChatRead,
    type Chat,
    type Message
} from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, MoreVertical, Phone, Video, Search, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

export default function ChatPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialChatId = searchParams.get("id");

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isMobileListOpen, setIsMobileListOpen] = useState(!initialChatId);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Auth Check
    useEffect(() => {
        const checkAuth = async () => {
            const user = auth.currentUser;
            if (user) setCurrentUser(user);
        };
        checkAuth();
    }, []);

    // Subscribe to List of Chats
    useEffect(() => {
        const unsub = subscribeToChats((data) => {
            setChats(data);
        });
        return () => unsub();
    }, []);

    // Subscribe to Messages when Chat Selected
    useEffect(() => {
        if (!selectedChatId) return;

        const unsub = subscribeToMessages(selectedChatId, (data) => {
            setMessages(data);
            // Scroll to bottom
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);

            // Mark as read
            markChatRead(selectedChatId);
        });

        return () => unsub();
    }, [selectedChatId]);

    // Handle Mobile View Logic
    useEffect(() => {
        if (selectedChatId) {
            setIsMobileListOpen(false);
        } else {
            setIsMobileListOpen(true);
        }
    }, [selectedChatId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChatId) return;

        await sendMessage(selectedChatId, newMessage);
        setNewMessage("");
    };

    const handleSelectChat = (chatId: string) => {
        setSelectedChatId(chatId);
        // Optimize for mobile: Update URL but don't refresh
        window.history.pushState({}, '', `/dashboard/chat?id=${chatId}`);
    };

    const currentChat = chats.find(c => c.id === selectedChatId);

    return (
        <div className="h-[calc(100vh-6rem)] overflow-hidden flex bg-background rounded-xl border shadow-sm">
            {/* --- Chat List Sidebar --- */}
            <div className={cn(
                "w-full md:w-[320px] flex flex-col border-r bg-muted/10 transition-all duration-300",
                isMobileListOpen ? "flex" : "hidden md:flex"
            )}>
                <div className="p-4 border-b h-16 flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Messages</h2>
                    {/* <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button> */}
                </div>

                {/* Search Bar (Visual Only for now) */}
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search chats..." className="pl-9 h-9 bg-background/50" />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {chats.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No conversations yet. <br />
                                <Button variant="link" className="mt-2" onClick={() => router.push('/dashboard/friends')}>
                                    Start a chat with friends
                                </Button>
                            </div>
                        ) : (
                            chats.map(chat => {
                                const otherUser = chat.otherUser;
                                const isActive = chat.id === selectedChatId;
                                const unread = chat.unreadCount?.[currentUser?.uid] || 0;

                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleSelectChat(chat.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-l-2",
                                            isActive ? "bg-background border-l-primary shadow-sm" : "border-transparent"
                                        )}
                                    >
                                        <Avatar className="h-10 w-10 border-2 border-background">
                                            <AvatarImage src={otherUser?.photoURL} />
                                            <AvatarFallback>{otherUser?.displayName?.[0] || "?"}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={cn("font-medium text-sm truncate", unread > 0 && "font-bold")}>
                                                    {otherUser?.displayName || "Unknown User"}
                                                </span>
                                                {chat.lastMessageTime && (
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        {formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: false }).replace('about ', '')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className={cn(
                                                    "text-xs truncate max-w-[180px]",
                                                    unread > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                                                )}>
                                                    {chat.lastMessage || "No messages yet"}
                                                </p>
                                                {unread > 0 && (
                                                    <span className="h-4 w-4 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full">
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* --- Chat Window --- */}
            <div className={cn(
                "flex-1 flex flex-col bg-background h-full",
                !isMobileListOpen ? "flex" : "hidden md:flex"
            )}>
                {selectedChatId ? (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur z-10">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden -ml-2"
                                    onClick={() => {
                                        setIsMobileListOpen(true);
                                        setSelectedChatId(null);
                                        window.history.pushState({}, '', '/dashboard/chat');
                                    }}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={currentChat?.otherUser?.photoURL} />
                                    <AvatarFallback>{currentChat?.otherUser?.displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-sm">{currentChat?.otherUser?.displayName}</h3>
                                    <p className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="text-muted-foreground"><Phone className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-muted-foreground"><Video className="h-4 w-4" /></Button>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                                <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-muted/5" ref={scrollRef}>
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
                                            "px-4 py-2 rounded-2xl text-sm shadow-sm relative group",
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
                        <div className="p-4 bg-background border-t">
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
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                        <div className="h-24 w-24 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                            <Send className="h-10 w-10 opacity-20" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground/80">Your Messages</h3>
                        <p className="max-w-xs text-center mt-2 text-sm">Select a conversation from the list or start a new one to begin messaging.</p>
                        <Button className="mt-6" onClick={() => router.push('/dashboard/friends')}>
                            Find Friends
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
