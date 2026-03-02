import { generateCsrfToken, getReadableCookieConfig, getSessionMaxAgeMs } from '../utils/sessionCookies.js';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 30;

const rateLimitBuckets = new Map();

const getClientIp = (req) => {
    const forwardedFor = String(req.headers['x-forwarded-for'] || '')
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean);

    if (forwardedFor.length > 0) {
        return forwardedFor[0];
    }

    return req.ip || req.connection?.remoteAddress || 'unknown';
};

const cleanupExpiredBuckets = (now, windowMs) => {
    for (const [key, bucket] of rateLimitBuckets.entries()) {
        if (now - bucket.windowStart > windowMs) {
            rateLimitBuckets.delete(key);
        }
    }
};

export const authRateLimit = (options = {}) => {
    const windowMs = Number(options.windowMs || DEFAULT_RATE_LIMIT_WINDOW_MS);
    const max = Number(options.max || DEFAULT_RATE_LIMIT_MAX);

    return (req, res, next) => {
        const now = Date.now();
        cleanupExpiredBuckets(now, windowMs);

        const clientIp = getClientIp(req);
        const key = `${clientIp}:${req.path}`;
        const existing = rateLimitBuckets.get(key);

        if (!existing || now - existing.windowStart > windowMs) {
            rateLimitBuckets.set(key, {
                count: 1,
                windowStart: now,
            });
            return next();
        }

        existing.count += 1;
        if (existing.count > max) {
            const retryAfterSeconds = Math.ceil((windowMs - (now - existing.windowStart)) / 1000);
            res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
            res.status(429);
            return next(new Error('Too many requests. Please try again later.'));
        }

        return next();
    };
};

export const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
};

const hasSessionCookie = (req) => Boolean(req.cookies?.mm_session || req.cookies?.jwt);
const isSafeMethod = (method) => ['GET', 'HEAD', 'OPTIONS'].includes(String(method || '').toUpperCase());

export const ensureCsrfCookie = (req, res, next) => {
    if (!req.cookies?.mm_csrf) {
        res.cookie('mm_csrf', generateCsrfToken(), {
            ...getReadableCookieConfig(),
            maxAge: getSessionMaxAgeMs(),
        });
    }

    next();
};

export const verifyCsrfToken = (req, res, next) => {
    if (isSafeMethod(req.method)) {
        return next();
    }

    if (!hasSessionCookie(req)) {
        return next();
    }

    const cookieToken = String(req.cookies?.mm_csrf || '').trim();
    const headerToken = String(req.headers['x-csrf-token'] || '').trim();

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        res.status(403);
        return next(new Error('Invalid or missing CSRF token'));
    }

    return next();
};
