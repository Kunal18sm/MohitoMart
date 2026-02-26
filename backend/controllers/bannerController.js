import HomeBanner from '../models/HomeBanner.js';
import { destroyCloudinaryImages } from '../utils/cloudinaryCleanup.js';

const normalizeImages = (images) => {
    if (!Array.isArray(images)) {
        return [];
    }

    return images.map((image) => String(image || '').trim()).filter(Boolean);
};

const isCloudinaryUrl = (url) =>
    typeof url === 'string' && /^https?:\/\/res\.cloudinary\.com\//i.test(url);

// @desc    Get home banner images
// @route   GET /api/banners/home
// @access  Public
export const getHomeBanner = async (req, res, next) => {
    try {
        const banner = await HomeBanner.findOne({ key: 'home' }).lean();
        const images = Array.isArray(banner?.images) ? banner.images.filter(Boolean) : [];

        res.status(200).json({
            images,
            updatedAt: banner?.updatedAt || null,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update home banner images
// @route   PUT /api/banners/home
// @access  Private/Admin
export const updateHomeBanner = async (req, res, next) => {
    try {
        const normalizedImages = normalizeImages(req.body.images);

        if (normalizedImages.length !== 3) {
            res.status(400);
            throw new Error('Please provide exactly 3 banner images');
        }

        if (!normalizedImages.every(isCloudinaryUrl)) {
            res.status(400);
            throw new Error('Banner images must be valid Cloudinary URLs');
        }

        const existingBanner = await HomeBanner.findOne({ key: 'home' });
        const previousImages = existingBanner?.images || [];

        let banner = existingBanner;
        if (!banner) {
            banner = await HomeBanner.create({
                key: 'home',
                images: normalizedImages,
                updatedBy: req.user._id,
            });
        } else {
            banner.images = normalizedImages;
            banner.updatedBy = req.user._id;
            await banner.save();
        }

        const removedImages = previousImages.filter(
            (image) => !normalizedImages.includes(image)
        );
        await destroyCloudinaryImages(removedImages);

        res.status(200).json({
            images: banner.images,
            updatedAt: banner.updatedAt,
        });
    } catch (error) {
        next(error);
    }
};
