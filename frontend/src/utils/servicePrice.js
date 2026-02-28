const toNonNegativeNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return fallback;
    }
    return numeric;
};

export const getServicePriceRange = (service = {}) => {
    const fallbackPrice = toNonNegativeNumber(service.price, 0);
    const min = toNonNegativeNumber(service.priceMin, fallbackPrice);
    const max = toNonNegativeNumber(service.priceMax, fallbackPrice);

    if (max < min) {
        return {
            min,
            max: min,
        };
    }

    return { min, max };
};

export const isRangePricedService = (service = {}) => {
    const { min, max } = getServicePriceRange(service);
    return max > min;
};

export const formatServicePrice = (service = {}) => {
    const { min, max } = getServicePriceRange(service);
    if (max > min) {
        return `Rs ${min.toFixed(0)} - ${max.toFixed(0)}`;
    }
    return `Rs ${min.toFixed(0)}`;
};
