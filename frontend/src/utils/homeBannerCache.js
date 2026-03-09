const HOME_BANNER_CACHE_KEY = 'mm_home_banner_cache';
const HOME_BANNER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const normalizeBannerImages = (images) =>
    Array.isArray(images)
        ? images.map((image) => String(image || '').trim()).filter(Boolean).slice(0, 3)
        : [];

export const readCachedHomeBannerImages = () => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const parsed = JSON.parse(window.localStorage.getItem(HOME_BANNER_CACHE_KEY) || '{}');
        const images = normalizeBannerImages(parsed?.images);
        const storedAt = Number(parsed?.storedAt || 0);

        if (!images.length) {
            return [];
        }

        if (!storedAt || Date.now() - storedAt > HOME_BANNER_CACHE_TTL_MS) {
            window.localStorage.removeItem(HOME_BANNER_CACHE_KEY);
            return [];
        }

        return images;
    } catch (error) {
        return [];
    }
};

export const writeCachedHomeBannerImages = (images) => {
    if (typeof window === 'undefined') {
        return;
    }

    const normalizedImages = normalizeBannerImages(images);
    if (!normalizedImages.length) {
        window.localStorage.removeItem(HOME_BANNER_CACHE_KEY);
        return;
    }

    try {
        window.localStorage.setItem(
            HOME_BANNER_CACHE_KEY,
            JSON.stringify({
                images: normalizedImages,
                storedAt: Date.now(),
            })
        );
    } catch (error) {
        // ignore local storage write failures
    }
};

export const clearCachedHomeBannerImages = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.removeItem(HOME_BANNER_CACHE_KEY);
};
