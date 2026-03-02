import axios from 'axios';
import { extractErrorMessage } from '../utils/errorUtils';

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);
let pendingMutationCount = 0;
const SESSION_MARKER_KEY = 'authToken';
const USER_PROFILE_KEY = 'userProfile';
const CSRF_COOKIE_KEY = 'mm_csrf';

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

const api = axios.create({
    baseURL: resolveApiBaseUrl(),
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const method = String(config.method || 'get').toLowerCase();
    if (MUTATION_METHODS.has(method)) {
        config.__trackMutation = true;
        pendingMutationCount += 1;
        emitMutationState();

        const csrfToken = readCookieValue(CSRF_COOKIE_KEY);
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

        return response;
    },
    (error) => {
        if (error.config?.__trackMutation) {
            decrementMutationCount();
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

const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const apiCache = new Map();

const isCacheable = (url) => {
    if (!url) return false;
    return url.includes('/random') ||
        url.includes('/latest') ||
        url.includes('/categories') ||
        url.includes('/feed/followed/random');
};

const originalGet = api.get;
api.get = async (url, config = {}) => {
    if (isCacheable(url)) {
        const cacheKey = `${url}?${new URLSearchParams(config.params || {}).toString()}`;
        const cachedEntry = apiCache.get(cacheKey);

        if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
            return Promise.resolve(cachedEntry.data);
        }

        try {
            const response = await originalGet(url, config);
            apiCache.set(cacheKey, { data: response, timestamp: Date.now() });
            return response;
        } catch (error) {
            throw error;
        }
    }
    return originalGet(url, config);
};

export default api;
