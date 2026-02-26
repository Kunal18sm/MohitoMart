import { cloudinary } from '../config/cloudinary.js';

const CLOUDINARY_HOST_FRAGMENT = 'res.cloudinary.com';

const extractCloudinaryPublicId = (imageUrl) => {
    try {
        if (typeof imageUrl !== 'string' || !imageUrl.includes(CLOUDINARY_HOST_FRAGMENT)) {
            return null;
        }

        const parsedUrl = new URL(imageUrl);
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
        const uploadIndex = pathSegments.findIndex((segment) => segment === 'upload');

        if (uploadIndex === -1) {
            return null;
        }

        const segmentsAfterUpload = pathSegments.slice(uploadIndex + 1);
        if (!segmentsAfterUpload.length) {
            return null;
        }

        const versionIndex = segmentsAfterUpload.findIndex((segment) => /^v\d+$/.test(segment));
        const publicIdSegments =
            versionIndex >= 0
                ? segmentsAfterUpload.slice(versionIndex + 1)
                : segmentsAfterUpload;

        if (!publicIdSegments.length) {
            return null;
        }

        const lastSegmentIndex = publicIdSegments.length - 1;
        publicIdSegments[lastSegmentIndex] = publicIdSegments[lastSegmentIndex].replace(/\.[^.]+$/, '');

        return decodeURIComponent(publicIdSegments.join('/'));
    } catch (error) {
        return null;
    }
};

export const destroyCloudinaryImages = async (imageUrls = []) => {
    const publicIds = [
        ...new Set(
            imageUrls
                .map((imageUrl) => extractCloudinaryPublicId(imageUrl))
                .filter(Boolean)
        ),
    ];

    if (!publicIds.length) {
        return;
    }

    const results = await Promise.allSettled(
        publicIds.map((publicId) =>
            cloudinary.uploader.destroy(publicId, {
                resource_type: 'image',
            })
        )
    );

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.warn(`Cloudinary delete failed for ${publicIds[index]}: ${result.reason?.message || 'unknown error'}`);
        }
    });
};
