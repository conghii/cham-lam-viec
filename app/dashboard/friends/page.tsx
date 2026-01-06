"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    subscribeToFriendships,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    type Friendship,
    subscribeToChats,
    type Chat
} from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/auth";
import { UserPlus, Check, X, MessageSquare, Search, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { createOrGetChat } from "@/lib/firebase/firestore";
import { toast } from "sonner";

export default function FriendsPage() {
    const [friendships, setFriendships] = useState<Friendship[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const router = useRouter();

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

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        const results = await searchUsers(searchQuery);
        // Filter out self and existing friends
        const filtered = results.filter((u: any) =>
            u.id !== currentUser?.uid &&
            !friendships.some(f =>
                (f.requesterId === u.id || f.recipientId === u.id)
            )
        );
        setSearchResults(filtered);
    };

    const handleSendRequest = async (userId: string) => {
        await sendFriendRequest(userId);
        setSearchResults(prev => prev.filter(u => u.id !== userId)); // Optimistic remove
        toast.success("Friend request sent!");
    };

    const handleMessage = async (friendId: string) => {
        try {
            const chatId = await createOrGetChat(friendId);
            router.push(`/dashboard/chat?id=${chatId}`);
        } catch (error) {
            console.error("Failed to start chat", error);
            toast.error("Failed to start chat");
        }
    };

    const friends = friendships.filter(f => f.status === 'accepted');
    const incomingRequests = friendships.filter(f => f.status === 'pending' && f.recipientId === currentUser?.uid);
    const outgoingRequests = friendships.filter(f => f.status === 'pending' && f.requesterId === currentUser?.uid);

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Friends & Connections</h1>
                <p className="text-muted-foreground">Manage your network and connect with others.</p>
            </div>

            <Tabs defaultValue="friends" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
                    <TabsTrigger value="friends">My Friends</TabsTrigger>
                    <TabsTrigger value="requests">
                        Requests
                        {incomingRequests.length > 0 && (
                            <span className="ml-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                {incomingRequests.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="find">Find People</TabsTrigger>
                </TabsList>

                {/* --- My Friends Tab --- */}
                <TabsContent value="friends" className="mt-6 space-y-4">
                    {friends.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl">
                            <User className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                            <h3 className="font-semibold text-lg">No friends yet</h3>
                            <p className="text-muted-foreground mb-4">Start connecting with people to collaborate!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {friends.map(friendship => {
                                const chat = chats.find(c => c.participants.includes(friendship.friend.id));
                                const unread = chat?.unreadCount?.[currentUser?.uid] || 0;

                                return (
                                    <Card key={friendship.id}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={friendship.friend?.photoURL} />
                                                    <AvatarFallback>{friendship.friend?.displayName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{friendship.friend?.displayName || "Unknown User"}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Connected {friendship.createdAt ? formatDistanceToNow(friendship.createdAt.toDate()) : ""} ago
                                                    </p>
                                                </div>
                                            </div>
                                            <Button size="sm" variant={unread > 0 ? "default" : "secondary"} onClick={() => handleMessage(friendship.friend.id)} className="relative">
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                Message
                                                {unread > 0 && (
                                                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-background">
                                                        {unread > 9 ? '9+' : unread}
                                                    </span>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* --- Requests Tab --- */}
                <TabsContent value="requests" className="mt-6 space-y-6">
                    {incomingRequests.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="bg-primary/10 text-primary p-1 rounded">Incoming</span>
                            </h3>
                            <div className="grid gap-3">
                                {incomingRequests.map(req => (
                                    <Card key={req.id}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={req.friend?.photoURL} />
                                                    <AvatarFallback>{req.friend?.displayName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{req.friend?.displayName}</p>
                                                    <p className="text-xs text-muted-foreground">Sent a friend request</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => acceptFriendRequest(req.id)}>
                                                    <Check className="h-4 w-4 mr-1" /> Accept
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => rejectFriendRequest(req.id)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {outgoingRequests.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="bg-muted text-muted-foreground p-1 rounded">Sent</span>
                            </h3>
                            <div className="grid gap-3">
                                {outgoingRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={req.friend?.photoURL} />
                                                <AvatarFallback>{req.friend?.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{req.friend?.displayName} (Pending)</span>
                                        </div>
                                        <Button size="sm" variant="ghost" className="text-muted-foreground h-8" disabled>Sent</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No pending requests.</div>
                    )}
                </TabsContent>

                {/* --- Find People Tab --- */}
                <TabsContent value="find" className="mt-6 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch}>
                            <Search className="h-4 w-4 mr-2" /> Search
                        </Button>
                    </div>

                    <div className="space-y-3 mt-4">
                        {searchResults.map(user => (
                            <Card key={user.id}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.photoURL} />
                                            <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{user.displayName}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleSendRequest(user.id)}>
                                        <UserPlus className="h-4 w-4 mr-2" /> Add Friend
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        {searchResults.length === 0 && searchQuery && (
                            <p className="text-center text-muted-foreground text-sm pt-4">No users found.</p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
