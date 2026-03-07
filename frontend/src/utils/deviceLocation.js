import api from '../services/api';

const APPROXIMATE_ACCURACY_THRESHOLD_METERS = 5000;
const QUICK_GEOLOCATION_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
const PRECISE_GEOLOCATION_CACHE_MAX_AGE_MS = 2 * 60 * 1000;
const REVERSE_GEOCODE_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const REVERSE_GEOCODE_CACHE_STORAGE_KEY = 'mm_reverse_geocode_cache_v1';
const REVERSE_GEOCODE_CACHE_PRECISION = 3;

const normalizeLabel = (value, fallback = '') => {
    const normalized = String(value || '').trim();
    return normalized || fallback;
};

const hasResolvedLocation = (location = {}) =>
    Boolean(normalizeLabel(location.city) || normalizeLabel(location.area));

const buildCoordinateCacheKey = (latitude, longitude) =>
    `${Number(latitude).toFixed(REVERSE_GEOCODE_CACHE_PRECISION)}:${Number(longitude).toFixed(REVERSE_GEOCODE_CACHE_PRECISION)}`;

const readReverseGeocodeCache = (latitude, longitude) => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }

    try {
        const rawValue = window.localStorage.getItem(REVERSE_GEOCODE_CACHE_STORAGE_KEY);
        if (!rawValue) {
            return null;
        }

        const payload = JSON.parse(rawValue);
        if (
            payload?.key !== buildCoordinateCacheKey(latitude, longitude) ||
            Number(payload?.timestamp || 0) + REVERSE_GEOCODE_CACHE_MAX_AGE_MS < Date.now()
        ) {
            return null;
        }

        const cachedLocation = payload.location || {};
        if (!hasResolvedLocation(cachedLocation)) {
            return null;
        }

        return {
            city: normalizeLabel(cachedLocation.city),
            area: normalizeLabel(cachedLocation.area),
        };
    } catch (error) {
        return null;
    }
};

const writeReverseGeocodeCache = (latitude, longitude, location) => {
    if (typeof window === 'undefined' || !window.localStorage || !hasResolvedLocation(location)) {
        return;
    }

    try {
        window.localStorage.setItem(
            REVERSE_GEOCODE_CACHE_STORAGE_KEY,
            JSON.stringify({
                key: buildCoordinateCacheKey(latitude, longitude),
                location: {
                    city: normalizeLabel(location.city),
                    area: normalizeLabel(location.area),
                },
                timestamp: Date.now(),
            })
        );
    } catch (error) {
        // Ignore storage failures and continue without cache persistence.
    }
};

const getCurrentPosition = (options) =>
    new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

const readAccuracyMeters = (position) => {
    const accuracy = Number(position?.coords?.accuracy);
    return Number.isFinite(accuracy) ? accuracy : null;
};

const selectMoreAccuratePosition = (currentPosition, nextPosition) => {
    const currentAccuracy = readAccuracyMeters(currentPosition);
    const nextAccuracy = readAccuracyMeters(nextPosition);

    if (nextAccuracy === null) {
        return currentPosition;
    }

    if (currentAccuracy === null) {
        return nextPosition;
    }

    return nextAccuracy < currentAccuracy ? nextPosition : currentPosition;
};

const getBestEffortPosition = async (timeoutMs) => {
    const safeTimeoutMs = Math.max(4500, Number(timeoutMs) || 9000);
    const quickTimeoutMs = Math.min(1800, Math.max(1200, Math.floor(safeTimeoutMs * 0.22)));
    const startedAt = Date.now();

    try {
        const quickPosition = await getCurrentPosition({
            enableHighAccuracy: false,
            maximumAge: QUICK_GEOLOCATION_CACHE_MAX_AGE_MS,
            timeout: quickTimeoutMs,
        });

        const quickAccuracy = readAccuracyMeters(quickPosition);
        if (
            quickAccuracy !== null &&
            quickAccuracy <= APPROXIMATE_ACCURACY_THRESHOLD_METERS
        ) {
            return quickPosition;
        }

        const elapsedMs = Date.now() - startedAt;
        const remainingTimeoutMs = Math.max(3000, safeTimeoutMs - elapsedMs);

        try {
            const refinedPosition = await getCurrentPosition({
                enableHighAccuracy: true,
                maximumAge: PRECISE_GEOLOCATION_CACHE_MAX_AGE_MS,
                timeout: remainingTimeoutMs,
            });
            return selectMoreAccuratePosition(quickPosition, refinedPosition);
        } catch (refineError) {
            return quickPosition;
        }
    } catch (quickError) {
        try {
            return await getCurrentPosition({
                enableHighAccuracy: true,
                maximumAge: PRECISE_GEOLOCATION_CACHE_MAX_AGE_MS,
                timeout: Math.min(safeTimeoutMs, 7000),
            });
        } catch (highAccuracyError) {
            return getCurrentPosition({
                enableHighAccuracy: false,
                maximumAge: QUICK_GEOLOCATION_CACHE_MAX_AGE_MS,
                timeout: Math.min(Math.max(Math.floor(safeTimeoutMs * 0.45), 2500), 4500),
            });
        }
    }
};

const reverseGeocodeCoordinates = async (latitude, longitude) => {
    const { data } = await api.get('/shops/reverse-geocode', {
        __silentError: true,
        cache: false,
        params: {
            latitude,
            longitude,
        },
    });

    return {
        city: normalizeLabel(data?.city),
        area: normalizeLabel(data?.area),
    };
};

export const detectDeviceLocation = async ({ timeoutMs = 12000 } = {}) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        throw new Error('Geolocation is not supported on this device.');
    }

    let position = await getBestEffortPosition(timeoutMs);

    const initialAccuracy = readAccuracyMeters(position);
    if (initialAccuracy !== null && initialAccuracy > APPROXIMATE_ACCURACY_THRESHOLD_METERS) {
        try {
            const retryPosition = await getCurrentPosition({
                enableHighAccuracy: true,
                maximumAge: PRECISE_GEOLOCATION_CACHE_MAX_AGE_MS,
                timeout: Math.min(Math.max(Math.floor(timeoutMs * 0.5), 2500), 5000),
            });
            position = selectMoreAccuratePosition(position, retryPosition);
        } catch (retryError) {
            // Keep previously resolved coordinates if retry is unavailable.
        }
    }

    const latitude = Number(position.coords?.latitude);
    const longitude = Number(position.coords?.longitude);
    const accuracyMeters = readAccuracyMeters(position);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Could not read device coordinates.');
    }

    const cachedLocation = readReverseGeocodeCache(latitude, longitude);
    const resolvedLocation = cachedLocation || (await reverseGeocodeCoordinates(latitude, longitude));
    const city = normalizeLabel(resolvedLocation.city);
    const area = normalizeLabel(resolvedLocation.area);

    if (!city && !area) {
        throw new Error('Unable to determine your city/area from current coordinates.');
    }

    writeReverseGeocodeCache(latitude, longitude, { city, area });

    return {
        city: normalizeLabel(city, 'Unknown City'),
        area: normalizeLabel(area, 'Unknown Area'),
        latitude,
        longitude,
        accuracyMeters: accuracyMeters !== null ? Math.round(accuracyMeters) : null,
        isApproximate:
            accuracyMeters !== null && accuracyMeters > APPROXIMATE_ACCURACY_THRESHOLD_METERS,
    };
};
