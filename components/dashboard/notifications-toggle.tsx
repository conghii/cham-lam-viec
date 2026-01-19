"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { requestNotificationPermission } from "@/lib/firebase/messaging";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/auth";
import { saveFcmToken } from "@/lib/firebase/firestore";

export function NotificationsToggle() {
    const [enabled, setEnabled] = useState(false);

    const handleToggle = async () => {
        const token = await requestNotificationPermission();
        if (token) {
            setEnabled(true);
            toast.success("Notifications Enabled", {
                description: "You will now receive notifications on this device.",
            });

            if (auth.currentUser) {
                await saveFcmToken(auth.currentUser.uid, token);
            }
        } else {
            toast.error("Permission Denied", {
                description: "Could not enable notifications. Please check browser settings.",
            });
        }
    };

    return (
        <Button variant="ghost" size="sm" onClick={handleToggle} className="w-full justify-start">
            {enabled ? <Bell className="mr-2 h-4 w-4 text-primary" /> : <BellOff className="mr-2 h-4 w-4" />}
            {enabled ? "Notifications On" : "Enable Notifications"}
        </Button>
    );
}
