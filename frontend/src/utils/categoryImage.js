const CATEGORY_IMAGE_QUERIES = {
    Electronics: 'electronics gadgets store',
    'Mobiles & Accessories': 'smartphone accessories store',
    'Computers & Laptops': 'laptop computer store',
    'Mobile Repair': 'phone repair technician',
    'Home Appliances': 'home appliances showroom',
    'Kitchen Appliances': 'kitchen appliances',
    Furniture: 'furniture showroom',
    'Home Decor': 'home decor interior',
    Lighting: 'lighting shop lamps',
    'Hardware & Tools': 'hardware tools shop',
    'Building Materials': 'construction materials',
    'Paint & Sanitary': 'paint sanitary store',
    'Plumbing & Electrical': 'plumbing electrical tools',
    Grocery: 'grocery store shelves',
    Supermarket: 'supermarket aisle',
    'Fruits & Vegetables': 'fresh fruits vegetables market',
    'Dairy & Bakery': 'bakery dairy products',
    'Meat & Seafood': 'meat seafood counter',
    'Sweets & Namkeen': 'indian sweets snacks',
    Beverages: 'beverage bottles drinks',
    Pharmacy: 'pharmacy medicine',
    'Medical Supplies': 'medical supplies equipment',
    Optical: 'optical eyeglasses store',
    'Beauty & Cosmetics': 'beauty cosmetics products',
    'Salon & Spa': 'salon spa interior',
    Clothing: 'clothing fashion store',
    Footwear: 'shoe store',
    'Bags & Luggage': 'bags luggage shop',
    Jewellery: 'jewelry store',
    Watches: 'wrist watch display',
    'Books & Stationery': 'bookstore stationery',
    'Sports & Fitness': 'sports fitness equipment',
    Toys: 'toy store',
    'Baby Products': 'baby products store',
    'Pet Supplies': 'pet supplies shop',
    'Automobile Parts': 'auto parts store',
    'Bike Accessories': 'motorcycle accessories',
    'Gift Shop': 'gift shop items',
    Florist: 'flower shop bouquet',
    Handicrafts: 'handicraft products',
    'Tailor & Boutique': 'fashion boutique tailor',
};

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
    'tailor-and-boutique': 'avif',
    'toys': 'avif',
    'watches': 'avif',
};

const buildStableSig = (input) => {
    const value = String(input || '').toLowerCase();
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash + value.charCodeAt(index) * (index + 1)) % 997;
    }

    return hash + 1;
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
    categories.filter((category) => hasLocalCategoryImage(category));

export const getCategoryLocalImage = (category) => {
    const slug = getCategoryImageSlug(category);
    const extension = LOCAL_CATEGORY_IMAGE_MAP[slug];

    if (!extension) {
        return '';
    }

    return `/category-images/${slug}.${extension}`;
};

export const getCategoryUnsplashImage = (category, options = {}) => {
    const width = Number(options.width || 320);
    const height = Number(options.height || 220);
    const query = CATEGORY_IMAGE_QUERIES[category] || `${category} shop`;
    const sig = buildStableSig(category);

    return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(query)}&sig=${sig}`;
};

export const handleCategoryImageError = (event, category, fallbackOptions = {}) => {
    const imageElement = event.currentTarget;
    if (imageElement.dataset.fallbackApplied === '1') {
        return;
    }

    imageElement.dataset.fallbackApplied = '1';
    imageElement.src = getCategoryUnsplashImage(category, fallbackOptions);
};
