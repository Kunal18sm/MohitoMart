export const extractErrorMessage = (error, fallback = 'Something went wrong') => {
    if (!error) {
        return fallback;
    }

    const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.details;

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage.trim();
    }

    if (Array.isArray(apiMessage) && apiMessage.length) {
        return apiMessage.join(', ');
    }

    if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
    }

    return fallback;
};
