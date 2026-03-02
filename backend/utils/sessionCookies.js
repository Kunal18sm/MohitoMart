import crypto from 'crypto';

export const getSessionMaxAgeMs = () => {
    const days = Number(process.env.SESSION_DAYS || 14);
    const normalizedDays = Number.isFinite(days) && days > 0 ? days : 14;
    return normalizedDays * 24 * 60 * 60 * 1000;
};

const getCookieSharedConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    };
};

export const getSessionCookieConfig = () => ({
    ...getCookieSharedConfig(),
    httpOnly: true,
});

export const getReadableCookieConfig = () => ({
    ...getCookieSharedConfig(),
    httpOnly: false,
});

export const generateCsrfToken = () => crypto.randomBytes(24).toString('hex');
