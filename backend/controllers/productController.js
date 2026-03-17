import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Shop from '../models/Shop.js';
import ProductView from '../models/ProductView.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import { SHOP_CATEGORIES, normalizeCategory } from '../constants/shopCategories.js';
import { destroyCloudinaryImages } from '../utils/cloudinaryCleanup.js';
import { buildLocationFieldClause } from '../utils/locationNormalizer.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeImages = (images) => {
    if (!Array.isArray(images)) {
        return [];
    }

    return images.map((image) => String(image).trim()).filter(Boolean);
};

const normalizeBoolean = (value, defaultValue = false) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        if (value === 1) {
            return true;
        }
        if (value === 0) {
            return false;
        }
    }

    if (typeof value === 'string') {
        const normalizedValue = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
            return true;
        }
        if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
            return false;
        }
    }

    return defaultValue;
};

const enforceImageRange = (images) => {
    if (images.length < 1 || images.length > 5) {
        throw new Error('Product images must be between 1 and 5');
    }
};
const MAX_PRODUCTS_PER_SHOP = 50;

const getFollowedShopIdsForUser = async (userId) => {
    if (!userId) {
        return new Set();
    }

    const user = await User.findById(userId).select('followedShops').lean();
    return new Set(user?.followedShops?.map((shopId) => shopId.toString()) || []);
};

const mapProductWithFollowState = (product, followedShopIds = new Set()) => {
    const rawProduct = typeof product?.toObject === 'function' ? product.toObject() : product;

    if (!rawProduct?.shop || typeof rawProduct.shop !== 'object') {
        return rawProduct;
    }

    const shopId = rawProduct.shop._id?.toString?.();
    const hidePriceAccessEnabled =
        rawProduct.shop.allowPriceHide === undefined ? true : Boolean(rawProduct.shop.allowPriceHide);

    return {
        ...rawProduct,
        hideOriginalPrice: Boolean(rawProduct.hideOriginalPrice && hidePriceAccessEnabled),
        shop: {
            ...rawProduct.shop,
            isFollowed: shopId ? followedShopIds.has(shopId) : false,
        },
    };
};

const mapProductsWithFollowState = (products, followedShopIds = new Set()) =>
    products.map((product) => mapProductWithFollowState(product, followedShopIds));

