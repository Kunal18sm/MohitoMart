import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedLocations = [];
let cachedAt = 0;

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
                const { data } = await api.get('/shops/locations', {
                    params: {
                        limit: 400,
                    },
                });

                const normalizedLocations = Array.isArray(data.locations)
                    ? data.locations
                          .map((entry) => ({
                              city: normalizeValue(entry.city),
                              area: normalizeValue(entry.area),
                          }))
                          .filter((entry) => entry.city && entry.area)
                    : [];

                cachedLocations = normalizedLocations;
                cachedAt = Date.now();

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
