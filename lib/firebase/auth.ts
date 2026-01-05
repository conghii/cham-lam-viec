import { app } from "./config";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, updateProfile } from "firebase/auth";

export const updateUserProfile = async (displayName?: string, photoURL?: string) => {
    if (auth.currentUser) {
        const updates: { displayName?: string; photoURL?: string } = {};
        if (displayName) updates.displayName = displayName;
        if (photoURL) updates.photoURL = photoURL;
        await updateProfile(auth.currentUser, updates);
    }
};

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
};

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Sync user to Firestore
        const { getFirestore, doc, setDoc, getDoc } = await import("firebase/firestore");
        const { app } = await import("./config");
        const db = getFirestore(app);

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: new Date().toISOString()
        }, { merge: true });

        // If new user or no orgId, create a personal workspace
        if (!userData || !userData.orgId) {
            const { createOrganization } = await import("./firestore");
            await createOrganization(user.displayName || "Personal Workspace", true);
        }

        return user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const getCurrentUser = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user);
        }, reject);
    });
};
