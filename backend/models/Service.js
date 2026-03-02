import mongoose from 'mongoose';
import { SHOP_CATEGORIES } from '../constants/shopCategories.js';

const imageValidation = {
    validator: (images) => Array.isArray(images) && images.length >= 1 && images.length <= 5,
    message: 'Service must have between 1 and 5 images',
};

const serviceSchema = new mongoose.Schema(
    {
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Shop',
        },
        serviceId: {
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
        images: {
            type: [String],
            required: true,
            validate: imageValidation,
        },
        category: {
            type: String,
            required: true,
            enum: SHOP_CATEGORIES,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        pricingType: {
            type: String,
            enum: ['fixed', 'range'],
            default: 'fixed',
        },
        price: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        priceMin: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        priceMax: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        viewsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

serviceSchema.index({ shop: 1, category: 1, createdAt: -1 });
serviceSchema.index({ shop: 1, createdAt: -1 });
serviceSchema.index({ category: 1, createdAt: -1 });
serviceSchema.index({ priceMin: 1, priceMax: 1 });
serviceSchema.index({ createdAt: -1 });

const Service = mongoose.model('Service', serviceSchema);
export default Service;
