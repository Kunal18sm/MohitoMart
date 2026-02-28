import mongoose from 'mongoose';
import Service from '../models/Service.js';
import Shop from '../models/Shop.js';
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

const enforceImageRange = (images) => {
    if (images.length < 1 || images.length > 5) {
        throw new Error('Service images must be between 1 and 5');
    }
};

const parseNonNegativeNumber = (value, label) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        throw new Error(`${label} must be a valid non-negative number`);
    }
    return numeric;
};

const resolvePricing = (payload = {}, { requirePricing = false, existing = null } = {}) => {
    const hasRangeInput = payload.priceMin !== undefined || payload.priceMax !== undefined;
    const hasFixedInput = payload.price !== undefined;

    if (requirePricing && !hasRangeInput && !hasFixedInput) {
        throw new Error('price or price range is required');
    }

    if (hasRangeInput) {
        const min = parseNonNegativeNumber(
            payload.priceMin !== undefined ? payload.priceMin : payload.priceMax,
            'priceMin'
        );
        const max = parseNonNegativeNumber(
            payload.priceMax !== undefined ? payload.priceMax : payload.priceMin,
            'priceMax'
        );

        if (max < min) {
            throw new Error('priceMax must be greater than or equal to priceMin');
        }

        return {
            pricingType: min === max ? 'fixed' : 'range',
            price: min,
            priceMin: min,
            priceMax: max,
        };
    }

    if (hasFixedInput) {
        const fixedPrice = parseNonNegativeNumber(payload.price, 'price');
        return {
            pricingType: 'fixed',
            price: fixedPrice,
            priceMin: fixedPrice,
            priceMax: fixedPrice,
        };
    }

    if (!existing) {
        return null;
    }

    const existingMin =
        existing.priceMin !== undefined ? Number(existing.priceMin) : Number(existing.price || 0);
    const existingMax =
        existing.priceMax !== undefined ? Number(existing.priceMax) : Number(existing.price || 0);
    const min = Number.isFinite(existingMin) ? Math.max(existingMin, 0) : 0;
    const max = Number.isFinite(existingMax) ? Math.max(existingMax, min) : min;

    return {
        pricingType: min === max ? 'fixed' : 'range',
        price: min,
        priceMin: min,
        priceMax: max,
    };
};

const toAggregateMatch = (filters) => {
    const match = { ...filters };
    if (typeof match.shop === 'string' && mongoose.Types.ObjectId.isValid(match.shop)) {
        match.shop = new mongoose.Types.ObjectId(match.shop);
    }
    return match;
};

const mergeShopFilter = (existingShopFilter, nearbyShopIds) => {
    const nearbyIds = nearbyShopIds.map((id) => id.toString());

    if (!existingShopFilter) {
        return { $in: nearbyShopIds };
    }

    if (typeof existingShopFilter === 'string') {
        return nearbyIds.includes(existingShopFilter) ? existingShopFilter : null;
    }

    if (Array.isArray(existingShopFilter.$in)) {
        const currentIds = existingShopFilter.$in.map((id) => id.toString());
        const mergedIds = nearbyIds.filter((id) => currentIds.includes(id));
        return mergedIds.length ? { $in: mergedIds } : null;
    }

    return existingShopFilter;
};

// @desc    Fetch all services with pagination and filters
// @route   GET /api/services
// @access  Public
export const getServices = async (req, res, next) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1);
        const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50);
        const skip = (page - 1) * limit;

        const filters = {};

        if (req.query.category) {
            const normalizedCategory = normalizeCategory(req.query.category);
            if (!normalizedCategory) {
                res.status(400);
                throw new Error('Invalid service category');
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
                    services: [],
                    page,
                    pages: 0,
                    total: 0,
                });
            }

            const mergedShopFilter = mergeShopFilter(filters.shop, nearbyShopIds);
            if (!mergedShopFilter) {
                return res.status(200).json({
                    services: [],
                    page,
                    pages: 0,
                    total: 0,
                });
            }

            filters.shop = mergedShopFilter;
        }

        if (req.query.minPrice !== undefined) {
            const minPrice = parseNonNegativeNumber(req.query.minPrice, 'minPrice');
            filters.priceMax = { $gte: minPrice };
        }

        if (req.query.maxPrice !== undefined) {
            const maxPrice = parseNonNegativeNumber(req.query.maxPrice, 'maxPrice');
            filters.priceMin = { $lte: maxPrice };
        }

        const [count, services] = await Promise.all([
            Service.countDocuments(filters),
            Service.find(filters)
                .select('name pricingType price priceMin priceMax images category description shop createdAt')
                .populate('shop', 'name category location rating numRatings')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        res.status(200).json({
            services,
            page,
            pages: Math.ceil(count / limit),
            total: count,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get random services for discovery
// @route   GET /api/services/random
// @access  Public
export const getRandomServices = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 20);
        const match = {};

        if (req.query.category) {
            const normalizedCategory = normalizeCategory(req.query.category);
            if (!normalizedCategory) {
                res.status(400);
                throw new Error('Invalid service category');
            }
            match.category = normalizedCategory;
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
                return res.status(200).json({ services: [] });
            }

            match.shop = { $in: nearbyShopIds };
        }

        let services = await Service.aggregate([
            { $match: match },
            { $sample: { size: limit } },
        ]);

        services = await Service.populate(services, {
            path: 'shop',
            select: 'name category location rating numRatings',
        });

        res.status(200).json({ services });
    } catch (error) {
        next(error);
    }
};

