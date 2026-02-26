import { cloudinary } from '../config/cloudinary.js';

// @desc    Upload image to Cloudinary
// @route   POST /api/uploads/image
// @access  Private
export const uploadImage = async (req, res, next) => {
    try {
        const { image, folder } = req.body;

        if (!process.env.CLOUD_NAME || !process.env.CLOUD_API_KEY || !process.env.CLOUD_API_SECRET) {
            res.status(500);
            throw new Error(
                'Cloudinary configuration missing. Please set CLOUD_NAME, CLOUD_API_KEY, and CLOUD_API_SECRET'
            );
        }

        if (!image || typeof image !== 'string') {
            res.status(400);
            throw new Error('image field is required (base64 string or public URL)');
        }

        const uploadResult = await cloudinary.uploader.upload(image, {
            folder: folder || 'mohito-mart',
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        });

        res.status(201).json({
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
        });
    } catch (error) {
        if (error.http_code === 400 && error.message?.toLowerCase().includes('file size too large')) {
            res.status(400);
            return next(new Error('Image file size is too large for upload'));
        }

        next(error);
    }
};
