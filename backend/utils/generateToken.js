import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;

    const token = jwt.sign({ userId }, jwtSecret, {
        expiresIn: '30d',
    });

    // Set JWT as HTTP-Only cookie
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return token;
};

export default generateToken;
