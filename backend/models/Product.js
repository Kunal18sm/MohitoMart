import mongoose from 'mongoose';
import { SHOP_CATEGORIES } from '../constants/shopCategories.js';

const imageValidation = {
    validator: (images) => Array.isArray(images) && images.length >= 1 && images.length <= 5,
    message: 'Product must have between 1 and 5 images',
};

const productSchema = new mongoose.Schema(
    {
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Shop',
        },
        productId: {
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
        price: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        originalPrice: {
            type: Number,
            min: 0,
        },
        hideOriginalPrice: {
            type: Boolean,
            default: false,
        },
        viewsCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

productSchema.index({ shop: 1, category: 1, createdAt: -1 });
productSchema.index({ shop: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ shop: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
