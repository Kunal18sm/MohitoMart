import express from 'express';
import { registerUser, loginUser, logoutUser, getSessionUser, completeOnboarding, googleAuth } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authRateLimit } from '../middleware/securityMiddleware.js';

const router = express.Router();

router.post('/register', authRateLimit({ windowMs: 15 * 60 * 1000, max: 12 }), registerUser);
router.post('/login', authRateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), loginUser);
router.post('/logout', logoutUser);
router.post('/google', authRateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'auth-google' }), googleAuth);
router.put('/onboarding', protect, completeOnboarding);
router.get('/session', protect, getSessionUser);

export default router;
