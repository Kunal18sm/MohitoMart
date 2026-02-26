import express from 'express';
import {
    getUserProfile,
    updateUserProfile,
    followShop,
    unfollowShop,
    getFollowedFeed,
    getFollowedFeedRandom,
} from '../controllers/userController.js';
import { getUsers, getUserById, deleteUser, updateUser } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, admin, getUsers);

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

router.route('/follows/:shopId').post(protect, followShop).delete(protect, unfollowShop);
router.route('/feed/followed/random').get(protect, getFollowedFeedRandom);
router.route('/feed/followed').get(protect, getFollowedFeed);

router.route('/:id')
    .get(protect, admin, getUserById)
    .put(protect, admin, updateUser)
    .delete(protect, admin, deleteUser);

export default router;