const parseObjectIdList = (value) => {
    const rawValues = Array.isArray(value)
        ? value
        : String(value || '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);

    const seenIds = new Set();

    return rawValues
        .filter((entry) => mongoose.Types.ObjectId.isValid(entry))
        .filter((entry) => {
            if (seenIds.has(entry)) {
                return false;
            }

            seenIds.add(entry);
            return true;
        })
        .map((entry) => new mongoose.Types.ObjectId(entry));
};

const toAggregateMatch = (filters) => {
    const match = { ...filters };
    if (typeof match.shop === 'string' && mongoose.Types.ObjectId.isValid(match.shop)) {
        match.shop = new mongoose.Types.ObjectId(match.shop);
    }
    return match;
};

const resolveProductSort = (sortValue) => {
    const normalized = String(sortValue || 'latest').trim().toLowerCase();
    const sortMap = {
        latest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        price_asc: { price: 1, createdAt: -1 },
        price_desc: { price: -1, createdAt: -1 },
        views_desc: { viewsCount: -1, createdAt: -1 },
        views_asc: { viewsCount: 1, createdAt: -1 },
    };

    return sortMap[normalized] || sortMap.latest;
};

// @desc    Fetch all products with pagination and filters
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1);
        const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50);
        const skip = (page - 1) * limit;

        const filters = {};

        if (req.query.category) {
            const normalizedCategory = normalizeCategory(req.query.category);
            if (!normalizedCategory) {
                res.status(400);
                throw new Error('Invalid product category');
            }
            filters.category = normalizedCategory;
        }

        if (req.query.keyword) {
            filters.name = { $regex: escapeRegex(req.query.keyword), $options: 'i' };
        }

        if (req.query.shopId) {
            filters.shop = req.query.shopId;
        }

        const locationClauses = [];
        const cityClause = buildLocationFieldClause('location.city', req.query.city);
        const areaClause = buildLocationFieldClause('location.area', req.query.areas, req.query.area);

        if (cityClause) {
            locationClauses.push(cityClause);
        }
        if (areaClause) {
            locationClauses.push(areaClause);
        }

        if (locationClauses.length) {
            const shopFilters = {};

            if (locationClauses.length === 1) {
                Object.assign(shopFilters, locationClauses[0]);
            } else {
                shopFilters.$and = locationClauses;
            }

            const nearbyShopIds = await Shop.find(shopFilters).distinct('_id');
            if (!nearbyShopIds.length) {
                return res.status(200).json({
                    products: [],
                    page,
                    pages: 0,
                    total: 0,
                });
            }
            filters.shop = { $in: nearbyShopIds };
        }

        const sortClause = resolveProductSort(req.query.sort);

        const [count, products, followedShopIds] = await Promise.all([
            Product.countDocuments(filters),
            Product.find(filters)
                .select('name price hideOriginalPrice images category description viewsCount shop createdAt')
                .populate('shop', 'name category location rating numRatings allowPriceHide')
                .sort(sortClause)
                .skip(skip)
                .limit(limit)
                .lean(),
            getFollowedShopIdsForUser(req.user?._id),
        ]);

        res.status(200).json({
            products: mapProductsWithFollowState(products, followedShopIds),
            page,
            pages: Math.ceil(count / limit),
            total: count,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Fetch a single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
            .select('name price hideOriginalPrice images category description viewsCount shop createdAt')
            .populate(
            'shop',
            'name category location rating numRatings mapUrl images mobile description allowPriceHide'
            )
            .lean();

        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }

        if (req.user?._id) {
            const viewResult = await ProductView.updateOne(
                {
                    product: product._id,
                    user: req.user._id,
                },
                {
                    $setOnInsert: {
                        product: product._id,
                        user: req.user._id,
                    },
                },
                {
                    upsert: true,
                }
            );

            if (viewResult.upsertedCount > 0) {
                await Product.updateOne({ _id: product._id }, { $inc: { viewsCount: 1 } });
                product.viewsCount = Number(product.viewsCount || 0) + 1;
            }
        }

        const followedShopIds = await getFollowedShopIdsForUser(req.user?._id);
        res.status(200).json(mapProductWithFollowState(product, followedShopIds));
    } catch (error) {
        next(error);
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (shop owner/admin)
export const createProduct = async (req, res, next) => {
    try {
        const { name, price, images, description, shopId, hideOriginalPrice } = req.body;
        const normalizedName = String(name || '').trim();

        if (price === undefined || !shopId) {
            res.status(400);
            throw new Error('price and shopId are required');
        }

        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            res.status(400);
            throw new Error('price must be a valid number');
        }

        const shop = await Shop.findById(shopId).select('_id owner category allowPriceHide').lean();
        if (!shop) {
            res.status(404);
            throw new Error('Shop not found');
        }

        const existingProductsCount = await Product.countDocuments({ shop: shop._id });
        if (existingProductsCount >= MAX_PRODUCTS_PER_SHOP) {
            res.status(400);
            throw new Error(`A shop can list up to ${MAX_PRODUCTS_PER_SHOP} products only`);
        }

        const isOwner = shop.owner.toString() === String(req.user._id);
        if (!isOwner && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to add products to this shop');
        }

        const normalizedImages = normalizeImages(images);
        enforceImageRange(normalizedImages);

        const normalizedCategory = normalizeCategory(shop.category);
        if (!normalizedCategory) {
            res.status(400);
            throw new Error(`category must be one of: ${SHOP_CATEGORIES.join(', ')}`);
        }

        const normalizedHideOriginalPrice = shop.allowPriceHide
            ? normalizeBoolean(hideOriginalPrice, false)
            : false;

        const product = await Product.create({
            productId: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: normalizedName || 'Untitled Product',
            price: numericPrice,
            hideOriginalPrice: normalizedHideOriginalPrice,
            images: normalizedImages,
            description: description || '',
            shop: shop._id,
            category: normalizedCategory,
        });

        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (owner/admin)
export const updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }

        const shop = await Shop.findById(product.shop).select('owner allowPriceHide').lean();
        const isOwner = shop && shop.owner.toString() === String(req.user._id);

        if (!isOwner && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to update this product');
        }

        const previousImages = [...product.images];
        let nextImages = previousImages;

        if (req.body.images) {
            const normalizedImages = normalizeImages(req.body.images);
            enforceImageRange(normalizedImages);
            product.images = normalizedImages;
            nextImages = normalizedImages;
        }

        if (req.body.category) {
            const normalizedCategory = normalizeCategory(req.body.category);
            if (!normalizedCategory) {
                res.status(400);
                throw new Error('Invalid product category');
            }
            product.category = normalizedCategory;
        }

        product.name = req.body.name || product.name;
        if (req.body.price !== undefined) {
            const numericPrice = Number(req.body.price);
            if (!Number.isFinite(numericPrice) || numericPrice < 0) {
                res.status(400);
                throw new Error('price must be a valid number');
            }
            product.price = numericPrice;
        }

        if (req.body.hideOriginalPrice !== undefined) {
            product.hideOriginalPrice = shop?.allowPriceHide
                ? normalizeBoolean(req.body.hideOriginalPrice, product.hideOriginalPrice)
                : false;
        } else if (!shop?.allowPriceHide && product.hideOriginalPrice) {
            product.hideOriginalPrice = false;
        }

        product.description =
            req.body.description !== undefined ? req.body.description : product.description;

        const updatedProduct = await product.save();

        if (req.body.images) {
            const removedImages = previousImages.filter((image) => !nextImages.includes(image));
            await destroyCloudinaryImages(removedImages);
        }

        res.status(200).json(updatedProduct);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (owner/admin)
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }

        const shop = await Shop.findById(product.shop).select('owner').lean();
        const isOwner = shop && shop.owner.toString() === String(req.user._id);

        if (!isOwner && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to delete this product');
        }

        const productImages = [...product.images];

        await Promise.all([
            ProductView.deleteMany({ product: product._id }),
            Product.deleteOne({ _id: product._id }),
        ]);

        // Background Cart Cleanup (Non-blocking)
        Cart.updateMany(
            { 'cartItems.product': product._id },
            { $pull: { cartItems: { product: product._id } } }
        ).catch((err) => {
            console.error('Failed to cleanup carts after product deletion:', err);
        });

        await destroyCloudinaryImages(productImages);

        res.status(200).json({ message: 'Product removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get products for current shop owner
// @route   GET /api/products/me/list
// @access  Private
export const getMyProducts = async (req, res, next) => {
    try {
        if (!['shop_owner', 'admin'].includes(req.user.role)) {
            res.status(403);
            throw new Error('Only shop owners can access this endpoint');
        }

        const ownedShopIds = await Shop.find({ owner: req.user._id }).distinct('_id');

        if (!ownedShopIds.length) {
            return res.status(200).json({ products: [] });
        }

        const filters = { shop: { $in: ownedShopIds } };

        if (req.query.shopId) {
            const requestedShopId = req.query.shopId;
            const ownedShopId =
                ownedShopIds.find((shopId) => shopId.toString() === requestedShopId) || null;
            if (!ownedShopId && req.user.role !== 'admin') {
                res.status(403);
                throw new Error('Not authorized to access this shop products');
            }
            filters.shop = ownedShopId || requestedShopId;
        }

        const statsOnly = ['1', 'true'].includes(
            String(req.query.statsOnly || '').trim().toLowerCase()
        );

        if (statsOnly) {
            const aggregateMatch = toAggregateMatch(filters);
            const [summary] = await Product.aggregate([
                { $match: aggregateMatch },
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        totalViews: { $sum: '$viewsCount' },
                    },
                },
            ]);

            return res.status(200).json({
                products: [],
                summary: {
                    totalProducts: Number(summary?.totalProducts || 0),
                    totalViews: Number(summary?.totalViews || 0),
                },
            });
        }

        const aggregateMatch = toAggregateMatch(filters);
        const [products, summary] = await Promise.all([
            Product.find(filters)
                .populate('shop', 'name category location images allowPriceHide')
                .sort({ createdAt: -1 })
                .lean(),
            Product.aggregate([
                { $match: aggregateMatch },
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        totalViews: { $sum: '$viewsCount' },
                    },
                },
            ]),
        ]);

        const aggregateSummary = summary?.[0];

        res.status(200).json({
            products,
            summary: {
                totalProducts: Number(aggregateSummary?.totalProducts || 0),
                totalViews: Number(aggregateSummary?.totalViews || 0),
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get random products for discovery
// @route   GET /api/products/random
// @access  Public
export const getRandomProducts = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 40);
        const match = {};
        const excludedProductIds = parseObjectIdList(req.query.excludeIds);

        if (req.query.category) {
            const normalizedCategory = normalizeCategory(req.query.category);
            if (!normalizedCategory) {
                res.status(400);
                throw new Error('Invalid product category');
            }
            match.category = normalizedCategory;
        }

        if (req.query.keyword) {
            match.name = { $regex: escapeRegex(req.query.keyword), $options: 'i' };
        }

        const locationClauses = [];
        const cityClause = buildLocationFieldClause('location.city', req.query.city);
        const areaClause = buildLocationFieldClause('location.area', req.query.areas, req.query.area);

        if (cityClause) {
            locationClauses.push(cityClause);
        }
        if (areaClause) {
            locationClauses.push(areaClause);
        }

        if (locationClauses.length) {
            const shopFilters = {};

            if (locationClauses.length === 1) {
                Object.assign(shopFilters, locationClauses[0]);
            } else {
                shopFilters.$and = locationClauses;
            }

            const nearbyShopIds = await Shop.find(shopFilters).distinct('_id');
            if (!nearbyShopIds.length) {
                return res.status(200).json({ products: [] });
            }

            match.shop = { $in: nearbyShopIds };
        }

        if (excludedProductIds.length) {
            match._id = { $nin: excludedProductIds };
        }

        const onePerShop = await Product.aggregate([
            { $match: match },
            { $addFields: { _rand: { $rand: {} } } },
            { $sort: { shop: 1, _rand: 1 } },
            { $group: { _id: '$shop', product: { $first: '$$ROOT' } } },
            { $replaceRoot: { newRoot: '$product' } },
            { $sample: { size: limit } },
        ]);

        let products = onePerShop;

        if (products.length < limit) {
            const existingIds = products.map((product) => product._id);
            const extraProducts = await Product.aggregate([
                {
                    $match: {
                        ...match,
                        _id: { $nin: existingIds },
                    },
                },
                { $sample: { size: limit - products.length } },
            ]);
            products = [...products, ...extraProducts];
        }

        products = await Product.populate(products, {
            path: 'shop',
            select: 'name category location rating numRatings images allowPriceHide',
        });

        const followedShopIds = await getFollowedShopIdsForUser(req.user?._id);
        res.status(200).json({ products: mapProductsWithFollowState(products, followedShopIds) });
    } catch (error) {
        next(error);
    }
};

