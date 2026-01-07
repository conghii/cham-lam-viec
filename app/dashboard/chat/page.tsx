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
import { ChatWindow } from "@/components/dashboard/chat/chat-window";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
        const unsub = auth.onAuthStateChanged((user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
                setChats([]); // Clear chats on logout
            }
        });
        return () => unsub();
    }, []);

    // Subscribe to List of Chats
    // Subscribe to List of Chats
    useEffect(() => {
        if (!currentUser) return;
        const unsub = subscribeToChats((data) => {
            setChats(data);
        });
        return () => unsub();
    }, [currentUser]);

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
                    <ChatWindow
                        chatId={selectedChatId}
                        currentUser={currentUser}
                        onBack={() => {
                            setIsMobileListOpen(true);
                            setSelectedChatId(null);
                            window.history.pushState({}, '', '/dashboard/chat');
                        }}
                    />
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
