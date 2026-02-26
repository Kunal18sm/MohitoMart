import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
    const cloudName = process.env.CLOUD_NAME;
    const apiKey = process.env.CLOUD_API_KEY;
    const apiSecret = process.env.CLOUD_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        console.warn(
            'Cloudinary env vars are missing (CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET). Upload endpoint will fail until configured.'
        );
        return;
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    });
};

export { cloudinary, configureCloudinary };
