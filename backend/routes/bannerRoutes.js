import express from 'express';
import { getHomeBanner, updateHomeBanner } from '../controllers/bannerController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/home').get(getHomeBanner).put(protect, admin, updateHomeBanner);

export default router;

