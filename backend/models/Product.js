import mongoose from 'mongoose';
import { SHOP_CATEGORIES } from '../constants/shopCategories.js';

const imageValidation = {
    validator: (images) => Array.isArray(images) && images.length >= 3 && images.length <= 5,
    message: 'Product must have between 3 and 5 images',
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

const Product = mongoose.model('Product', productSchema);
export default Product;
