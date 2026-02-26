export const SHOP_CATEGORIES = [
    'Electronics',
    'Mobiles & Accessories',
    'Computers & Laptops',
    'Mobile Repair',
    'Home Appliances',
    'Kitchen Appliances',
    'Furniture',
    'Home Decor',
    'Lighting',
    'Hardware & Tools',
    'Building Materials',
    'Paint & Sanitary',
    'Plumbing & Electrical',
    'Grocery',
    'Supermarket',
    'Fruits & Vegetables',
    'Dairy & Bakery',
    'Meat & Seafood',
    'Sweets & Namkeen',
    'Beverages',
    'Pharmacy',
    'Medical Supplies',
    'Optical',
    'Beauty & Cosmetics',
    'Salon & Spa',
    'Clothing',
    'Footwear',
    'Bags & Luggage',
    'Jewellery',
    'Watches',
    'Books & Stationery',
    'Sports & Fitness',
    'Toys',
    'Baby Products',
    'Pet Supplies',
    'Automobile Parts',
    'Bike Accessories',
    'Gift Shop',
    'Florist',
    'Handicrafts',
    'Tailor & Boutique',
];

export const normalizeCategory = (value) => {
    const found = SHOP_CATEGORIES.find(
        (category) => category.toLowerCase() === String(value || '').toLowerCase()
    );

    return found || null;
};
