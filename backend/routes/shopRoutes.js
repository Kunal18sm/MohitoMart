import express from 'express';
import {
    getShopCategories,
    getShopLocations,
    reverseGeocodeCoordinates,
    getShops,
    getShopById,
    createShop,
    updateShop,
    deleteShop,
    rateShop,
    getOwnedShops,
    getShopApprovalRequests,
    reviewShopApprovalRequest,
} from '../controllers/shopController.js';
import { protect, optionalAuth, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/categories').get(getShopCategories);
router.route('/locations').get(getShopLocations);
router.route('/reverse-geocode').get(reverseGeocodeCoordinates);
router.route('/me/owned').get(protect, getOwnedShops);
router.route('/requests').get(protect, admin, getShopApprovalRequests);
router.route('/requests/:id').patch(protect, admin, reviewShopApprovalRequest);
router.route('/').get(optionalAuth, getShops).post(protect, createShop);
router.route('/:id')
    .get(optionalAuth, getShopById)
    .put(protect, updateShop)
    .delete(protect, admin, deleteShop);
router.route('/:id/rate').post(protect, rateShop);

export default router;
