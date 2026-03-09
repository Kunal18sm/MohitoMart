import { getPlaceholderImage } from './imageFallbacks';

const LOCAL_CATEGORY_IMAGE_MAP = {
    'automobile-parts': 'avif',
    'bags-and-luggage': 'avif',
    'beauty-and-cosmetics': 'avif',
    'books-and-stationery': 'avif',
    'building-materials': 'avif',
    'clothing': 'avif',
    'computers-and-laptops': 'avif',
    'dairy-and-bakery': 'avif',
    'electronics': 'avif',
    'florist': 'avif',
    'footwear': 'avif',
    'furniture': 'jpg',
    'grocery': 'jpg',
    'gym': 'jpg',
    'handicrafts': 'avif',
    'home-appliances': 'jpg',
    'home-decor': 'jpg',
    'jewellery': 'avif',
    'kitchen-appliances': 'jpg',
    'lighting': 'avif',
    'mobile-repair': 'jpg',
    'mobiles-and-accessories': 'avif',
    'optical': 'avif',
    'paint-and-sanitary': 'jpg',
    'pet-supplies': 'avif',
    'plumbing-and-electrical': 'avif',
    'restaurant': 'jpg',
    'saloon': 'jpg',
    'sweets-and-namkeen': 'jpg',
    'tailor-and-boutique': 'avif',
    'toys': 'avif',
    'watches': 'avif',
};

const CATEGORY_IMAGE_ALIASES = {
    'salon-and-spa': 'saloon',
    'sports-and-fitness': 'gym',
};
const OPTIMIZED_CATEGORY_IMAGE_FOLDER = '/category-images-optimized';
const DEFAULT_CATEGORY_IMAGE_FOLDER = '/category-images';

export const getCategoryImageSlug = (category) =>
    String(category || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');

export const hasLocalCategoryImage = (category) => {
    const slug = getCategoryImageSlug(category);
    const resolvedSlug = CATEGORY_IMAGE_ALIASES[slug] || slug;
    return Boolean(LOCAL_CATEGORY_IMAGE_MAP[resolvedSlug]);
};

export const filterCategoriesWithLocalImages = (categories = []) =>
    [
        ...new Set(
            categories
                .map((category) => String(category || '').trim())
                .filter((category) => category && hasLocalCategoryImage(category))
        ),
    ];

export const getCategoryLocalImage = (category) => {
    const slug = getCategoryImageSlug(category);
    const resolvedSlug = CATEGORY_IMAGE_ALIASES[slug] || slug;
    const extension = LOCAL_CATEGORY_IMAGE_MAP[resolvedSlug];

    if (!extension) {
        return getPlaceholderImage('category');
    }

    const basePath = extension === 'jpg' || extension === 'jpeg'
        ? OPTIMIZED_CATEGORY_IMAGE_FOLDER
        : DEFAULT_CATEGORY_IMAGE_FOLDER;

    return `${basePath}/${resolvedSlug}.${extension}`;
};

export const handleCategoryImageError = (event) => {
    const imageElement = event.currentTarget;
    if (imageElement.dataset.fallbackApplied === '1') {
        return;
    }

    imageElement.dataset.fallbackApplied = '1';
    imageElement.src = getPlaceholderImage('category');
};
