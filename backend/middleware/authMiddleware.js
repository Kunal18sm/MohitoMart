import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const getTokenFromRequest = (req) => {
    if (req.cookies?.mm_session) {
        return req.cookies.mm_session;
    }

    if (req.cookies?.jwt) {
        return req.cookies.jwt;
    }

    if (req.headers.authorization?.startsWith('Bearer ')) {
        return req.headers.authorization.split(' ')[1];
    }

    return null;
};

const getJwtSecret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET;

const decodeToken = (token) => jwt.verify(token, getJwtSecret());

// Protect routes
const protect = async (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (token) {
        try {
            const decoded = decodeToken(token);
            req.user = await User.findById(decoded.userId).select(
                '_id name email role location onboardingCompleted locationPermissionGranted'
            );

            if (!req.user) {
                res.status(401);
                return next(new Error('Not authorized, user not found'));
            }

            next();
        } catch (error) {
            res.status(401);
            next(new Error('Not authorized, token failed'));
        }
    } else {
        res.status(401);
        next(new Error('Not authorized, no token'));
    }
};

const optionalAuth = async (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return next();
    }

    try {
        const decoded = decodeToken(token);
        const user = await User.findById(decoded.userId).select('_id name role');
        req.user = user
            ? {
                _id: user._id,
                name: user.name,
                role: user.role,
            }
            : null;
    } catch (error) {
        req.user = null;
    }

    next();
};

// Admin middleware
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401);
        next(new Error('Not authorized as admin'));
    }
};

export { protect, optionalAuth, admin };
