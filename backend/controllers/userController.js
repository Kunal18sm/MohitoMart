import mongoose from 'mongoose';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import { buildLocationFieldClause, normalizeLocationLabel } from '../utils/locationNormalizer.js';

const mapProductsAsFollowed = (products) =>
    products.map((product) => {
        const rawProduct = typeof product?.toObject === 'function' ? product.toObject() : product;
        if (!rawProduct?.shop || typeof rawProduct.shop !== 'object') {
            return rawProduct;
        }
        const hidePriceAccessEnabled =
            rawProduct.shop.allowPriceHide === undefined ? true : Boolean(rawProduct.shop.allowPriceHide);

        return {
            ...rawProduct,
            hideOriginalPrice: Boolean(rawProduct.hideOriginalPrice && hidePriceAccessEnabled),
            shop: {
                ...rawProduct.shop,
                isFollowed: true,
            },
        };
    });

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

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).populate(
            'followedShops',
            'name category location images rating numRatings'
        ).lean();

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                followedShops: user.followedShops,
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.username = user.email;
            user.location = {
                city:
                    req.body.city !== undefined
                        ? normalizeLocationLabel(req.body.city) || user.location.city
                        : user.location.city,
                area:
                    req.body.area !== undefined
                        ? normalizeLocationLabel(req.body.area) || user.location.area
                        : user.location.area,
            };

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                location: updatedUser.location,
                followedShopsCount: updatedUser.followedShops?.length || 0,
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Follow a shop
// @route   POST /api/users/follows/:shopId
// @access  Private
export const followShop = async (req, res, next) => {
    try {
        const shop = await Shop.exists({ _id: req.params.shopId });
        if (!shop) {
            res.status(404);
            throw new Error('Shop not found');
        }

        const updateResult = await User.updateOne(
            { _id: req.user._id },
            { $addToSet: { followedShops: req.params.shopId } }
        );
        const user = await User.findById(req.user._id).select('followedShops').lean();
        const alreadyFollowing = updateResult.modifiedCount === 0;

        res.status(200).json({
            message: alreadyFollowing ? 'Shop already followed' : 'Shop followed',
            followedShopsCount: user?.followedShops?.length || 0,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Unfollow a shop
// @route   DELETE /api/users/follows/:shopId
// @access  Private
export const unfollowShop = async (req, res, next) => {
    try {
        await User.updateOne(
            { _id: req.user._id },
            { $pull: { followedShops: req.params.shopId } }
        );
        const user = await User.findById(req.user._id).select('followedShops').lean();

        res.status(200).json({
            message: 'Shop unfollowed',
            followedShopsCount: user?.followedShops?.length || 0,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get latest products from followed shops
// @route   GET /api/users/feed/followed
// @access  Private
export const getFollowedFeed = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('followedShops').lean();

        if (!user.followedShops.length) {
            return res.status(200).json({ products: [] });
        }

        const products = await Product.find({ shop: { $in: user.followedShops } })
            .select('shop name images category description price hideOriginalPrice viewsCount createdAt')
            .populate('shop', 'name category location images rating numRatings allowPriceHide')
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        res.status(200).json({ products: mapProductsAsFollowed(products) });
    } catch (error) {
        next(error);
    }
};

// @desc    Get random products from followed shops
// @route   GET /api/users/feed/followed/random
// @access  Private
export const getFollowedFeedRandom = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 40);
        const user = await User.findById(req.user._id).select('followedShops').lean();

        if (!user.followedShops.length) {
            return res.status(200).json({ products: [] });
        }

        const excludedProductIds = parseObjectIdList(req.query.excludeIds);
        let targetShopIds = [...user.followedShops];
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
            const shopFilters = {
                _id: { $in: targetShopIds },
            };

            if (locationClauses.length === 1) {
                Object.assign(shopFilters, locationClauses[0]);
            } else {
                shopFilters.$and = locationClauses;
            }

            targetShopIds = await Shop.find(shopFilters).distinct('_id');
            if (!targetShopIds.length) {
                return res.status(200).json({ products: [] });
            }
        }

        const productMatch = { shop: { $in: targetShopIds } };
        if (excludedProductIds.length) {
            productMatch._id = { $nin: excludedProductIds };
        }

        let products = await Product.aggregate([
            { $match: productMatch },
            { $sample: { size: limit } },
        ]);

        products = await Product.populate(products, {
            path: 'shop',
            select: 'name category location images rating numRatings allowPriceHide',
        });

        res.status(200).json({ products: mapProductsAsFollowed(products) });
    } catch (error) {
        next(error);
    }
};
