const PLACEHOLDER_IMAGE_PATHS = Object.freeze({
    category: '/placeholders/category.svg',
    product: '/placeholders/product.svg',
    service: '/placeholders/service.svg',
    shop: '/placeholders/shop.svg',
});

export const getPlaceholderImage = (kind = 'product') =>
    PLACEHOLDER_IMAGE_PATHS[kind] || PLACEHOLDER_IMAGE_PATHS.product;

export const resolveImageSource = (source, kind = 'product') => {
    const normalizedSource = String(source || '').trim();
    return normalizedSource || getPlaceholderImage(kind);
};

export const applyImageFallback = (event, kind = 'product') => {
    const imageElement = event?.currentTarget;
    if (!imageElement || imageElement.dataset.fallbackApplied === '1') {
        return;
    }

    imageElement.dataset.fallbackApplied = '1';
    imageElement.src = getPlaceholderImage(kind);
};
