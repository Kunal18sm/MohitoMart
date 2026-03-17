import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import connectDB from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import { ensureCsrfCookie, requestRateLimit, securityHeaders, verifyCsrfToken } from './middleware/securityMiddleware.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();
configureCloudinary();

const app = express();

// Middleware
app.use(compression());
app.use(securityHeaders);
app.use(cookieParser()); // Cookie parser
app.use(ensureCsrfCookie);
app.use(verifyCsrfToken);
app.use(express.json({ limit: '20mb' })); // Body parser
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const createSafeLimiter = (options) => requestRateLimit(options);

const shopsRateLimit = createSafeLimiter({
    windowMs: 10 * 60 * 1000,
    max: 120,
    keyPrefix: 'shops',
});

const productsRateLimit = createSafeLimiter({
    windowMs: 10 * 60 * 1000,
    max: 120,
    keyPrefix: 'products',
});

const servicesRateLimit = createSafeLimiter({
    windowMs: 10 * 60 * 1000,
    max: 120,
    keyPrefix: 'services',
});

const uploadsRateLimit = createSafeLimiter({
    windowMs: 10 * 60 * 1000,
    max: 30,
    keyPrefix: 'uploads',
});

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const configuredFrontendOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

const allowedOrigins = new Set([
    ...configuredFrontendOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]);

const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }

            const normalizedOrigin = normalizeOrigin(origin);
            if (allowedOrigins.has(normalizedOrigin) || localhostPattern.test(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
        exposedHeaders: ['X-CSRF-Token'],
    })
); // Enable Cross-Origin Resource Sharing
const enableRequestLogs = process.env.ENABLE_REQUEST_LOGS === 'true';
if (enableRequestLogs) {
    app.use(morgan('dev')); // HTTP request logger (opt-in)
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shops', shopsRateLimit, shopRoutes);
app.use('/api/products', productsRateLimit, productRoutes);
app.use('/api/services', servicesRateLimit, serviceRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/uploads', uploadsRateLimit, uploadRoutes);
app.use('/api/banners', bannerRoutes);

// Basic Route for testing
app.get('/', (req, res) => {
    res.send('Mohito Mart API is running');
});

// Error Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
