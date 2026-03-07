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

const LOCATION_SUGGESTION_CACHE_TTL_MS = 5 * 60 * 1000;
const locationSuggestionCache = new Map();
const REVERSE_GEOCODE_CACHE_TTL_MS = 30 * 60 * 1000;
const REVERSE_GEOCODE_CACHE_MAX_ENTRIES = 300;
const REVERSE_GEOCODE_CACHE_PRECISION = 3;
const reverseGeocodeCache = new Map();

const getLocationSuggestionCacheKey = (limit) => `locations:${limit}`;
const clearLocationSuggestionCache = () => {
    locationSuggestionCache.clear();
};
const buildNominatimUrl = (latitude, longitude) =>
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${latitude}&lon=${longitude}`;
const buildBigDataCloudUrl = (latitude, longitude) =>
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
const normalizeGeocodeLabel = (value) => String(value || '').trim();
const buildReverseGeocodeCacheKey = (latitude, longitude) =>
    `${Number(latitude).toFixed(REVERSE_GEOCODE_CACHE_PRECISION)}:${Number(longitude).toFixed(REVERSE_GEOCODE_CACHE_PRECISION)}`;

const pickReverseGeocodeCandidate = (candidates = [], excludedValues = []) => {
    const excludedSet = new Set(
        excludedValues
            .map((entry) => normalizeGeocodeLabel(entry).toLowerCase())
            .filter(Boolean)
    );

    for (const candidate of candidates) {
        const normalized = normalizeGeocodeLabel(candidate);
        if (!normalized || excludedSet.has(normalized.toLowerCase())) {
            continue;
        }

        return normalized;
    }

    return '';
};

const parseNominatimAddress = (payload = {}) => {
    const address = payload.address || {};
    const city = pickReverseGeocodeCandidate([
        address.city,
        address.town,
        address.municipality,
        address.city_district,
        address.county,
        address.state_district,
        address.state,
    ]);
    const area = pickReverseGeocodeCandidate(
        [
            address.suburb,
            address.neighbourhood,
            address.residential,
            address.quarter,
            address.city_district,
            address.district,
            address.borough,
            address.village,
            address.hamlet,
            address.road,
            address.postcode,
        ],
        [city]
    );

    return { city, area };
};

const parseBigDataCloudAddress = (payload = {}) => {
    const administrativeNames = Array.isArray(payload.localityInfo?.administrative)
        ? payload.localityInfo.administrative.map((entry) => entry?.name)
        : [];
    const informativeNames = Array.isArray(payload.localityInfo?.informative)
        ? payload.localityInfo.informative.map((entry) => entry?.name)
        : [];

    const city = pickReverseGeocodeCandidate([
        payload.city,
        payload.locality,
        payload.principalSubdivision,
        ...administrativeNames,
    ]);
    const area = pickReverseGeocodeCandidate(
        [
            payload.locality,
            ...informativeNames,
            ...administrativeNames,
            payload.postcode,
        ],
        [city]
    );

    return { city, area };
};

const readReverseGeocodeCache = (latitude, longitude) => {
    const cacheKey = buildReverseGeocodeCacheKey(latitude, longitude);
    const cacheEntry = reverseGeocodeCache.get(cacheKey);
    if (!cacheEntry || cacheEntry.expiresAt <= Date.now()) {
        reverseGeocodeCache.delete(cacheKey);
        return null;
    }

    return cacheEntry.payload;
};

const pruneReverseGeocodeCache = () => {
    if (reverseGeocodeCache.size <= REVERSE_GEOCODE_CACHE_MAX_ENTRIES) {
        return;
    }

    const entries = [...reverseGeocodeCache.entries()].sort(
        (left, right) => Number(left[1]?.expiresAt || 0) - Number(right[1]?.expiresAt || 0)
    );
    const removableCount = Math.max(0, entries.length - REVERSE_GEOCODE_CACHE_MAX_ENTRIES);
    for (let index = 0; index < removableCount; index += 1) {
        reverseGeocodeCache.delete(entries[index][0]);
    }
};

const writeReverseGeocodeCache = (latitude, longitude, payload) => {
    reverseGeocodeCache.set(buildReverseGeocodeCacheKey(latitude, longitude), {
        expiresAt: Date.now() + REVERSE_GEOCODE_CACHE_TTL_MS,
        payload,
    });
    pruneReverseGeocodeCache();
};

const fetchReverseGeocodeJson = async (url) => {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'Accept-Language': 'en',
            'User-Agent': process.env.REVERSE_GEOCODE_USER_AGENT || 'MohitoMart/1.0',
        },
    });

    if (!response.ok) {
        throw new Error(`Reverse geocode request failed with status ${response.status}`);
    }

    return response.json();
};

const mergeReverseGeocodeResults = (providerResults = []) => {
    const cityCandidates = [];
    const areaCandidates = [];

    providerResults.forEach((entry) => {
        if (!entry) {
            return;
        }

        cityCandidates.push(entry.location?.city, entry.fallbackCity);
        areaCandidates.push(entry.location?.area, entry.fallbackArea);
    });

    const city = pickReverseGeocodeCandidate(cityCandidates);
    const area = pickReverseGeocodeCandidate(areaCandidates, [city]);

    return {
        area: normalizeLocationLabel(area),
        city: normalizeLocationLabel(city),
    };
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

const resolveShopSort = (sortValue) => {
    const normalized = String(sortValue || 'latest').trim().toLowerCase();
    const sortMap = {
        latest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        rating_desc: { rating: -1, numRatings: -1, createdAt: -1 },
        rating_asc: { rating: 1, createdAt: -1 },
        name_asc: { name: 1 },
        name_desc: { name: -1 },
    };

    return sortMap[normalized] || sortMap.latest;
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
        const cacheKey = getLocationSuggestionCacheKey(limit);
        const cacheEntry = locationSuggestionCache.get(cacheKey);
        if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
            return res.status(200).json(cacheEntry.payload);
        }

        const groupedLocations = await Shop.aggregate([
            {
                $project: {
                    city: {
                        $trim: {
                            input: { $ifNull: ['$location.city', ''] },
                        },
                    },
                    area: {
                        $trim: {
                            input: { $ifNull: ['$location.area', ''] },
                        },
                    },
                },
            },
            {
                $match: {
                    city: { $ne: '' },
                    area: { $ne: '' },
                },
            },
            {
                $addFields: {
                    cityKey: { $toLower: '$city' },
                    areaKey: { $toLower: '$area' },
                },
            },
            {
                $group: {
                    _id: {
                        city: '$cityKey',
                        area: '$areaKey',
                    },
                    city: { $first: '$city' },
                    area: { $first: '$area' },
                    totalShops: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    city: 1,
                    area: 1,
                    totalShops: 1,
                },
            },
            { $sort: { city: 1, area: 1 } },
            { $limit: limit },
        ]);

        const locations = groupedLocations.map((entry) => ({
            city: normalizeLocationLabel(entry.city),
            area: normalizeLocationLabel(entry.area),
            totalShops: Number(entry.totalShops || 0),
        }));

        const cities = [...new Set(locations.map((entry) => entry.city))];
        const areas = [...new Set(locations.map((entry) => entry.area))];
        const payload = {
            locations,
            cities,
            areas,
        };

        locationSuggestionCache.set(cacheKey, {
            expiresAt: Date.now() + LOCATION_SUGGESTION_CACHE_TTL_MS,
            payload,
        });

        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

// @desc    Reverse geocode coordinates through the backend with caching
// @route   GET /api/shops/reverse-geocode
// @access  Public
export const reverseGeocodeCoordinates = async (req, res, next) => {
    try {
        const latitude = Number(req.query.latitude ?? req.query.lat);
        const longitude = Number(req.query.longitude ?? req.query.lon);

        const hasValidLatitude = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
        const hasValidLongitude = Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

        if (!hasValidLatitude || !hasValidLongitude) {
            res.status(400);
            throw new Error('Valid latitude and longitude are required.');
        }

        const cachedPayload = readReverseGeocodeCache(latitude, longitude);
        if (cachedPayload) {
            return res.status(200).json({
                ...cachedPayload,
                cached: true,
            });
        }

        const providerResults = [];

        try {
            const nominatimPayload = await fetchReverseGeocodeJson(buildNominatimUrl(latitude, longitude));
            const location = parseNominatimAddress(nominatimPayload);
            providerResults.push({
                location,
                fallbackCity: nominatimPayload?.address?.state,
                fallbackArea: nominatimPayload?.address?.road,
            });

            if (location.city && location.area) {
                const payload = mergeReverseGeocodeResults(providerResults);
                writeReverseGeocodeCache(latitude, longitude, payload);
                return res.status(200).json(payload);
            }
        } catch (error) {
            // Continue to the secondary provider if the primary provider fails.
        }

        try {
            const bigDataPayload = await fetchReverseGeocodeJson(buildBigDataCloudUrl(latitude, longitude));
            providerResults.push({
                location: parseBigDataCloudAddress(bigDataPayload),
                fallbackCity: bigDataPayload?.principalSubdivision,
                fallbackArea: bigDataPayload?.postcode,
            });
        } catch (error) {
            // Fall through and return the best available primary result, if any.
        }

        const payload = mergeReverseGeocodeResults(providerResults);
        if (!payload.city && !payload.area) {
            res.status(502);
            throw new Error('Unable to determine city or area for the provided coordinates.');
        }

        writeReverseGeocodeCache(latitude, longitude, payload);
        return res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

// @desc    Get nearby shops with filters
// @route   GET /api/shops
// @access  Public
export const getShops = async (req, res, next) => {
    try {
        const { city, area, areas, category, keyword, sort } = req.query;
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

        const sortClause = resolveShopSort(sort);

        const [count, shops] = await Promise.all([
            Shop.countDocuments(filters),
            Shop.find(filters)
                .select(
                    'owner name category location images mobile mapUrl description allowPriceHide rating numRatings createdAt'
                )
                .populate('owner', 'name')
                .sort(sortClause)
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

        if (!name || !category || !normalizedCity || !normalizedArea) {
            res.status(400);
            throw new Error('name, category, city and area are required');
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
            mapUrl: mapUrl || '',
            description: description || '',
        });
        clearLocationSuggestionCache();

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
        shop.mapUrl = req.body.mapUrl !== undefined ? req.body.mapUrl : shop.mapUrl;
        shop.description =
            req.body.description !== undefined ? req.body.description : shop.description;
        const previousAllowPriceHide = Boolean(shop.allowPriceHide);

        if (req.body.allowPriceHide !== undefined && req.user.role === 'admin') {
            shop.allowPriceHide = normalizeBoolean(req.body.allowPriceHide, shop.allowPriceHide);
        }

        const updatedShop = await shop.save();
        clearLocationSuggestionCache();

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

// @desc    Rate a shop (1-5) with comment
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
        const normalizedComment = String(comment || '').trim();
        if (!normalizedComment) {
            res.status(400);
            throw new Error('comment is required');
        }

        const existingRating = await ShopRating.findOne({
            shop: req.params.id,
            user: req.user._id,
        });

        if (existingRating) {
            existingRating.rating = numericRating;
            existingRating.comment = normalizedComment;
            await existingRating.save();
        } else {
            await ShopRating.create({
                shop: req.params.id,
                user: req.user._id,
                rating: numericRating,
                comment: normalizedComment,
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
