import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { app } from "./config";

let messaging: Messaging | null = null;

export const initializeMessaging = () => {
    if (typeof window !== "undefined") {
        try {
            // Only initialize if supported
            if ("serviceWorker" in navigator) {
                messaging = getMessaging(app);
            }
        } catch (error) {
            console.error("Firebase messaging init failed", error);
        }
    }
    return messaging;
};

export const requestNotificationPermission = async () => {
    const msg = initializeMessaging();
    if (!msg) {
        console.log("Messaging not initialized");
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(msg, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Optional if using default config, but recommended
            });
            console.log("FCM Token:", token);
            return token;
        } else {
            console.log("Notification permission denied");
            return null;
        }
    } catch (error) {
        console.error("Error requesting permission", error);
        return null;
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        const msg = initializeMessaging();
        if (msg) {
            onMessage(msg, (payload) => {
                resolve(payload);
            });
        }
    });
