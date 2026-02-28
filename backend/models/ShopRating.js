import mongoose from 'mongoose';

const shopRatingSchema = new mongoose.Schema(
    {
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

shopRatingSchema.index({ shop: 1, user: 1 }, { unique: true });
shopRatingSchema.index({ shop: 1, createdAt: -1 });

const ShopRating = mongoose.model('ShopRating', shopRatingSchema);
export default ShopRating;
