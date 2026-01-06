
/**
 * Compresses an image file using HTML Canvas.
 * 
 * @param file The original image file.
 * @param quality The quality of the compressed image (0 to 1). Default is 0.7.
 * @param maxWidth The maximum width of the compressed image. Default is 1920px.
 * @returns A Promise that resolves to the compressed File.
 */
export const compressImage = async (
    file: File,
    quality: number = 0.4,
    maxWidth: number = 800
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(url);

            let width = image.width;
            let height = image.height;

            // Calculate new dimensions if width exceeds maxWidth
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            // Draw image on canvas
            ctx.drawImage(image, 0, 0, width, height);

            // Convert canvas to Blob (Force WebP)
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Image compression failed"));
                        return;
                    }

                    // Create a new File from the compressed Blob
                    // Change extension to .webp for consistency, though Firebase Storage relies on MIME type
                    const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";

                    const compressedFile = new File([blob], newName, {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    });

                    resolve(compressedFile);
                },
                'image/webp',
                quality
            );
        };

        image.onerror = (error) => {
            URL.revokeObjectURL(url);
            reject(error);
        };

        image.src = url;
    });
};
