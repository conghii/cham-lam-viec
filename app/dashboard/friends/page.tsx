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
    MessageCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types for internal state
type ViewState = "friends" | "requests" | "find";

export default function FriendsPage() {
    // Data State
    const [friendships, setFriendships] = useState<Friendship[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

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
    const handleSelectUser = (userId: string) => {
        setSelectedUserId(userId);
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
            <div className="w-[30%] min-w-[260px] max-w-[320px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
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
                                friends.filter(f => f.friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase())).map(f => (
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
                                                <AvatarFallback className="text-xs">{f.friend.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            {/* Online Status Mock */}
                                            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{f.friend.displayName}</h3>
                                                <span className="text-[10px] text-slate-400">12:30</span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">Hey, are we still on?</p>
                                        </div>
                                    </div>
                                ))
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
            <div className="flex-1 bg-white dark:bg-slate-950 flex flex-col relative">

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


                {/* CASE B: Selected Friend (Chat Interface) */}
                {selectedUser && activeTab === 'friends' && (
                    <div className="flex flex-col h-full">
                        {/* Chat Header */}
                        <div className="h-14 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-950 z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border border-slate-200">
                                    <AvatarImage src={selectedUser.photoURL} />
                                    <AvatarFallback>{selectedUser.displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{selectedUser.displayName}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
                                        <span className="text-[10px] text-slate-500 font-medium">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                    <Phone className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                    <Video className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Chat Body (Messages) */}
                        {/* Placeholder Chat UI */}
                        <div className="flex-1 bg-slate-50/30 dark:bg-slate-900/10 p-6 overflow-y-auto space-y-4">
                            <div className="text-center text-xs text-slate-400 my-4">Today, 10:23 AM</div>

                            {/* Incoming Message */}
                            <div className="flex gap-3">
                                <Avatar className="h-8 w-8 mt-1">
                                    <AvatarImage src={selectedUser.photoURL} />
                                    <AvatarFallback>{selectedUser.displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[70%]">
                                    <p className="text-sm text-slate-700 dark:text-slate-200">Hi there! Did you get a chance to review the new design mockups I sent over?</p>
                                </div>
                            </div>

                            {/* Outgoing Message */}
                            <div className="flex gap-3 flex-row-reverse">
                                <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-sm shadow-md shadow-indigo-100 dark:shadow-none max-w-[70%]">
                                    <p className="text-sm">Hey! Yes, checking them right now. They look super clean! 🔥</p>
                                </div>
                            </div>
                        </div>

                        {/* Chat Footer (Input) */}
                        <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            <form className="flex gap-2">
                                <Input placeholder="Type a message..." className="flex-1 bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-1 focus-visible:ring-indigo-200" />
                                <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                                    </svg>
                                </Button>
                            </form>
                        </div>
                    </div>
                )}


                {/* CASE C: Selected Non-Friend (Profile Preview) */}
                {selectedUser && activeTab !== 'friends' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/30">
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
