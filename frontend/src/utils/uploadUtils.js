import api from '../services/api';
import imageCompression from 'browser-image-compression';

const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_UPLOAD_CONCURRENCY = 3;

const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    });

export const validateImageFiles = (
    files,
    { min = 1, max = 5, maxSizeMB = DEFAULT_MAX_SIZE_MB } = {}
) => {
    const selected = Array.from(files || []);

    if (selected.length < min || selected.length > max) {
        throw new Error(`Please select between ${min} and ${max} images`);
    }

    for (const file of selected) {
        if (!file.type.startsWith('image/')) {
            throw new Error(`Invalid file type for ${file.name}. Only image files are allowed`);
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
            throw new Error(`${file.name} is too large. Max allowed size is ${maxSizeMB}MB`);
        }
    }

    return selected;
};

export const uploadImages = async (
    files,
    folder,
    onProgress,
    { concurrency = DEFAULT_UPLOAD_CONCURRENCY } = {}
) => {
    const selected = Array.from(files || []);
    if (!selected.length) {
        return [];
    }

    const urls = new Array(selected.length);
    const workersCount = Math.min(
        selected.length,
        Math.max(1, Math.min(Number(concurrency) || DEFAULT_UPLOAD_CONCURRENCY, 5))
    );
    let cursor = 0;
    let uploadedCount = 0;

    const uploadSingleFile = async (index) => {
        const file = selected[index];

        let fileToUpload = file;
        try {
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1280,
                useWebWorker: true,
            };
            fileToUpload = await imageCompression(file, options);
        } catch (error) {
            console.warn('Image compression failed, falling back to original file', error);
        }

        const image = await fileToBase64(fileToUpload);
        const { data } = await api.post('/uploads/image', { image, folder });
        urls[index] = data.url;
        uploadedCount += 1;

        if (typeof onProgress === 'function') {
            onProgress(uploadedCount, selected.length);
        }
    };

    const workers = Array.from({ length: workersCount }, async () => {
        while (cursor < selected.length) {
            const currentIndex = cursor;
            cursor += 1;
            await uploadSingleFile(currentIndex);
        }
    });

    await Promise.all(workers);
    return urls.filter(Boolean);
};
