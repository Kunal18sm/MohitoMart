import mongoose from 'mongoose';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import ShopRating from '../models/ShopRating.js';
import User from '../models/User.js';
import { SHOP_CATEGORIES, normalizeCategory } from '../constants/shopCategories.js';
import { destroyCloudinaryImages } from '../utils/cloudinaryCleanup.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeImages = (images) => {
    if (!Array.isArray(images)) {
        return [];
    }

    return images.map((image) => String(image).trim()).filter(Boolean);
};

const enforceImageRange = (images, entity) => {
    if (images.length < 3 || images.length > 5) {
        throw new Error(`${entity} images must be between 3 and 5`);
    }
};

const mapShopResponseWithFollowState = (shops, followedShopIds = new Set()) =>
    shops.map((shop) => ({
        ...shop.toObject(),
        isFollowed: followedShopIds.has(shop._id.toString()),
    }));

const recalculateShopRating = async (shopId) => {
    const [stats] = await ShopRating.aggregate([
        { $match: { shop: new mongoose.Types.ObjectId(shopId) } },
        {
            $group: {
                _id: '$shop',
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 },
            },
        },
    ]);

    const shop = await Shop.findById(shopId);
    if (!shop) {
        return null;
    }

    shop.rating = stats?.averageRating || 0;
    shop.numRatings = stats?.totalRatings || 0;
    await shop.save();

    return shop;
};

// @desc    Get shop categories
// @route   GET /api/shops/categories
// @access  Public
export const getShopCategories = async (req, res, next) => {
    try {
        const categoryUsage = await Shop.aggregate([
            {
                $group: {
                    _id: '$category',
                    totalShops: { $sum: 1 },
                },
            },
        ]);

        const usageMap = new Map(
            categoryUsage.map((entry) => [String(entry._id), Number(entry.totalShops || 0)])
        );

        const categories = [...SHOP_CATEGORIES].sort((left, right) => {
            const rightCount = usageMap.get(right) || 0;
            const leftCount = usageMap.get(left) || 0;
            return rightCount - leftCount;
        });

        res.status(200).json({ categories });
    } catch (error) {
        next(error);
    }
};

