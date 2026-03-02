import mongoose from 'mongoose';

const productViewSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

productViewSchema.index({ product: 1, user: 1 }, { unique: true });
productViewSchema.index({ user: 1, updatedAt: -1 });

const ProductView = mongoose.model('ProductView', productViewSchema);
export default ProductView;
