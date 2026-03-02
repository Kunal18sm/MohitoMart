import express from 'express';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductCategories,
    getRandomProducts,
    getLatestProducts,
    getRecentlyViewedProducts,
    getMyProducts,
} from '../controllers/productController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/categories').get(getProductCategories);
router.route('/random').get(optionalAuth, getRandomProducts);
router.route('/latest').get(optionalAuth, getLatestProducts);
router.route('/recently-viewed').get(protect, getRecentlyViewedProducts);
router.route('/me/list').get(protect, getMyProducts);
router.route('/').get(optionalAuth, getProducts).post(protect, createProduct);
router
    .route('/:id')
    .get(optionalAuth, getProductById)
    .put(protect, updateProduct)
    .delete(protect, deleteProduct);

export default router;
