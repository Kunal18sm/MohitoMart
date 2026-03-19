export const SITE_NAME = 'Mohito Mart';
export const DEFAULT_SITE_DESCRIPTION =
    'Mohito Mart helps nearby shoppers discover local shops, products, and services with location-aware listings.';
export const DEFAULT_SOCIAL_IMAGE_PATH = '/logo/mohito-512-optimized.png';
export const DEFAULT_ROBOTS_POLICY =
    'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1';
const FALLBACK_SITE_URL = 'https://mohitomart.com';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

export const resolveSiteUrl = () => {
    const configuredSiteUrl = normalizeBaseUrl(import.meta.env.VITE_SITE_URL);
    if (configuredSiteUrl) {
        return configuredSiteUrl;
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return normalizeBaseUrl(window.location.origin);
    }

    return FALLBACK_SITE_URL;
};

export const normalizePath = (value = '/') => {
    const raw = String(value || '/').trim();
    if (!raw) {
        return '/';
    }

    const withoutHashOrQuery = raw.split('#')[0].split('?')[0];
    const prefixed = withoutHashOrQuery.startsWith('/') ? withoutHashOrQuery : `/${withoutHashOrQuery}`;
    const collapsed = prefixed.replace(/\/{2,}/g, '/');
    if (collapsed !== '/' && collapsed.endsWith('/')) {
        return collapsed.slice(0, -1);
    }

    return collapsed || '/';
};

export const toAbsoluteUrl = (value, siteUrl = resolveSiteUrl()) => {
    const raw = String(value || '').trim();
    if (!raw) {
        return siteUrl;
    }

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    if (raw.startsWith('//')) {
        return `https:${raw}`;
    }

    try {
        return new URL(raw, `${siteUrl}/`).toString();
    } catch (error) {
        const normalizedPath = normalizePath(raw);
        return `${siteUrl}${normalizedPath}`;
    }
};

export const stripHtml = (value = '') =>
    String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export const truncateMetaDescription = (value = '', maxLength = 160) => {
    const cleaned = stripHtml(value);
    if (cleaned.length <= maxLength) {
        return cleaned;
    }

    return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

export const decodeSeoSegment = (value = '') => {
    try {
        return decodeURIComponent(String(value || ''));
    } catch (error) {
        return String(value || '');
    }
};

export const humanizeSegment = (value = '') =>
    decodeSeoSegment(value)
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