// @desc    Get latest products for discovery
// @route   GET /api/products/latest
// @access  Public
export const getLatestProducts = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 40);
        const filters = {};

        if (req.query.category) {
            const normalizedCategory = normalizeCategory(req.query.category);
            if (!normalizedCategory) {
                res.status(400);
                throw new Error('Invalid product category');
            }
            filters.category = normalizedCategory;
        }

        const locationClauses = [];
        const cityClause = buildLocationFieldClause('location.city', req.query.city);
        const areaClause = buildLocationFieldClause('location.area', req.query.areas, req.query.area);

        if (cityClause) {
            locationClauses.push(cityClause);
        }
        if (areaClause) {
            locationClauses.push(areaClause);
        }

        if (locationClauses.length) {
            const shopFilters = {};

            if (locationClauses.length === 1) {
                Object.assign(shopFilters, locationClauses[0]);
            } else {
                shopFilters.$and = locationClauses;
            }

            const nearbyShopIds = await Shop.find(shopFilters).distinct('_id');
            if (!nearbyShopIds.length) {
                return res.status(200).json({ products: [] });
            }

            filters.shop = { $in: nearbyShopIds };
        }

        const [products, followedShopIds] = await Promise.all([
            Product.find(filters)
                .select('name price hideOriginalPrice images category description viewsCount shop createdAt')
                .populate('shop', 'name category location rating numRatings images allowPriceHide')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(),
            getFollowedShopIdsForUser(req.user?._id),
        ]);

        res.status(200).json({ products: mapProductsWithFollowState(products, followedShopIds) });
    } catch (error) {
        next(error);
    }
};

