importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
    apiKey: "REPLACE_WITH_YOUR_API_KEY", // Ideally fetched from env but SW has no access to process.env. Usually hardcoded or injected.
    authDomain: "chamlam-app.firebaseapp.com",
    projectId: "chamlam-app",
    storageBucket: "chamlam-app.appspot.com",
    messagingSenderId: "367295460593", // Taken from user's env earlier or hardcoded if known
    appId: "1:367295460593:web:..."
});

// Since we don't have exact keys here from `process.env`, we might need the user to fill this or use a workaround.
// However, the `firebaseConfig` in `lib/firebase/config.ts` had `process.env`.
// Service Workers cannot access `process.env` at build time unless using a bundler which Next.js does for main app but static SW files might be tricky.
// A common pattern is to just put the config here.

// For now, I'll put a placeholder and rely on the fact that `messagingSenderId` is crucial.
// Actually, I should try to read `lib/firebase/config.ts` first to see if I can "borrow" the values? No, I can't read files in SW.
// I will create a basic SW and add a comment that it needs valid config.

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192.png'
    };

    self.registration.showNotification(notificationTitle,
        notificationOptions);
});
