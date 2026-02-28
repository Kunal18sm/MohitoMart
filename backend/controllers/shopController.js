import mongoose from 'mongoose';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import Service from '../models/Service.js';
import ShopRating from '../models/ShopRating.js';
import User from '../models/User.js';
import { SHOP_CATEGORIES, normalizeCategory } from '../constants/shopCategories.js';
import { destroyCloudinaryImages } from '../utils/cloudinaryCleanup.js';
import {
    buildLocationFieldClause,
    normalizeLocationKey,
    normalizeLocationLabel,
} from '../utils/locationNormalizer.js';

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

const enforceImageRange = (images, entity) => {
    if (images.length < 1 || images.length > 5) {
        throw new Error(`${entity} images must be between 1 and 5`);
    }
};

const mapShopResponseWithFollowState = (shops, followedShopIds = new Set()) =>
    shops.map((shop) => ({
        ...(typeof shop?.toObject === 'function' ? shop.toObject() : shop),
        isFollowed: followedShopIds.has(shop._id.toString()),
    }));

const getFollowedShopIdsForUser = async (userId) => {
    if (!userId) {
        return new Set();
    }

    const user = await User.findById(userId).select('followedShops').lean();
    return new Set(user?.followedShops?.map((shopId) => shopId.toString()) || []);
};

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

    return await Shop.findByIdAndUpdate(
        shopId,
        {
            rating: stats?.averageRating || 0,
            numRatings: stats?.totalRatings || 0,
        },
        {
            new: true,
            select: 'rating numRatings',
        }
    );
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

// @desc    Get listed shop locations for suggestions
// @route   GET /api/shops/locations
// @access  Public
export const getShopLocations = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 500), 1), 2000);

        const rawLocations = await Shop.find({})
            .select('location.city location.area')
            .lean();

        const groupedLocations = new Map();
        rawLocations.forEach((shop) => {
            const normalizedCity = normalizeLocationLabel(shop?.location?.city);
            const normalizedArea = normalizeLocationLabel(shop?.location?.area);

            if (!normalizedCity || !normalizedArea) {
                return;
            }

            const locationKey = `${normalizeLocationKey(normalizedCity)}|${normalizeLocationKey(normalizedArea)}`;
            const existing = groupedLocations.get(locationKey);

            if (!existing) {
                groupedLocations.set(locationKey, {
                    city: normalizedCity,
                    area: normalizedArea,
                    totalShops: 1,
                });
                return;
            }

            existing.totalShops += 1;
        });

        const locations = [...groupedLocations.values()]
            .sort((left, right) => {
                const cityComparison = left.city.localeCompare(right.city, undefined, {
                    sensitivity: 'base',
                });
                if (cityComparison !== 0) {
                    return cityComparison;
                }
                return left.area.localeCompare(right.area, undefined, { sensitivity: 'base' });
            })
            .slice(0, limit);

        const cities = [...new Set(locations.map((entry) => entry.city))];
        const areas = [...new Set(locations.map((entry) => entry.area))];

        res.status(200).json({
            locations,
            cities,
            areas,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get nearby shops with filters
// @route   GET /api/shops
// @access  Public
export const getShops = async (req, res, next) => {
    try {
        const { city, area, areas, category, keyword } = req.query;
        const page = Math.max(Number(req.query.page || 1), 1);
        const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50);
        const skip = (page - 1) * limit;

        const filters = {};
        const locationClauses = [];

        const cityClause = buildLocationFieldClause('location.city', city);
        if (cityClause) {
            locationClauses.push(cityClause);
        }

        const areaClause = buildLocationFieldClause('location.area', areas, area);
        if (areaClause) {
            locationClauses.push(areaClause);
        }

        if (locationClauses.length === 1) {
            Object.assign(filters, locationClauses[0]);
        } else if (locationClauses.length > 1) {
            filters.$and = locationClauses;
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
                .select(
                    'owner name category location images mobile mapUrl description allowPriceHide rating numRatings createdAt'
                )
                .populate('owner', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const followedShopIds = await getFollowedShopIdsForUser(req.user?._id);

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
        const shop = await Shop.findById(req.params.id)
            .select(
                'owner name category location images mobile mapUrl description allowPriceHide rating numRatings createdAt'
            )
            .populate('owner', 'name')
            .lean();
        if (!shop) {
            res.status(404);
            throw new Error('Shop not found');
        }

        const [products, services, ratings] = await Promise.all([
            Product.find({ shop: shop._id })
                .select('shop name images category description price hideOriginalPrice viewsCount createdAt')
                .sort({ createdAt: -1 })
                .lean(),
            Service.find({ shop: shop._id })
                .select('shop name images category description pricingType price priceMin priceMax createdAt')
                .sort({ createdAt: -1 })
                .lean(),
            ShopRating.find({ shop: shop._id })
                .select('user rating comment createdAt')
                .sort({ createdAt: -1 })
                .limit(15)
                .populate('user', 'name')
                .lean(),
        ]);

        let isFollowed = false;
        if (req.user?._id) {
            const followRecord = await User.exists({
                _id: req.user._id,
                followedShops: shop._id,
            });
            isFollowed = Boolean(followRecord);
        }

        res.status(200).json({
            shop: {
                ...shop,
                isFollowed,
            },
            products,
            services,
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
        const normalizedCity = normalizeLocationLabel(city);
        const normalizedArea = normalizeLocationLabel(area);

        if (!name || !category || !normalizedCity || !normalizedArea || !mapUrl) {
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

        const existingShop = await Shop.findOne({ owner: req.user._id }).select('_id').lean();
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
                city: normalizedCity,
                area: normalizedArea,
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

        if (req.body.allowPriceHide !== undefined && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Only admin can change hidden price access');
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
            city:
                req.body.city !== undefined
                    ? normalizeLocationLabel(req.body.city) || shop.location.city
                    : shop.location.city,
            area:
                req.body.area !== undefined
                    ? normalizeLocationLabel(req.body.area) || shop.location.area
                    : shop.location.area,
            address:
                req.body.address !== undefined ? req.body.address : shop.location.address,
        };
        shop.mobile = req.body.mobile !== undefined ? req.body.mobile : shop.mobile;
        shop.mapUrl = req.body.mapUrl || shop.mapUrl;
        shop.description =
            req.body.description !== undefined ? req.body.description : shop.description;
        const previousAllowPriceHide = Boolean(shop.allowPriceHide);

        if (req.body.allowPriceHide !== undefined && req.user.role === 'admin') {
            shop.allowPriceHide = normalizeBoolean(req.body.allowPriceHide, shop.allowPriceHide);
        }

        const updatedShop = await shop.save();

        if (previousAllowPriceHide && !updatedShop.allowPriceHide) {
            await Product.updateMany(
                { shop: updatedShop._id },
                { $set: { hideOriginalPrice: false } }
            );
        }

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
                rating: Number(updatedShop?.rating || 0),
                numRatings: Number(updatedShop?.numRatings || 0),
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
        const shops = await Shop.find({ owner: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
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
            ...shop,
            totalFollowers: followersByShopId.get(shop._id.toString()) || 0,
        }));

        res.status(200).json({ shops: shopsWithFollowers });
    } catch (error) {
        next(error);
    }
};
