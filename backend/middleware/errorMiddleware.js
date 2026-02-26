const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Check for Mongoose bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        message = `Resource not found`;
        statusCode = 404;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        message = Object.values(err.errors)
            .map((error) => error.message)
            .join(', ');
        statusCode = 400;
    }

    // Duplicate key (e.g. unique email)
    if (err.code === 11000) {
        const duplicateFields = Object.keys(err.keyValue || {}).join(', ');
        message = duplicateFields
            ? `${duplicateFields} already exists`
            : 'Duplicate value already exists';
        statusCode = 400;
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        message = 'Session expired or invalid token. Please login again.';
        statusCode = 401;
    }

    if (!message || typeof message !== 'string') {
        message = 'Unexpected server error';
    }

    res.status(statusCode).json({
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

export { notFound, errorHandler };
