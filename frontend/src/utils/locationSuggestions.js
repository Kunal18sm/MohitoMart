import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const CACHE_TTL_MS = 5 * 60 * 1000;
const LOCATION_CACHE_STORAGE_KEY = 'mm_location_suggestions_cache_v1';

const readPersistedLocationCache = () => {
    if (typeof window === 'undefined') {
        return {
            locations: [],
            cachedAt: 0,
        };
    }

    try {
        const rawCache = window.localStorage.getItem(LOCATION_CACHE_STORAGE_KEY);
        const parsedCache = JSON.parse(rawCache || '{}');
        const locations = Array.isArray(parsedCache.locations) ? parsedCache.locations : [];
        const cachedAt = Number(parsedCache.cachedAt || 0);

        return {
            locations,
            cachedAt: Number.isFinite(cachedAt) ? cachedAt : 0,
        };
    } catch (error) {
        return {
            locations: [],
            cachedAt: 0,
        };
    }
};

const persistLocationCache = (locations = [], cachedAt = Date.now()) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            LOCATION_CACHE_STORAGE_KEY,
            JSON.stringify({
                locations,
                cachedAt,
            })
        );
    } catch (error) {
        // ignore storage errors
    }
};

const persistedCache = readPersistedLocationCache();
let cachedLocations = persistedCache.locations;
let cachedAt = persistedCache.cachedAt;
let pendingLocationRequest = null;

const normalizeValue = (value) => String(value || '').trim();
const normalizeValueKey = (value) => normalizeValue(value).toLowerCase();
const formatLocationLabel = (value) => {
    const normalized = normalizeValue(value).toLowerCase();
    if (!normalized) {
        return '';
    }
    return normalized.replace(/\b([a-z])/g, (character) => character.toUpperCase());
};

const uniqueSorted = (items) => {
    const dedupedMap = new Map();

    items.forEach((item) => {
        const formatted = formatLocationLabel(item);
        const key = normalizeValueKey(formatted);
        if (!formatted || !key || dedupedMap.has(key)) {
            return;
        }
        dedupedMap.set(key, formatted);
    });

    return [...dedupedMap.values()].sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' })
    );
};

export const useLocationSuggestions = () => {
    const [locations, setLocations] = useState(cachedLocations);

    useEffect(() => {
        let isMounted = true;
        const cacheValid =
            Array.isArray(cachedLocations) &&
            cachedLocations.length > 0 &&
            Date.now() - cachedAt < CACHE_TTL_MS;

        if (cacheValid) {
            setLocations(cachedLocations);
            return undefined;
        }

        const fetchLocations = async () => {
            try {
                if (!pendingLocationRequest) {
                    pendingLocationRequest = api
                        .get('/shops/locations', {
                            params: {
                                limit: 400,
                            },
                        })
                        .then(({ data }) =>
                            Array.isArray(data.locations)
                                ? data.locations
                                      .map((entry) => ({
                                          city: normalizeValue(entry.city),
                                          area: normalizeValue(entry.area),
                                      }))
                                      .filter((entry) => entry.city && entry.area)
                                : []
                        )
                        .finally(() => {
                            pendingLocationRequest = null;
                        });
                }

                const normalizedLocations = await pendingLocationRequest;

                cachedLocations = normalizedLocations;
                cachedAt = Date.now();
                persistLocationCache(normalizedLocations, cachedAt);

                if (isMounted) {
                    setLocations(normalizedLocations);
                }
            } catch (error) {
                if (isMounted) {
                    setLocations([]);
                }
            }
        };

        fetchLocations();
        return () => {
            isMounted = false;
        };
    }, []);

    const cityOptions = useMemo(
        () => uniqueSorted(locations.map((entry) => entry.city)),
        [locations]
    );
    const globalAreaOptions = useMemo(
        () => uniqueSorted(locations.map((entry) => entry.area)),
        [locations]
    );

    const areaByCityMap = useMemo(() => {
        const entries = new Map();

        locations.forEach((entry) => {
            const cityKey = normalizeValue(entry.city).toLowerCase();
            if (!cityKey) {
                return;
            }

            if (!entries.has(cityKey)) {
                entries.set(cityKey, []);
            }
            entries.get(cityKey).push(entry.area);
        });

        const normalizedMap = new Map();
        entries.forEach((areas, cityKey) => {
            normalizedMap.set(cityKey, uniqueSorted(areas));
        });

        return normalizedMap;
    }, [locations]);

    const getAreaOptionsByCity = useCallback(
        (cityValue) => {
            const cityKey = normalizeValue(cityValue).toLowerCase();
            if (!cityKey) {
                return globalAreaOptions;
            }
            return areaByCityMap.get(cityKey) || [];
        },
        [areaByCityMap, globalAreaOptions]
    );

    return {
        cityOptions,
        globalAreaOptions,
        getAreaOptionsByCity,
    };
};
