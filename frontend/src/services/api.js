import axios from 'axios';
import { extractErrorMessage } from '../utils/errorUtils';

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);
let pendingMutationCount = 0;
const SESSION_MARKER_KEY = 'authToken';
const USER_PROFILE_KEY = 'userProfile';
const CSRF_COOKIE_KEY = 'mm_csrf';
const CSRF_STORAGE_KEY = 'mm_csrf_token';

const resolveApiBaseUrl = () => {
    const fallbackBaseUrl = 'http://localhost:5000/api';
    const configuredBaseUrl = String(import.meta.env.VITE_API_URL || fallbackBaseUrl).trim();

    if (!configuredBaseUrl) {
        return fallbackBaseUrl;
    }

    const normalized = configuredBaseUrl.replace(/\/+$/, '');
    if (/\/api(\/|$)/i.test(normalized)) {
        return normalized;
    }

    return `${normalized}/api`;
};

const emitMutationState = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('app:mutation-state', {
                detail: {
                    pendingCount: pendingMutationCount,
                },
            })
        );
    }
};

const decrementMutationCount = () => {
    pendingMutationCount = Math.max(0, pendingMutationCount - 1);
    emitMutationState();
};

const readCookieValue = (name) => {
    if (typeof document === 'undefined') {
        return '';
    }

    const segments = document.cookie.split(';').map((segment) => segment.trim());
    const cookie = segments.find((segment) => segment.startsWith(`${name}=`));
    if (!cookie) {
        return '';
    }

    return decodeURIComponent(cookie.slice(name.length + 1));
};

const readStoredCsrfToken = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return String(window.localStorage.getItem(CSRF_STORAGE_KEY) || '').trim();
};

const storeCsrfToken = (token) => {
    if (typeof window === 'undefined') {
        return;
    }

    const normalizedToken = String(token || '').trim();
    if (normalizedToken) {
        window.localStorage.setItem(CSRF_STORAGE_KEY, normalizedToken);
    } else {
        window.localStorage.removeItem(CSRF_STORAGE_KEY);
    }
};

const readCsrfTokenFromHeaders = (headers = {}) =>
    String(headers?.['x-csrf-token'] || headers?.['X-CSRF-Token'] || '').trim();

const api = axios.create({
    baseURL: resolveApiBaseUrl(),
    withCredentials: true,
});

const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const MAX_CACHE_ENTRIES = 120;
const apiCache = new Map();
const pendingGetRequests = new Map();

const isCacheable = (url) => {
    if (!url) return false;
    return (
        url.includes('/random') ||
        url.includes('/latest') ||
        url.includes('/categories') ||
        url.includes('/feed/followed/random') ||
        url.includes('/shops/locations') ||
        url.includes('/banners/home')
    );
};

const buildCacheKey = (url, params = {}) => {
    const normalizedParams = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([left], [right]) => String(left).localeCompare(String(right)))
        .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value]);

    return `${url}?${new URLSearchParams(normalizedParams).toString()}`;
};

const clearApiCache = () => {
    apiCache.clear();
    pendingGetRequests.clear();
};

const pruneApiCache = () => {
    if (apiCache.size <= MAX_CACHE_ENTRIES) {
        return;
    }

    const entries = [...apiCache.entries()].sort(
        (left, right) => Number(left[1]?.timestamp || 0) - Number(right[1]?.timestamp || 0)
    );
    const removableCount = Math.max(0, entries.length - MAX_CACHE_ENTRIES);
    for (let index = 0; index < removableCount; index += 1) {
        apiCache.delete(entries[index][0]);
    }
};

api.interceptors.request.use((config) => {
    const method = String(config.method || 'get').toLowerCase();
    if (MUTATION_METHODS.has(method)) {
        clearApiCache();
        config.__trackMutation = true;
        pendingMutationCount += 1;
        emitMutationState();

        const csrfToken = readStoredCsrfToken() || readCookieValue(CSRF_COOKIE_KEY);
        if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => {
        if (response.config?.__trackMutation) {
            decrementMutationCount();
        }

        const csrfToken = readCsrfTokenFromHeaders(response.headers);
        if (csrfToken) {
            storeCsrfToken(csrfToken);
        }

        return response;
    },
    (error) => {
        if (error.config?.__trackMutation) {
            decrementMutationCount();
        }

        const csrfToken = readCsrfTokenFromHeaders(error.response?.headers);
        if (csrfToken) {
            storeCsrfToken(csrfToken);
        }

        const status = error.response?.status;
        const requestPath = String(error.config?.url || '');
        const isAuthFlowPath =
            requestPath.includes('/auth/login') ||
            requestPath.includes('/auth/register') ||
            requestPath.includes('/auth/logout');

        if (status === 401 && !isAuthFlowPath) {
            try {
                localStorage.removeItem(SESSION_MARKER_KEY);
                localStorage.removeItem(USER_PROFILE_KEY);
                window.dispatchEvent(new Event('storage'));
            } catch (sessionError) {
                // ignore local storage cleanup errors
            }
        }

        const message = extractErrorMessage(
            error,
            status
                ? `Request failed with status ${status}`
                : 'Network error. Check backend server and CORS.'
        );

        if (typeof window !== 'undefined' && !error.config?.__silentError) {
            window.dispatchEvent(
                new CustomEvent('app:api-error', {
                    detail: {
                        message,
                        status,
                        path: requestPath,
                    },
                })
            );
        }

        return Promise.reject(error);
    }
);

const originalGet = api.get;
api.get = async (url, config = {}) => {
    const cacheEnabled = config.cache !== false;
    if (cacheEnabled && isCacheable(url)) {
        const cacheKey = buildCacheKey(url, config.params || {});
        const cachedEntry = apiCache.get(cacheKey);

        if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
            return Promise.resolve(cachedEntry.data);
        }

        if (pendingGetRequests.has(cacheKey)) {
            return pendingGetRequests.get(cacheKey);
        }

        try {
            const requestPromise = originalGet(url, config)
                .then((response) => {
                    apiCache.set(cacheKey, { data: response, timestamp: Date.now() });
                    pruneApiCache();
                    pendingGetRequests.delete(cacheKey);
                    return response;
                })
                .catch((error) => {
                    pendingGetRequests.delete(cacheKey);
                    throw error;
                });

            pendingGetRequests.set(cacheKey, requestPromise);
            return requestPromise;
        } catch (error) {
            throw error;
        }
    }
    return originalGet(url, config);
};

export default api;
