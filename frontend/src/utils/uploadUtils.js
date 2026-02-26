import api from '../services/api';

const DEFAULT_MAX_SIZE_MB = 5;

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

export const uploadImages = async (files, folder, onProgress) => {
    const urls = [];
    const selected = Array.from(files || []);

    for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        const image = await fileToBase64(file);
        const { data } = await api.post('/uploads/image', { image, folder });
        urls.push(data.url);

        if (typeof onProgress === 'function') {
            onProgress(index + 1, selected.length);
        }
    }

    return urls;
};
