import express from 'express';
import {
    getServices,
    getRandomServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    getMyServices,
    getServiceCategories,
} from '../controllers/serviceController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/categories').get(getServiceCategories);
router.route('/me/list').get(protect, getMyServices);
router.route('/random').get(optionalAuth, getRandomServices);
router.route('/').get(optionalAuth, getServices).post(protect, createService);
router.route('/:id').get(optionalAuth, getServiceById).put(protect, updateService).delete(protect, deleteService);

export default router;
