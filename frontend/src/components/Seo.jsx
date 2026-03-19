import { useLayoutEffect } from 'react';
import {
    DEFAULT_ROBOTS_POLICY,
    DEFAULT_SITE_DESCRIPTION,
    DEFAULT_SOCIAL_IMAGE_PATH,
    SITE_NAME,
    normalizePath,
    resolveSiteUrl,
    toAbsoluteUrl,
    truncateMetaDescription,
} from '../utils/seo';

const STRUCTURED_DATA_SCRIPT_ID = 'mm-seo-structured-data';

const upsertMetaTag = (key, value, content) => {
    if (!key || !value) {
        return;
    }

    let element = document.head.querySelector(`meta[${key}="${value}"]`);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(key, value);
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
};

const upsertCanonical = (href) => {
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', href);
};

const upsertStructuredData = (payload) => {
    const existing = document.head.querySelector(`#${STRUCTURED_DATA_SCRIPT_ID}`);

    if (!payload) {
        if (existing) {
            existing.remove();
        }
        return;
    }

    const normalizedPayload = Array.isArray(payload)
        ? payload.filter(Boolean)
        : [payload].filter(Boolean);

    if (!normalizedPayload.length) {
        if (existing) {
            existing.remove();
        }
        return;
    }

    const nextContent = JSON.stringify(
        normalizedPayload.length === 1 ? normalizedPayload[0] : normalizedPayload
    );

    const scriptElement = existing || document.createElement('script');
    scriptElement.id = STRUCTURED_DATA_SCRIPT_ID;
    scriptElement.setAttribute('type', 'application/ld+json');
    scriptElement.textContent = nextContent;

    if (!existing) {
        document.head.appendChild(scriptElement);
    }
};

const Seo = ({
    title = SITE_NAME,
    description = DEFAULT_SITE_DESCRIPTION,
    path = '/',
    image = DEFAULT_SOCIAL_IMAGE_PATH,
    type = 'website',
    robots = DEFAULT_ROBOTS_POLICY,
    noindex = false,
    structuredData = null,
}) => {
    useLayoutEffect(() => {
        const siteUrl = resolveSiteUrl();
        const normalizedPath = normalizePath(path);
        const canonicalUrl = toAbsoluteUrl(normalizedPath, siteUrl);
        const socialImageUrl = toAbsoluteUrl(image || DEFAULT_SOCIAL_IMAGE_PATH, siteUrl);
        const normalizedTitle = String(title || SITE_NAME).trim() || SITE_NAME;
        const fullTitle = normalizedTitle.toLowerCase().includes(SITE_NAME.toLowerCase())
            ? normalizedTitle
            : `${normalizedTitle} | ${SITE_NAME}`;
        const normalizedDescription =
            truncateMetaDescription(description, 160) || DEFAULT_SITE_DESCRIPTION;
        const robotsPolicy = noindex ? 'noindex,nofollow' : robots || DEFAULT_ROBOTS_POLICY;

        document.title = fullTitle;
        upsertCanonical(canonicalUrl);

        upsertMetaTag('name', 'description', normalizedDescription);
        upsertMetaTag('name', 'robots', robotsPolicy);
        upsertMetaTag('name', 'googlebot', robotsPolicy);

        upsertMetaTag('property', 'og:title', fullTitle);
        upsertMetaTag('property', 'og:description', normalizedDescription);
        upsertMetaTag('property', 'og:type', String(type || 'website'));
        upsertMetaTag('property', 'og:url', canonicalUrl);
        upsertMetaTag('property', 'og:site_name', SITE_NAME);
        upsertMetaTag('property', 'og:image', socialImageUrl);
        upsertMetaTag('property', 'og:image:alt', normalizedTitle);
        upsertMetaTag('property', 'og:locale', 'en_IN');

        upsertMetaTag('name', 'twitter:card', 'summary_large_image');
        upsertMetaTag('name', 'twitter:title', fullTitle);
        upsertMetaTag('name', 'twitter:description', normalizedDescription);
        upsertMetaTag('name', 'twitter:image', socialImageUrl);

        upsertStructuredData(structuredData);
    }, [description, image, noindex, path, robots, structuredData, title, type]);

    return null;
};

export default Seo;
