import { generateCsrfToken, getReadableCookieConfig, getSessionMaxAgeMs } from '../utils/sessionCookies.js';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 30;
const CSRF_RESPONSE_HEADER = 'X-CSRF-Token';

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

const cleanupExpiredBuckets = (now) => {
    for (const [key, bucket] of rateLimitBuckets.entries()) {
        const bucketWindowMs = Number(bucket.windowMs || DEFAULT_RATE_LIMIT_WINDOW_MS);
        if (now - bucket.windowStart > bucketWindowMs) {
            rateLimitBuckets.delete(key);
        }
    }
};

const resolveRateLimitValue = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const requestRateLimit = (options = {}) => {
    const windowMs = resolveRateLimitValue(options.windowMs, DEFAULT_RATE_LIMIT_WINDOW_MS);
    const max = resolveRateLimitValue(options.max, DEFAULT_RATE_LIMIT_MAX);
    const message =
        typeof options.message === 'string' && options.message.trim().length > 0
            ? options.message.trim()
            : 'Too many requests. Please try again later.';
    const keyPrefix = typeof options.keyPrefix === 'string' ? options.keyPrefix.trim() : '';
    const keyGenerator = typeof options.keyGenerator === 'function' ? options.keyGenerator : null;

    return (req, res, next) => {
        const now = Date.now();
        cleanupExpiredBuckets(now);

        const clientIp = getClientIp(req);
        const routeKey = keyGenerator ? keyGenerator(req) : `${req.baseUrl || ''}${req.path || ''}`;
        const methodKey = String(req.method || 'UNKNOWN').toUpperCase();
        const prefixSegment = keyPrefix ? `${keyPrefix}:` : '';
        const key = `${clientIp}:${prefixSegment}${methodKey}:${routeKey}`;
        const existing = rateLimitBuckets.get(key);
        const activeWindowMs = existing?.windowMs || windowMs;

        if (!existing || now - existing.windowStart > activeWindowMs) {
            rateLimitBuckets.set(key, {
                count: 1,
                windowStart: now,
                windowMs,
            });
            return next();
        }

        existing.count += 1;
        if (existing.count > max) {
            const retryAfterSeconds = Math.ceil((activeWindowMs - (now - existing.windowStart)) / 1000);
            res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
            res.status(429);
            return next(new Error(message));
        }

        return next();
    };
};

export const authRateLimit = (options = {}) => {
    const { keyPrefix, ...rest } = options;
    return requestRateLimit({
        ...rest,
        keyPrefix: keyPrefix || 'auth',
    });
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
    let csrfToken = String(req.cookies?.mm_csrf || '').trim();

    if (!csrfToken) {
        csrfToken = generateCsrfToken();
        res.cookie('mm_csrf', csrfToken, {
            ...getReadableCookieConfig(),
            maxAge: getSessionMaxAgeMs(),
        });
    }

    res.locals.csrfToken = csrfToken;
    res.setHeader(CSRF_RESPONSE_HEADER, csrfToken);
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
