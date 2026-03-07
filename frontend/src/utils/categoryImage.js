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
    'handicrafts': 'avif',
    'home-appliances': 'jpg',
    'home-decor': 'jpg',
    'jewellery': 'avif',
    'kitchen-appliances': 'jpg',
    'lighting': 'avif',
    'mobiles-and-accessories': 'avif',
    'optical': 'avif',
    'pet-supplies': 'avif',
    'plumbing-and-electrical': 'avif',
    'restaurant': 'jpg',
    'tailor-and-boutique': 'avif',
    'toys': 'avif',
    'watches': 'avif',
};

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
    return Boolean(LOCAL_CATEGORY_IMAGE_MAP[slug]);
};

export const filterCategoriesWithLocalImages = (categories = []) =>
    [...new Set(categories.map((category) => String(category || '').trim()).filter(Boolean))];

export const getCategoryLocalImage = (category) => {
    const slug = getCategoryImageSlug(category);
    const extension = LOCAL_CATEGORY_IMAGE_MAP[slug];

    if (!extension) {
        return getPlaceholderImage('category');
    }

    return `/category-images/${slug}.${extension}`;
};

export const handleCategoryImageError = (event) => {
    const imageElement = event.currentTarget;
    if (imageElement.dataset.fallbackApplied === '1') {
        return;
    }

    imageElement.dataset.fallbackApplied = '1';
    imageElement.src = getPlaceholderImage('category');
};
