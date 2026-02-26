import express from 'express';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductCategories,
    getRandomProducts,
    getMyProducts,
} from '../controllers/productController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/categories').get(getProductCategories);
router.route('/random').get(optionalAuth, getRandomProducts);
router.route('/me/list').get(protect, getMyProducts);
router.route('/').get(optionalAuth, getProducts).post(protect, createProduct);
router
    .route('/:id')
    .get(optionalAuth, getProductById)
    .put(protect, updateProduct)
    .delete(protect, deleteProduct);

export default router;