// @desc    Fetch a single service
// @route   GET /api/services/:id
// @access  Public
export const getServiceById = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id)
            .select('name pricingType price priceMin priceMax images category description shop createdAt')
            .populate('shop', 'name category location rating numRatings mapUrl images mobile description')
            .lean();

        if (!service) {
            res.status(404);
            throw new Error('Service not found');
        }

        res.status(200).json(service);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private (shop owner/admin)
export const createService = async (req, res, next) => {
    try {
        const { name, images, description, shopId } = req.body;

        if (!name || !shopId) {
            res.status(400);
            throw new Error('name and shopId are required');
        }

        const shop = await Shop.findById(shopId).select('_id owner category').lean();
        if (!shop) {
            res.status(404);
            throw new Error('Shop not found');
        }

        const isOwner = shop.owner.toString() === String(req.user._id);
        if (!isOwner && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to add services to this shop');
        }

        const normalizedImages = normalizeImages(images);
        enforceImageRange(normalizedImages);

        const normalizedCategory = normalizeCategory(shop.category);
        if (!normalizedCategory) {
            res.status(400);
            throw new Error(`category must be one of: ${SHOP_CATEGORIES.join(', ')}`);
        }

        const pricing = resolvePricing(req.body, { requirePricing: true });
        if (!pricing) {
            res.status(400);
            throw new Error('price or price range is required');
        }

        const service = await Service.create({
            serviceId: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            pricingType: pricing.pricingType,
            price: pricing.price,
            priceMin: pricing.priceMin,
            priceMax: pricing.priceMax,
            images: normalizedImages,
            description: description || '',
            shop: shop._id,
            category: normalizedCategory,
        });

        res.status(201).json(service);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (owner/admin)
export const updateService = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            res.status(404);
            throw new Error('Service not found');
        }

        const shop = await Shop.findById(service.shop).select('owner category').lean();
        const isOwner = shop && shop.owner.toString() === String(req.user._id);
        if (!isOwner && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to update this service');
        }

        const previousImages = [...service.images];
        let nextImages = previousImages;

        if (req.body.images) {
            const normalizedImages = normalizeImages(req.body.images);
            enforceImageRange(normalizedImages);
            service.images = normalizedImages;
            nextImages = normalizedImages;
        }

        if (shop?.category) {
            const normalizedCategory = normalizeCategory(shop.category);
            if (normalizedCategory) {
                service.category = normalizedCategory;
            }
        }

        service.name = req.body.name || service.name;

        const pricing = resolvePricing(req.body, { existing: service });
        if (pricing) {
            service.pricingType = pricing.pricingType;
            service.price = pricing.price;
            service.priceMin = pricing.priceMin;
            service.priceMax = pricing.priceMax;
        }

        service.description =
            req.body.description !== undefined ? req.body.description : service.description;

        const updatedService = await service.save();

        if (req.body.images) {
            const removedImages = previousImages.filter((image) => !nextImages.includes(image));
            await destroyCloudinaryImages(removedImages);
        }

        res.status(200).json(updatedService);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (owner/admin)
export const deleteService = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            res.status(404);
            throw new Error('Service not found');
        }

        const shop = await Shop.findById(service.shop).select('owner').lean();
        const isOwner = shop && shop.owner.toString() === String(req.user._id);
        if (!isOwner && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to delete this service');
        }

        const serviceImages = [...service.images];
        await Service.deleteOne({ _id: service._id });
        await destroyCloudinaryImages(serviceImages);

        res.status(200).json({ message: 'Service removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get services for current shop owner
// @route   GET /api/services/me/list
// @access  Private
export const getMyServices = async (req, res, next) => {
    try {
        if (!['shop_owner', 'admin'].includes(req.user.role)) {
            res.status(403);
            throw new Error('Only shop owners can access this endpoint');
        }

        const ownedShopIds = await Shop.find({ owner: req.user._id }).distinct('_id');

        if (!ownedShopIds.length) {
            return res.status(200).json({
                services: [],
                summary: {
                    totalServices: 0,
                },
            });
        }

        const filters = { shop: { $in: ownedShopIds } };

        if (req.query.shopId) {
            const requestedShopId = req.query.shopId;
            const ownedShopId =
                ownedShopIds.find((shopId) => shopId.toString() === requestedShopId) || null;

            if (!ownedShopId && req.user.role !== 'admin') {
                res.status(403);
                throw new Error('Not authorized to access this shop services');
            }

            filters.shop = ownedShopId || requestedShopId;
        }

        const statsOnly = ['1', 'true'].includes(
            String(req.query.statsOnly || '').trim().toLowerCase()
        );

        if (statsOnly) {
            const aggregateMatch = toAggregateMatch(filters);
            const [summary] = await Service.aggregate([
                { $match: aggregateMatch },
                {
                    $group: {
                        _id: null,
                        totalServices: { $sum: 1 },
                    },
                },
            ]);

            return res.status(200).json({
                services: [],
                summary: {
                    totalServices: Number(summary?.totalServices || 0),
                },
            });
        }

        const aggregateMatch = toAggregateMatch(filters);
        const [services, summary] = await Promise.all([
            Service.find(filters)
                .populate('shop', 'name category location images')
                .sort({ createdAt: -1 })
                .lean(),
            Service.aggregate([
                { $match: aggregateMatch },
                {
                    $group: {
                        _id: null,
                        totalServices: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const aggregateSummary = summary?.[0];

        res.status(200).json({
            services,
            summary: {
                totalServices: Number(aggregateSummary?.totalServices || 0),
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get categories available for services
// @route   GET /api/services/categories
// @access  Public
export const getServiceCategories = async (req, res) => {
    res.status(200).json({ categories: SHOP_CATEGORIES });
};
