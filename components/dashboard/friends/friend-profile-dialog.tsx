"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, UserMinus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { removeFriend } from "@/lib/firebase/firestore";

interface FriendProfileDialogProps {
    user: any;
    isOpen: boolean;
    onClose: () => void;
    onUnfriend?: () => void;
}

export function FriendProfileDialog({ user, isOpen, onClose, onUnfriend }: FriendProfileDialogProps) {
    const [isConfirmingUnfriend, setIsConfirmingUnfriend] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    if (!user) return null;

    const handleUnfriend = async () => {
        setIsLoading(true);
        try {
            await removeFriend(user.id);
            toast.success("Friend removed");
            onClose();
            if (onUnfriend) onUnfriend();
        } catch (error) {
            console.error("Failed to remove friend:", error);
            toast.error("Failed to remove friend");
        } finally {
            setIsLoading(false);
            setIsConfirmingUnfriend(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                {!isConfirmingUnfriend ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Friend Profile</DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col items-center py-6">
                            <Avatar className="h-24 w-24 border-4 border-background shadow-lg mb-4">
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback className="text-2xl">{user.displayName?.[0]}</AvatarFallback>
                            </Avatar>

                            <h2 className="text-xl font-bold">{user.displayName}</h2>
                            <p className="text-sm text-muted-foreground">Member since {new Date().getFullYear()}</p>

                            <div className="w-full mt-8 space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{user.email || "No email visible"}</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">Connected recently</span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="sm:justify-between gap-2">
                            <Button variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => setIsConfirmingUnfriend(true)}>
                                <UserMinus className="h-4 w-4 mr-2" />
                                Unfriend
                            </Button>
                            <Button onClick={onClose}>Close</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-rose-600 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                Unfriend {user.displayName}?
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to remove this user from your friends list? You won't be able to message them unless you add them again.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-lg border border-rose-100 dark:border-rose-900/50">
                                <p className="text-sm text-rose-800 dark:text-rose-300">
                                    This action cannot be undone immediately. You will need to send a new friend request to modify this connection.
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsConfirmingUnfriend(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleUnfriend} disabled={isLoading}>
                                {isLoading ? "Removing..." : "Yes, Unfriend"}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
