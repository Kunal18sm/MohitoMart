const PLACEHOLDER_IMAGE_PATHS = Object.freeze({
    category: '/placeholders/category.svg',
    product: '/placeholders/product.svg',
    service: '/placeholders/service.svg',
    shop: '/placeholders/shop.svg',
});
const CLOUDINARY_UPLOAD_SEGMENT = '/image/upload/';

export const getPlaceholderImage = (kind = 'product') =>
    PLACEHOLDER_IMAGE_PATHS[kind] || PLACEHOLDER_IMAGE_PATHS.product;

export const resolveImageSource = (source, kind = 'product') => {
    const normalizedSource = String(source || '').trim();
    return normalizedSource || getPlaceholderImage(kind);
};

const normalizeDimension = (value) => {
    const normalized = Math.round(Number(value));
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
};

const normalizeWidths = (widths = [], fallbackWidth = 0) => {
    const normalized = widths
        .map((entry) => normalizeDimension(entry))
        .filter(Boolean);

    if (fallbackWidth) {
        normalized.push(fallbackWidth);
    }

    return [...new Set(normalized)].sort((left, right) => left - right);
};

const CLOUDINARY_GRAVITY_CROPS = new Set([
    'crop',
    'fill',
    'fill_pad',
    'thumb',
    'auto_pad',
    'lfill',
]);

export const isCloudinaryImage = (source) => {
    const normalizedSource = String(source || '').trim();
    return (
        normalizedSource.includes('res.cloudinary.com') &&
        normalizedSource.includes(CLOUDINARY_UPLOAD_SEGMENT)
    );
};

export const buildCloudinaryImageUrl = (source, options = {}) => {
    const normalizedSource = String(source || '').trim();
    if (!isCloudinaryImage(normalizedSource)) {
        return normalizedSource;
    }

    const width = normalizeDimension(options.width);
    const height = normalizeDimension(options.height);
    const crop = String(options.crop || 'fill').trim();
    const gravity = String(options.gravity || 'auto').trim();
    const quality = String(options.quality || 'auto:good').trim();
    const format = String(options.format || 'auto').trim();
    const dpr = String(options.dpr || 'auto').trim();
    const shouldApplyGravity = gravity && CLOUDINARY_GRAVITY_CROPS.has(crop);

    const transformParts = [
        format ? `f_${format}` : '',
        quality ? `q_${quality}` : '',
        dpr ? `dpr_${dpr}` : '',
        crop ? `c_${crop}` : '',
        shouldApplyGravity ? `g_${gravity}` : '',
        width ? `w_${width}` : '',
        height ? `h_${height}` : '',
    ].filter(Boolean);

    if (!transformParts.length) {
        return normalizedSource;
    }

    return normalizedSource.replace(
        CLOUDINARY_UPLOAD_SEGMENT,
        `${CLOUDINARY_UPLOAD_SEGMENT}${transformParts.join(',')}/`
    );
};

export const getResponsiveImageProps = (source, options = {}) => {
    const kind = options.kind || 'product';
    const resolvedSource = resolveImageSource(source, kind);
    const width = normalizeDimension(options.width);
    const height = normalizeDimension(options.height);
    const crop = options.crop || 'fill';
    const gravity = options.gravity || 'auto';
    const quality = options.quality || 'auto:good';
    const format = options.format || 'auto';
    const dpr = options.dpr || 'auto';
    const sizes = String(options.sizes || '100vw').trim();
    const widths = normalizeWidths(options.widths, width);

    if (!isCloudinaryImage(resolvedSource) || widths.length === 0) {
        return {
            src: resolvedSource,
            sizes,
            width: width || undefined,
            height: height || undefined,
        };
    }

    const aspectRatio = width && height ? height / width : 0;
    const resolvedWidth = widths[widths.length - 1];
    const resolvedHeight = height
        ? normalizeDimension(resolvedWidth * aspectRatio)
        : 0;

    return {
        src: buildCloudinaryImageUrl(resolvedSource, {
            width: resolvedWidth,
            height: resolvedHeight,
            crop,
            gravity,
            quality,
            format,
            dpr,
        }),
        srcSet: widths
            .map((candidateWidth) => {
                const candidateHeight = height
                    ? normalizeDimension(candidateWidth * aspectRatio)
                    : 0;
                const candidateUrl = buildCloudinaryImageUrl(resolvedSource, {
                    width: candidateWidth,
                    height: candidateHeight,
                    crop,
                    gravity,
                    quality,
                    format,
                    dpr,
                });
                return `${candidateUrl} ${candidateWidth}w`;
            })
            .join(', '),
        sizes,
        width: width || undefined,
        height: height || undefined,
    };
};

export const applyImageFallback = (event, kind = 'product') => {
    const imageElement = event?.currentTarget;
    if (!imageElement || imageElement.dataset.fallbackApplied === '1') {
        return;
    }

    imageElement.dataset.fallbackApplied = '1';
    imageElement.removeAttribute('srcset');
    imageElement.removeAttribute('sizes');
    imageElement.src = getPlaceholderImage(kind);
};
