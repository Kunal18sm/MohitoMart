import mongoose from 'mongoose';
import { SHOP_CATEGORIES } from '../constants/shopCategories.js';

const imageValidation = {
    validator: (images) => Array.isArray(images) && images.length >= 3 && images.length <= 5,
    message: 'Shop must have between 3 and 5 images',
};

const shopSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        vendorId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            enum: SHOP_CATEGORIES,
        },
        location: {
            city: {
                type: String,
                required: true,
                trim: true,
            },
            area: {
                type: String,
                required: true,
                trim: true,
            },
            address: {
                type: String,
                trim: true,
                default: '',
            },
        },
        images: {
            type: [String],
            required: true,
            validate: imageValidation,
        },
        mobile: {
            type: String,
            trim: true,
            default: '',
        },
        mapUrl: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        rating: {
            type: Number,
            default: 0,
        },
        numRatings: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

shopSchema.index({ 'location.city': 1, 'location.area': 1, category: 1 });

const Shop = mongoose.model('Shop', shopSchema);
export default Shop;
