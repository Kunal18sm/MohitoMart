const buildNominatimUrl = (latitude, longitude) =>
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${latitude}&lon=${longitude}`;

const buildBigDataCloudUrl = (latitude, longitude) =>
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

const APPROXIMATE_ACCURACY_THRESHOLD_METERS = 5000;

const normalizeLabel = (value, fallback = '') => {
    const normalized = String(value || '').trim();
    return normalized || fallback;
};

const pickCandidate = (candidates = [], excludedValues = []) => {
    const excludedSet = new Set(
        excludedValues
            .map((entry) => normalizeLabel(entry).toLowerCase())
            .filter(Boolean)
    );

    for (const candidate of candidates) {
        const normalized = normalizeLabel(candidate);
        if (!normalized) {
            continue;
        }

        if (excludedSet.has(normalized.toLowerCase())) {
            continue;
        }

        return normalized;
    }

    return '';
};

const parseNominatimAddress = (payload = {}) => {
    const address = payload.address || {};
    const city = pickCandidate([
        address.city,
        address.town,
        address.municipality,
        address.city_district,
        address.county,
        address.state_district,
        address.state,
    ]);
    const area = pickCandidate(
        [
            address.suburb,
            address.neighbourhood,
            address.residential,
            address.quarter,
            address.city_district,
            address.district,
            address.borough,
            address.village,
            address.hamlet,
            address.road,
            address.postcode,
        ],
        [city]
    );

    return { city, area };
};

const parseBigDataCloudAddress = (payload = {}) => {
    const administrativeNames = Array.isArray(payload.localityInfo?.administrative)
        ? payload.localityInfo.administrative.map((entry) => entry?.name)
        : [];
    const informativeNames = Array.isArray(payload.localityInfo?.informative)
        ? payload.localityInfo.informative.map((entry) => entry?.name)
        : [];

    const city = pickCandidate([
        payload.city,
        payload.locality,
        payload.principalSubdivision,
        ...administrativeNames,
    ]);
    const area = pickCandidate(
        [
            payload.locality,
            ...informativeNames,
            ...administrativeNames,
            payload.postcode,
        ],
        [city]
    );

    return { city, area };
};

const fetchJson = async (url, timeoutMs = 8000) => {
    const abortController = new AbortController();
    const timeoutHandle = window.setTimeout(() => abortController.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
            },
            signal: abortController.signal,
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        return response.json();
    } finally {
        window.clearTimeout(timeoutHandle);
    }
};

const getCurrentPosition = (options) =>
    new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

const getBestEffortPosition = async (timeoutMs) => {
    try {
        return await getCurrentPosition({
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: timeoutMs,
        });
    } catch (highAccuracyError) {
        return getCurrentPosition({
            enableHighAccuracy: false,
            maximumAge: 2 * 60 * 1000,
            timeout: timeoutMs,
        });
    }
};

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
                maximumAge: 0,
                timeout: Math.max(timeoutMs, 18000),
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

    const [nominatimResult, bigDataResult] = await Promise.allSettled([
        fetchJson(buildNominatimUrl(latitude, longitude)),
        fetchJson(buildBigDataCloudUrl(latitude, longitude)),
    ]);

    const nominatimLocation =
        nominatimResult.status === 'fulfilled'
            ? parseNominatimAddress(nominatimResult.value)
            : { city: '', area: '' };
    const bigDataCloudLocation =
        bigDataResult.status === 'fulfilled'
            ? parseBigDataCloudAddress(bigDataResult.value)
            : { city: '', area: '' };

    const city = pickCandidate([
        nominatimLocation.city,
        bigDataCloudLocation.city,
        nominatimResult.status === 'fulfilled' ? nominatimResult.value?.address?.state : '',
        bigDataResult.status === 'fulfilled' ? bigDataResult.value?.principalSubdivision : '',
    ]);
    const area = pickCandidate(
        [
            nominatimLocation.area,
            bigDataCloudLocation.area,
            nominatimResult.status === 'fulfilled' ? nominatimResult.value?.address?.road : '',
            bigDataResult.status === 'fulfilled' ? bigDataResult.value?.postcode : '',
        ],
        [city]
    );

    if (!city && !area) {
        throw new Error('Unable to determine your city/area from current coordinates.');
    }

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
