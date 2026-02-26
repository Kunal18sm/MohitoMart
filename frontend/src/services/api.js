import axios from 'axios';
import { extractErrorMessage } from '../utils/errorUtils';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
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
