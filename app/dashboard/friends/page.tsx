"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    subscribeToFriendships,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    type Friendship,
    subscribeToChats,
    type Chat,
    createOrGetChat
} from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/auth";
import {
    Search,
    UserPlus,
    Users,
    UserCircle,
    MessageSquare,
    Phone,
    Video,
    MoreVertical,
    Check,
    X,
    Ghost,
    MessageCircle,
    Send
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChatWindow } from "@/components/dashboard/chat/chat-window";
import { Loader2 } from "lucide-react";

// Types for internal state
type ViewState = "friends" | "requests" | "find";

export default function FriendsPage() {
    const router = useRouter();
    // Data State
    const [friendships, setFriendships] = useState<Friendship[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isLoadingChat, setIsLoadingChat] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<ViewState>("friends");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Derived Data
    const friends = friendships.filter(f => f.status === 'accepted');
    const incomingRequests = friendships.filter(f => f.status === 'pending' && f.recipientId === currentUser?.uid);
    const outgoingRequests = friendships.filter(f => f.status === 'pending' && f.requesterId === currentUser?.uid);

    useEffect(() => {
        const checkAuth = async () => {
            const user = auth.currentUser;
            if (user) setCurrentUser(user);
        };
        checkAuth();

        const unsubFriendships = subscribeToFriendships((data) => {
            setFriendships(data);
        });

        const unsubChats = subscribeToChats((data) => {
            setChats(data);
        });

        return () => {
            unsubFriendships();
            unsubChats();
        };
    }, []);

    // Search Logic
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        const results = await searchUsers(searchQuery);
        // Filter out self
        const filtered = results.filter((u: any) => u.id !== currentUser?.uid);
        setSearchResults(filtered);
    };

    // Actions
    const handleSendRequest = async (userId: string) => {
        await sendFriendRequest(userId);
        setSearchResults(prev => prev.filter(u => u.id !== userId));
        toast.success("Friend request sent!");
    };

    const handleAccept = async (id: string) => {
        await acceptFriendRequest(id);
        toast.success("Friend request accepted");
    };

    const handleReject = async (id: string) => {
        await rejectFriendRequest(id);
        toast.success("Friend request rejected");
    };

    // Selection Logic
    const handleSelectUser = async (userId: string) => {
        setSelectedUserId(userId);
        setActiveChatId(null); // Reset chat

        // Only load chat if we are in friends tab or it's a confirmed friend
        const isFriend = friendships.some(f => f.status === 'accepted' && (f.recipientId === userId || f.requesterId === userId));

        if (isFriend || activeTab === 'friends') {
            setIsLoadingChat(true);
            try {
                const id = await createOrGetChat(userId);
                setActiveChatId(id);
            } catch (error) {
                console.error("Failed to load chat", error);
                toast.error("Could not load chat");
            } finally {
                setIsLoadingChat(false);
            }
        }
    };

    const handleMessageUser = async (userId: string) => {
        try {
            const chatId = await createOrGetChat(userId);
            router.push(`/dashboard/chat?id=${chatId}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to start chat");
        }
    };

    // Helper to get selected user data based on context
    const getSelectedUserData = () => {
        if (!selectedUserId) return null;

        if (activeTab === 'friends') {
            const friendship = friends.find(f => f.friend.id === selectedUserId);
            return friendship?.friend;
        }
        if (activeTab === 'requests') {
            const req = incomingRequests.find(r => r.friend.id === selectedUserId) || outgoingRequests.find(r => r.friend.id === selectedUserId);
            return req?.friend;
        }
        if (activeTab === 'find') {
            return searchResults.find(u => u.id === selectedUserId);
        }
        return null;
    };

    const selectedUser = getSelectedUserData();
    const isFriend = friends.some(f => f.friend.id === selectedUserId);
    const isPending = incomingRequests.some(r => r.friend.id === selectedUserId) || outgoingRequests.some(r => r.friend.id === selectedUserId);


    return (
        <div className="flex h-full overflow-hidden bg-white dark:bg-slate-950 border rounded-lg border-slate-200 dark:border-slate-800">
            {/* --- LEFT COLUMN: NAVIGATION & LIST (30%) --- */}
            <div className={cn(
                "w-full md:w-[30%] min-w-[260px] max-w-[320px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50",
                selectedUser ? "hidden md:flex" : "flex"
            )}>
                {/* Header Section */}
                <div className="p-3 space-y-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Connections</h2>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                            <UserPlus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Compact Tabs */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                            onClick={() => { setActiveTab('friends'); setSelectedUserId(null); }}
                            className={cn(
                                "flex-1 text-xs font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-2",
                                activeTab === 'friends' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Friends
                        </button>
                        <button
                            onClick={() => { setActiveTab('requests'); setSelectedUserId(null); }}
                            className={cn(
                                "flex-1 text-xs font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-2 relative",
                                activeTab === 'requests' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Requests
                            {incomingRequests.length > 0 && (
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 absolute top-1 right-2" />
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('find'); setSelectedUserId(null); }}
                            className={cn(
                                "flex-1 text-xs font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-2",
                                activeTab === 'find' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Find
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder={activeTab === 'find' ? "Search..." : "Filter..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="pl-8 h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                    </div>
                </div>

                {/* List Section */}
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {/* --- FRIENDS LIST --- */}
                        {activeTab === 'friends' && (
                            friends.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <p className="text-xs">No friends yet</p>
                                </div>
                            ) : (
                                friends.filter(f => f.friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase())).map(f => {
                                    const chat = chats.find(c => c.participants.includes(f.friend.id) && c.participants.includes(currentUser?.uid));
                                    const unreadCount = chat?.unreadCount?.[currentUser?.uid] || 0;
                                    const lastMessage = chat?.lastMessage || f.friend.email;

                                    return (
                                        <div
                                            key={f.id}
                                            onClick={() => handleSelectUser(f.friend.id)}
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                                selectedUserId === f.friend.id ? "bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-200 dark:ring-indigo-800" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                                            )}
                                        >
                                            <div className="relative shrink-0">
                                                <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-800">
                                                    <AvatarImage src={f.friend.photoURL} />
                                                    <AvatarFallback className="text-xs">{f.friend.displayName?.[0] || "?"}</AvatarFallback>
                                                </Avatar>
                                                {/* Online Status Mock */}
                                                {/* <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" /> */}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h3 className={cn(
                                                        "font-semibold text-sm truncate",
                                                        unreadCount > 0 ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                                                    )}>
                                                        {f.friend.displayName || "Unknown User"}
                                                    </h3>
                                                    {unreadCount > 0 && (
                                                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                                    )}
                                                </div>
                                                <p className={cn(
                                                    "text-xs truncate max-w-[180px]",
                                                    unreadCount > 0 ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500"
                                                )}>
                                                    {lastMessage}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        )}

                        {/* --- REQUESTS LIST --- */}
                        {activeTab === 'requests' && (
                            <>
                                {incomingRequests.length > 0 && (
                                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Incoming</div>
                                )}
                                {incomingRequests.map(req => (
                                    <div
                                        key={req.id}
                                        onClick={() => handleSelectUser(req.friend.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                            selectedUserId === req.friend.id ? "bg-indigo-50 dark:bg-indigo-900/30" : "hover:bg-slate-50"
                                        )}
                                    >
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={req.friend.photoURL} />
                                            <AvatarFallback>{req.friend.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-sm">{req.friend.displayName}</h3>
                                            <p className="text-xs text-indigo-600 font-medium">Sent a request</p>
                                        </div>
                                    </div>
                                ))}

                                {outgoingRequests.length > 0 && (
                                    <div className="px-2 py-1 mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sent</div>
                                )}
                                {outgoingRequests.map(req => (
                                    <div key={req.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={req.friend.photoURL} />
                                            <AvatarFallback>{req.friend.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-semibold text-sm">{req.friend.displayName}</h3>
                                            <p className="text-xs text-slate-500">Pending...</p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}


                        {/* --- FIND LIST --- */}
                        {activeTab === 'find' && (
                            searchResults.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => handleSelectUser(user.id)}
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                        selectedUserId === user.id ? "bg-indigo-50 dark:bg-indigo-900/30" : "hover:bg-slate-50"
                                    )}
                                >
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={user.photoURL} />
                                        <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold text-sm">{user.displayName}</h3>
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>


            {/* --- RIGHT COLUMN: MAIN CONTENT (70%) --- */}
            <div className={cn(
                "flex-1 bg-white dark:bg-slate-950 flex flex-col relative",
                !selectedUser ? "hidden md:flex" : "flex"
            )}>

                {/* CASE A: No Selection (Empty State) */}
                {!selectedUser && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                        <div className="h-32 w-32 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                            <MessageCircle className="h-16 w-16 text-slate-200 dark:text-slate-800" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Select a conversation</h3>
                        <p className="max-w-xs mx-auto">Choose a friend from the list or search for someone new to start chatting.</p>
                    </div>
                )}


                {/* CASE B: Selected Friend (Profile + Message Action) */}
                {/* CASE B: Selected Friend (Chat Interface) */}
                {selectedUser && activeTab === 'friends' && (
                    <>
                        {isLoadingChat ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p className="text-sm">Loading chat...</p>
                            </div>
                        ) : activeChatId ? (
                            <ChatWindow
                                chatId={activeChatId}
                                currentUser={currentUser}
                                onBack={() => setSelectedUserId(null)}
                                className="h-full border-none rounded-none bg-transparent"
                            />
                        ) : (
                            // Fallback if chat fails to load but user is selected
                            <div className="flex-1 flex items-center justify-center">
                                <p>Select a friend to start chatting</p>
                            </div>
                        )}
                    </>
                )}


                {/* CASE C: Selected Non-Friend (Profile Preview) */}
                {selectedUser && activeTab !== 'friends' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/30 relative">
                        {/* Mobile Back Button for Profile Preview */}
                        <div className="absolute top-4 left-4 md:hidden">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedUserId(null)}>
                                <MoreVertical className="h-5 w-5 rotate-90" />
                            </Button>
                        </div>

                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                            {/* Cover */}
                            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

                            {/* Avatar & Info */}
                            <div className="px-8 pb-8 text-center -mt-16">
                                <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-900 shadow-xl mx-auto">
                                    <AvatarImage src={selectedUser.photoURL} />
                                    <AvatarFallback className="text-4xl">{selectedUser.displayName?.[0]}</AvatarFallback>
                                </Avatar>

                                <h2 className="text-2xl font-bold mt-4 text-slate-900 dark:text-white">{selectedUser.displayName}</h2>
                                <p className="text-slate-500 font-medium">Product Designer</p>

                                <div className="flex justify-center gap-6 mt-6 py-6 border-t border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <div className="font-bold text-lg">125</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Friends</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">12</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Groups</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">8</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Common</div>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3 justify-center">
                                    {activeTab === 'requests' ? (
                                        <>
                                            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => {
                                                const req = incomingRequests.find(r => r.friend.id === selectedUser.id);
                                                if (req) handleAccept(req.id);
                                            }}>
                                                <Check className="h-4 w-4 mr-2" /> Accept
                                            </Button>
                                            <Button variant="outline" className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => {
                                                const req = incomingRequests.find(r => r.friend.id === selectedUser.id);
                                                if (req) handleReject(req.id);
                                            }}>
                                                <X className="h-4 w-4 mr-2" /> Decline
                                            </Button>
                                        </>
                                    ) : (
                                        <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={() => handleSendRequest(selectedUser.id)}>
                                            <UserPlus className="h-4 w-4 mr-2" /> Add Friend
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