// @desc    Get recently viewed products for current user
// @route   GET /api/products/recently-viewed
// @access  Private
export const getRecentlyViewedProducts = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 30);
        const candidateLimit = Math.min(limit * 4, 120);

        const viewedRows = await ProductView.find({ user: req.user._id })
            .sort({ updatedAt: -1 })
            .limit(candidateLimit)
            .select('product')
            .lean();

        const orderedProductIds = [...new Set(
            viewedRows
                .map((entry) => entry.product?.toString())
                .filter(Boolean)
        )];

        if (!orderedProductIds.length) {
            return res.status(200).json({ products: [] });
        }

        const filters = {
            _id: {
                $in: orderedProductIds,
            },
        };

        if (req.query.category) {
            const normalizedCategory = normalizeCategory(req.query.category);
            if (!normalizedCategory) {
                res.status(400);
                throw new Error('Invalid product category');
            }
            filters.category = normalizedCategory;
        }

        const locationClauses = [];
        const cityClause = buildLocationFieldClause('location.city', req.query.city);
        const areaClause = buildLocationFieldClause('location.area', req.query.areas, req.query.area);

        if (cityClause) {
            locationClauses.push(cityClause);
        }
        if (areaClause) {
            locationClauses.push(areaClause);
        }

        if (locationClauses.length) {
            const shopFilters = {};

            if (locationClauses.length === 1) {
                Object.assign(shopFilters, locationClauses[0]);
            } else {
                shopFilters.$and = locationClauses;
            }

            const nearbyShopIds = await Shop.find(shopFilters).distinct('_id');
            if (!nearbyShopIds.length) {
                return res.status(200).json({ products: [] });
            }

            filters.shop = { $in: nearbyShopIds };
        }

        const [products, followedShopIds] = await Promise.all([
            Product.find(filters)
                .select('name price hideOriginalPrice images category description viewsCount shop createdAt')
                .populate('shop', 'name category location rating numRatings images allowPriceHide')
                .lean(),
            getFollowedShopIdsForUser(req.user?._id),
        ]);

        const productById = new Map(products.map((product) => [product._id.toString(), product]));
        const orderedProducts = orderedProductIds
            .map((id) => productById.get(id))
            .filter(Boolean)
            .slice(0, limit);

        res.status(200).json({
            products: mapProductsWithFollowState(orderedProducts, followedShopIds),
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get categories available for products
// @route   GET /api/products/categories
// @access  Public
export const getProductCategories = async (req, res) => {
    res.status(200).json({ categories: SHOP_CATEGORIES });
};
