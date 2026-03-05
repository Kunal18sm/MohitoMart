const STORAGE_KEY = 'selectedAreaFilters';

const collapseSpaces = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const normalizeKey = (value) => collapseSpaces(value).toLowerCase();

const formatLocationLabel = (value) => {
    const normalized = collapseSpaces(value).toLowerCase();
    if (!normalized) {
        return '';
    }
    return normalized.replace(/\b([a-z])/g, (character) => character.toUpperCase());
};

const asUniqueAreas = (areas = []) => {
    const deduped = new Map();

    areas.forEach((area) => {
        const formatted = formatLocationLabel(area);
        const key = normalizeKey(formatted);
        if (!formatted || !key || deduped.has(key)) {
            return;
        }
        deduped.set(key, formatted);
    });

    return [...deduped.values()];
};

const readStoredAreaFilters = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        return null;
    }
};

const isSameCity = (left, right) => {
    const leftKey = normalizeKey(left);
    const rightKey = normalizeKey(right);

    if (!leftKey || !rightKey) {
        return true;
    }

    return leftKey === rightKey;
};

export const getAreaFilterState = (selectedLocation = {}) => {
    const city = formatLocationLabel(selectedLocation.city);
    const primaryArea = formatLocationLabel(selectedLocation.area);
    const stored = readStoredAreaFilters();
    const storedCity = formatLocationLabel(stored?.city);
    const storedAreas =
        isSameCity(city, storedCity) && Array.isArray(stored?.areas) ? stored.areas : [];

    const areas = asUniqueAreas([primaryArea, ...storedAreas]).slice(0, 3);

    return {
        city,
        primaryArea,
        areas,
    };
};

export const buildAreasFromSlots = (selectedLocation = {}, extraAreas = []) =>
    asUniqueAreas([selectedLocation.area, ...extraAreas]).slice(0, 3);

export const fillAreaSlotsWithNearby = (
    selectedLocation = {},
    existingAreas = [],
    nearbyAreas = [],
    maxAreas = 3
) => {
    const limit = Math.min(Math.max(Number(maxAreas || 3), 1), 3);
    const areas = asUniqueAreas([selectedLocation.area, ...existingAreas]);
    const usedKeys = new Set(areas.map((entry) => normalizeKey(entry)));

    asUniqueAreas(nearbyAreas).forEach((area) => {
        if (areas.length >= limit) {
            return;
        }

        const key = normalizeKey(area);
        if (!key || usedKeys.has(key)) {
            return;
        }

        usedKeys.add(key);
        areas.push(area);
    });

    return areas.slice(0, limit);
};

export const persistAreaFilterState = (selectedLocation = {}, areas = []) => {
    if (typeof window === 'undefined') {
        return;
    }

    const city = formatLocationLabel(selectedLocation.city);
    const normalizedAreas = asUniqueAreas([selectedLocation.area, ...areas]).slice(0, 3);

    if (!city || !normalizedAreas.length) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            city,
            areas: normalizedAreas,
        })
    );
};

export const buildAreaQueryParam = (areas = []) => {
    const normalizedAreas = asUniqueAreas(areas).slice(0, 3);
    if (!normalizedAreas.length) {
        return undefined;
    }
    return normalizedAreas.join(',');
};

export const formatAreaSummary = (areas = []) => {
    const normalizedAreas = asUniqueAreas(areas).slice(0, 3);

    if (!normalizedAreas.length) {
        return 'All locations';
    }

    if (normalizedAreas.length === 1) {
        return normalizedAreas[0];
    }

    if (normalizedAreas.length === 2) {
        return `${normalizedAreas[0]}, ${normalizedAreas[1]}`;
    }

    return `${normalizedAreas[0]}, ${normalizedAreas[1]} +${normalizedAreas.length - 2}`;
};