// @desc    Get nearby shops with filters
// @route   GET /api/shops
// @access  Public
export const getShops = async (req, res, next) => {
    try {
        const { city, area, category, keyword } = req.query;
        const page = Number(req.query.page || 1);
        const limit = Math.min(Number(req.query.limit || 12), 50);
        const skip = (page - 1) * limit;

        const filters = {};

        if (city) {
            filters['location.city'] = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
        }

        if (area) {
            filters['location.area'] = { $regex: `^${escapeRegex(area)}$`, $options: 'i' };
        }

        if (category) {
            const normalized = normalizeCategory(category);
            if (!normalized) {
                res.status(400);
                throw new Error('Invalid shop category');
            }
            filters.category = normalized;
        }

        if (keyword) {
            filters.name = { $regex: escapeRegex(keyword), $options: 'i' };
        }

        const [count, shops] = await Promise.all([
            Shop.countDocuments(filters),
            Shop.find(filters)
                .populate('owner', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        let followedShopIds = new Set();
        if (req.user?._id) {
            const user = await User.findById(req.user._id).select('followedShops');
            followedShopIds = new Set(user?.followedShops?.map((shopId) => shopId.toString()) || []);
        }

        res.status(200).json({
            shops: mapShopResponseWithFollowState(shops, followedShopIds),
            page,
            pages: Math.ceil(count / limit),
            total: count,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single shop + its products + ratings
// @route   GET /api/shops/:id
// @access  Public
export const getShopById = async (req, res, next) => {
    try {
        const shop = await Shop.findById(req.params.id).populate('owner', 'name');
        if (!shop) {
            res.status(404);
            throw new Error('Shop not found');
        }

        const [products, ratings] = await Promise.all([
            Product.find({ shop: shop._id }).sort({ createdAt: -1 }),
            ShopRating.find({ shop: shop._id })
                .sort({ createdAt: -1 })
                .limit(15)
                .populate('user', 'name'),
        ]);

        let isFollowed = false;
        if (req.user?._id) {
            const user = await User.findById(req.user._id).select('followedShops');
            isFollowed =
                user?.followedShops?.some((shopId) => shopId.toString() === req.params.id) || false;
        }

        res.status(200).json({
            shop: {
                ...shop.toObject(),
                isFollowed,
            },
            products,
            ratings,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create shop profile
// @route   POST /api/shops
// @access  Private (shop_owner/admin)
export const createShop = async (req, res, next) => {
    try {
        if (!['shop_owner', 'admin'].includes(req.user.role)) {
            res.status(403);
            throw new Error('Only shop owners can create shops');
        }

        const { name, category, city, area, address, images, mobile, mapUrl, description } = req.body;

        if (!name || !category || !city || !area || !mapUrl) {
            res.status(400);
            throw new Error('name, category, city, area and mapUrl are required');
        }

        const normalizedCategory = normalizeCategory(category);
        if (!normalizedCategory) {
            res.status(400);
            throw new Error('Invalid shop category');
        }

        const normalizedImages = normalizeImages(images);
        enforceImageRange(normalizedImages, 'Shop');

        const existingShop = await Shop.findOne({ owner: req.user._id });
        if (existingShop) {
            res.status(400);
            throw new Error('Each owner can create only one shop profile');
        }

        const shop = await Shop.create({
            owner: req.user._id,
            vendorId: `shop-${req.user._id.toString()}`,
            name,
            category: normalizedCategory,
            location: {
                city,
                area,
                address: address || '',
            },
            images: normalizedImages,
            mobile: mobile || '',
            mapUrl,
            description: description || '',
        });

        res.status(201).json(shop);
    } catch (error) {
        next(error);
    }
};

// @desc    Update shop profile
// @route   PUT /api/shops/:id
// @access  Private (owner/admin)
export const updateShop = async (req, res, next) => {
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) {
            res.status(404);
            throw new Error('Shop not found');
        }

        const isOwner = shop.owner.toString() === req.user._id.toString();
        if (!isOwner && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to update this shop');
        }

        if (req.body.category) {
            const normalizedCategory = normalizeCategory(req.body.category);
            if (!normalizedCategory) {
                res.status(400);
                throw new Error('Invalid shop category');
            }
            shop.category = normalizedCategory;
        }

        const previousImages = [...shop.images];
        let nextImages = previousImages;

        if (req.body.images) {
            const normalizedImages = normalizeImages(req.body.images);
            enforceImageRange(normalizedImages, 'Shop');
            shop.images = normalizedImages;
            nextImages = normalizedImages;
        }

        shop.name = req.body.name || shop.name;
        shop.location = {
            city: req.body.city || shop.location.city,
            area: req.body.area || shop.location.area,
            address:
                req.body.address !== undefined ? req.body.address : shop.location.address,
        };
        shop.mobile = req.body.mobile !== undefined ? req.body.mobile : shop.mobile;
        shop.mapUrl = req.body.mapUrl || shop.mapUrl;
        shop.description =
            req.body.description !== undefined ? req.body.description : shop.description;

        const updatedShop = await shop.save();

        if (req.body.images) {
            const removedImages = previousImages.filter((image) => !nextImages.includes(image));
            await destroyCloudinaryImages(removedImages);
        }

        res.status(200).json(updatedShop);
    } catch (error) {
        next(error);
    }
};

// @desc    Rate a shop (1-5) with optional comment
// @route   POST /api/shops/:id/rate
// @access  Private
export const rateShop = async (req, res, next) => {
    try {
        const { rating, comment } = req.body;
        const shop = await Shop.findById(req.params.id);

        if (!shop) {
            res.status(404);
            throw new Error('Shop not found');
        }

        const numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            res.status(400);
            throw new Error('rating must be between 1 and 5');
        }

        const existingRating = await ShopRating.findOne({
            shop: req.params.id,
            user: req.user._id,
        });

        if (existingRating) {
            existingRating.rating = numericRating;
            existingRating.comment = comment || '';
            await existingRating.save();
        } else {
            await ShopRating.create({
                shop: req.params.id,
                user: req.user._id,
                rating: numericRating,
                comment: comment || '',
            });
        }

        const updatedShop = await recalculateShopRating(req.params.id);

        res.status(200).json({
            message: existingRating ? 'Rating updated' : 'Rating submitted',
            shopRating: {
                rating: updatedShop.rating,
                numRatings: updatedShop.numRatings,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user's shops
// @route   GET /api/shops/me/owned
// @access  Private
export const getOwnedShops = async (req, res, next) => {
    try {
        const shops = await Shop.find({ owner: req.user._id }).sort({ createdAt: -1 });
        if (!shops.length) {
            return res.status(200).json({ shops: [] });
        }

        const ownedShopIds = shops.map((shop) => shop._id);
        const followerRows = await User.aggregate([
            { $match: { followedShops: { $in: ownedShopIds } } },
            { $unwind: '$followedShops' },
            { $match: { followedShops: { $in: ownedShopIds } } },
            {
                $group: {
                    _id: '$followedShops',
                    totalFollowers: { $sum: 1 },
                },
            },
        ]);

        const followersByShopId = new Map(
            followerRows.map((row) => [row._id.toString(), Number(row.totalFollowers || 0)])
        );

        const shopsWithFollowers = shops.map((shop) => ({
            ...shop.toObject(),
            totalFollowers: followersByShopId.get(shop._id.toString()) || 0,
        }));

        res.status(200).json({ shops: shopsWithFollowers });
    } catch (error) {
        next(error);
    }
};
