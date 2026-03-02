import User from '../models/User.js';
import generateToken, { clearSessionCookies } from '../utils/generateToken.js';
import { normalizeLocationLabel } from '../utils/locationNormalizer.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '406817513870-g70h24bmi8216l6i1kpibd7nodgd9lhh.apps.googleusercontent.com');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
    try {
        const { name, username, email, password, city, area, role } = req.body;
        const normalizedName = String(name || '').trim();
        const normalizedUsername = String(username || '').trim().toLowerCase();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedCity = normalizeLocationLabel(city);
        const normalizedArea = normalizeLocationLabel(area);

        if (!normalizedName || !normalizedUsername || !normalizedEmail || !password || !normalizedCity || !normalizedArea) {
            res.status(400);
            throw new Error('Name, username, email, password, city and area are required');
        }

        if (password.length < 6) {
            res.status(400);
            throw new Error('Password must be at least 6 characters');
        }

        const emailExists = await User.exists({ email: normalizedEmail });
        if (emailExists) {
            res.status(400);
            throw new Error('Email already registered');
        }

        const usernameExists = await User.exists({ username: normalizedUsername });
        if (usernameExists) {
            res.status(400);
            throw new Error('Username already taken');
        }

        const user = await User.create({
            name: normalizedName,
            username: normalizedUsername,
            email: normalizedEmail,
            password,
            role: role === 'shop_owner' ? 'shop_owner' : 'user',
            location: {
                city: normalizedCity,
                area: normalizedArea,
            },
            onboardingCompleted: true,
        });

        if (user) {
            generateToken(res, user._id);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                onboardingCompleted: user.onboardingCompleted,
                locationPermissionGranted: user.locationPermissionGranted,
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
    try {
        const { identifier, password } = req.body; // 'identifier' can be email or username
        const normalizedIdentifier = String(identifier || '').trim().toLowerCase();

        if (!normalizedIdentifier || !password) {
            res.status(400);
            throw new Error('Username/Email and password are required');
        }

        // Find user by either email or username
        const user = await User.findOne({
            $or: [
                { email: normalizedIdentifier },
                { username: normalizedIdentifier }
            ]
        }).select(
            'name username email password role location followedShops onboardingCompleted locationPermissionGranted'
        );

        if (user && (await user.matchPassword(password))) {
            generateToken(res, user._id);

            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                onboardingCompleted: user.onboardingCompleted,
                locationPermissionGranted: user.locationPermissionGranted,
                followedShopsCount: user.followedShops?.length || 0,
            });
        } else {
            res.status(401);
            throw new Error('Invalid email or password');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res, next) => {
    try {
        clearSessionCookies(res);
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Complete Onboarding for Google Auth Users
// @route   PUT /api/auth/onboarding
// @access  Private
export const completeOnboarding = async (req, res, next) => {
    try {
        const { role, city, area } = req.body;
        const normalizedCity = normalizeLocationLabel(city);
        const normalizedArea = normalizeLocationLabel(area);

        if (!normalizedCity || !normalizedArea) {
            res.status(400);
            throw new Error('City and area are required');
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        user.role = role === 'shop_owner' ? 'shop_owner' : 'user';
        user.location = {
            city: normalizedCity,
            area: normalizedArea,
        };
        user.onboardingCompleted = true;
        user.locationPermissionGranted = true;

        const updatedUser = await user.save();

        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            location: updatedUser.location,
            onboardingCompleted: updatedUser.onboardingCompleted,
            locationPermissionGranted: updatedUser.locationPermissionGranted
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get active session user
// @route   GET /api/auth/session
// @access  Private
export const getSessionUser = async (req, res, next) => {
    try {
        res.status(200).json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            location: req.user.location,
            onboardingCompleted: req.user.onboardingCompleted,
            locationPermissionGranted: req.user.locationPermissionGranted
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Auth user with Google
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res, next) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            res.status(400);
            throw new Error('No Google credential provided');
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID || '406817513870-g70h24bmi8216l6i1kpibd7nodgd9lhh.apps.googleusercontent.com',
        });

        const payload = ticket.getPayload();
        if (!payload) {
            res.status(400);
            throw new Error('Invalid Google token');
        }

        const { email, name } = payload;

        // Check if user exists by email
        let user = await User.findOne({ email });

        if (user) {
            // User exists, log them in
            generateToken(res, user._id);
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                onboardingCompleted: user.onboardingCompleted,
                locationPermissionGranted: user.locationPermissionGranted,
                followedShopsCount: user.followedShops?.length || 0,
            });
        } else {
            // New user, generate random username and password
            const username = `user_${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
            const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

            user = await User.create({
                name,
                email,
                username,
                password,
                role: 'user',
                onboardingCompleted: false
            });

            generateToken(res, user._id);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                onboardingCompleted: user.onboardingCompleted,
                locationPermissionGranted: user.locationPermissionGranted,
                followedShopsCount: 0,
            });
        }
    } catch (error) {
        next(error);
    }
};
