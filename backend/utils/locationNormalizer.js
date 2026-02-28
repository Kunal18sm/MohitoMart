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

const splitQueryValues = (value) => {
    if (Array.isArray(value)) {
        return value.flatMap((entry) => splitQueryValues(entry));
    }

    const normalized = collapseSpaces(value);
    if (!normalized) {
        return [];
    }

    return normalized
        .split(',')
        .map((entry) => collapseSpaces(entry))
        .filter(Boolean);
};

export const parseLocationQueryValues = (...values) => {
    const deduped = new Map();

    values.forEach((value) => {
        splitQueryValues(value).forEach((entry) => {
            const key = entry.toLowerCase();
            if (!deduped.has(key)) {
                deduped.set(key, entry);
            }
        });
    });

    return [...deduped.values()];
};

export const buildLocationFieldClause = (field, ...values) => {
    const filters = parseLocationQueryValues(...values)
        .map((entry) => buildLocationFilterRegex(entry))
        .filter(Boolean)
        .map((regexFilter) => ({ [field]: regexFilter }));

    if (!filters.length) {
        return null;
    }

    if (filters.length === 1) {
        return filters[0];
    }

    return { $or: filters };
};
