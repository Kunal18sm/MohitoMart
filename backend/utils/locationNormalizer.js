const collapseSpaces = (value) => String(value || '').trim().replace(/\s+/g, ' ');

export const normalizeLocationKey = (value) => collapseSpaces(value).toLowerCase();

export const normalizeLocationLabel = (value) => {
    const normalized = collapseSpaces(value).toLowerCase();
    if (!normalized) {
        return '';
    }

    return normalized.replace(/\b([a-z])/g, (character) => character.toUpperCase());
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildLocationFilterRegex = (value) => {
    const normalized = collapseSpaces(value);
    if (!normalized) {
        return null;
    }

    const escapedPattern = escapeRegex(normalized).replace(/\\ /g, '\\s+');
    return {
        $regex: `^${escapedPattern}$`,
        $options: 'i',
    };
};
