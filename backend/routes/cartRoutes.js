import express from 'express';
import {
    addCartItem,
    clearCart,
    getMyCart,
    removeCartItem,
    updateCartItemQty,
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getMyCart).delete(protect, clearCart);
router.route('/items').post(protect, addCartItem);
router.route('/items/:productId').put(protect, updateCartItemQty).delete(protect, removeCartItem);

export default router;
