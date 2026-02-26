import mongoose from 'mongoose';

const imageValidation = {
    validator: (images) => Array.isArray(images) && images.length === 3,
    message: 'Home banner must contain exactly 3 images',
};

const homeBannerSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: 'home',
            trim: true,
        },
        images: {
            type: [String],
            required: true,
            validate: imageValidation,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { timestamps: true }
);

const HomeBanner = mongoose.model('HomeBanner', homeBannerSchema);
export default HomeBanner;

