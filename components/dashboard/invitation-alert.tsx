"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/auth";
import { getUserInvitations, acceptInvitation, rejectInvitation, type Invitation } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Mail } from "lucide-react";

export function InvitationAlert() {
    const [invites, setInvites] = useState<Invitation[]>([]);
    const [user, setUser] = useState(auth.currentUser);

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged((u) => {
            setUser(u);
        });
        return unsubAuth;
    }, []);

    useEffect(() => {
        if (!user || !user.email) return;
        const unsubInvites = getUserInvitations(user.email, (data) => {
            setInvites(data);
        });
        return unsubInvites;
    }, [user]);

    const handleAccept = async (invite: Invitation) => {
        try {
            await acceptInvitation(invite.id);
            toast.success(` joined ${invite.orgName}!`);
            window.location.reload(); // Reload to refresh org context
        } catch (error: any) {
            toast.error(error.message);
            console.error(error);
        }
    };

    const handleReject = async (invite: Invitation) => {
        try {
            await rejectInvitation(invite.id);
            toast.success("Invitation declined");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (invites.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            {invites.map(invite => (
                <Card key={invite.id} className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800">
                    <CardContent className="p-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">
                                    You have been invited to join <span className="font-bold">{invite.orgName}</span>
                                </h3>
                                <p className="text-sm text-indigo-600 dark:text-indigo-300">
                                    Invited by a team member.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => handleAccept(invite)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Check className="h-4 w-4 mr-2" /> Accept
                            </Button>
                            <Button onClick={() => handleReject(invite)} variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                                <X className="h-4 w-4 mr-2" /> Decline
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
