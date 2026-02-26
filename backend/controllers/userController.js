import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';

const mapProductsAsFollowed = (products) =>
    products.map((product) => {
        const rawProduct = typeof product?.toObject === 'function' ? product.toObject() : product;
        if (!rawProduct?.shop || typeof rawProduct.shop !== 'object') {
            return rawProduct;
        }

        return {
            ...rawProduct,
            shop: {
                ...rawProduct.shop,
                isFollowed: true,
            },
        };
    });

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).populate(
            'followedShops',
            'name category location images rating numRatings'
        );

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
            user.email = req.body.email
                ? String(req.body.email).trim().toLowerCase()
                : user.email;
            user.username = user.email;
            user.location = {
                city: req.body.city || user.location.city,
                area: req.body.area || user.location.area,
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
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) {
            res.status(404);
            throw new Error('Shop not found');
        }

        const user = await User.findById(req.user._id);
        const alreadyFollowing = user.followedShops.some(
            (shopId) => shopId.toString() === req.params.shopId
        );

        if (!alreadyFollowing) {
            user.followedShops.push(req.params.shopId);
            await user.save();
        }

        res.status(200).json({
            message: alreadyFollowing ? 'Shop already followed' : 'Shop followed',
            followedShopsCount: user.followedShops.length,
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
        const user = await User.findById(req.user._id);

        user.followedShops = user.followedShops.filter(
            (shopId) => shopId.toString() !== req.params.shopId
        );
        await user.save();

        res.status(200).json({
            message: 'Shop unfollowed',
            followedShopsCount: user.followedShops.length,
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
        const user = await User.findById(req.user._id).select('followedShops');

        if (!user.followedShops.length) {
            return res.status(200).json({ products: [] });
        }

        const products = await Product.find({ shop: { $in: user.followedShops } })
            .populate('shop', 'name category location images rating numRatings')
            .sort({ createdAt: -1 })
            .limit(30);

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
        const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 25);
        const user = await User.findById(req.user._id).select('followedShops');

        if (!user.followedShops.length) {
            return res.status(200).json({ products: [] });
        }

        let products = await Product.aggregate([
            { $match: { shop: { $in: user.followedShops } } },
            { $sample: { size: limit } },
        ]);

        products = await Product.populate(products, {
            path: 'shop',
            select: 'name category location images rating numRatings',
        });

        res.status(200).json({ products: mapProductsAsFollowed(products) });
    } catch (error) {
        next(error);
    }
};
