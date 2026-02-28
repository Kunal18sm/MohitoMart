const PRICE_BUCKET_STEP = 500;

const toNonNegativeNumber = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback;
};

const getHiddenPriceLabel = (price) => {
    const normalizedPrice = toNonNegativeNumber(price, 0);
    const bucketCeiling =
        (Math.floor(normalizedPrice / PRICE_BUCKET_STEP) + 1) * PRICE_BUCKET_STEP;

    return `<${bucketCeiling.toFixed(0)}`;
};

export const formatProductPrice = (product = {}) => {
    const hidePriceAccessEnabled =
        product?.shop?.allowPriceHide === undefined ? true : Boolean(product.shop.allowPriceHide);

    if (product.hideOriginalPrice && hidePriceAccessEnabled) {
        return getHiddenPriceLabel(product.price);
    }

    const normalizedPrice = toNonNegativeNumber(product.price, 0);
    return `Rs ${normalizedPrice.toFixed(0)}`;
};
