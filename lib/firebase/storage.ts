import { storage } from "./config";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The path in storage where the file should be saved (e.g., 'images/profile.jpg').
 * @returns The download URL of the uploaded file.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};

/**
 * Gets the download URL for a file in Firebase Storage.
 * @param path The path of the file in storage.
 * @returns The download URL.
 */
export const getFileUrl = async (path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error("Error getting file URL:", error);
        throw error;
    }
};

/**
 * Deletes a file from Firebase Storage.
 * @param path The path of the file to delete.
 */
export const deleteFile = async (path: string): Promise<void> => {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (error) {
        console.error("Error deleting file:", error);
        throw error;
    }
};
