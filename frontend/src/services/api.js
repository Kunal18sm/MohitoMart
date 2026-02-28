import axios from 'axios';
import { extractErrorMessage } from '../utils/errorUtils';

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);
let pendingMutationCount = 0;

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
    }

    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
        const message = extractErrorMessage(
            error,
            status
                ? `Request failed with status ${status}`
                : 'Network error. Check backend server and CORS.'
        );

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('app:api-error', {
                    detail: {
                        message,
                        status,
                        path: error.config?.url || '',
                    },
                })
            );
        }

        return Promise.reject(error);
    }
);

export default api;
