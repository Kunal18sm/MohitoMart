import jwt from 'jsonwebtoken';
import {
    generateCsrfToken,
    getReadableCookieConfig,
    getSessionCookieConfig,
    getSessionMaxAgeMs,
} from './sessionCookies.js';

const getJwtSecret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET;

export const clearSessionCookies = (res) => {
    const cookieConfig = getSessionCookieConfig();
    const readableCookieConfig = getReadableCookieConfig();
    res.cookie('jwt', '', {
        ...cookieConfig,
        expires: new Date(0),
    });
    res.cookie('mm_session', '', {
        ...cookieConfig,
        expires: new Date(0),
    });
    res.cookie('mm_csrf', '', {
        ...readableCookieConfig,
        expires: new Date(0),
    });
};

const generateToken = (res, userId) => {
    const jwtSecret = getJwtSecret();
    const maxAge = getSessionMaxAgeMs();
    const cookieConfig = getSessionCookieConfig();
    const readableCookieConfig = getReadableCookieConfig();

    const token = jwt.sign({ userId }, jwtSecret, {
        expiresIn: `${Math.round(maxAge / (24 * 60 * 60 * 1000))}d`,
    });

    // Set session cookies (legacy + new name for compatibility)
    res.cookie('jwt', token, {
        ...cookieConfig,
        maxAge,
    });
    res.cookie('mm_session', token, {
        ...cookieConfig,
        maxAge,
    });
    res.cookie('mm_csrf', generateCsrfToken(), {
        ...readableCookieConfig,
        maxAge,
    });

    return token;
};

export default generateToken;
