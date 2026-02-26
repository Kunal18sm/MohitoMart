import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { extractErrorMessage } from '../utils/errorUtils';

const FlashContext = createContext(null);
const DEFAULT_TIMEOUT = 5000;

export const FlashProvider = ({ children }) => {
    const [flash, setFlash] = useState(null);

    const clearFlash = () => setFlash(null);

    const showFlash = (message, type = 'error', duration = DEFAULT_TIMEOUT) => {
        if (!message) {
            return;
        }

        setFlash({
            id: Date.now(),
            message,
            type,
            duration,
        });
    };

    useEffect(() => {
        if (!flash) {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            setFlash(null);
        }, flash.duration || DEFAULT_TIMEOUT);

        return () => window.clearTimeout(timer);
    }, [flash]);

    useEffect(() => {
        const onApiError = (event) => {
            const message = event.detail?.message || 'Request failed';
            showFlash(message, 'error');
        };

        const onFlashEvent = (event) => {
            showFlash(
                event.detail?.message,
                event.detail?.type || 'error',
                event.detail?.duration || DEFAULT_TIMEOUT
            );
        };

        const onUnhandledRejection = (event) => {
            const message = extractErrorMessage(event.reason, 'Unexpected error');
            showFlash(message, 'error');
        };

        window.addEventListener('app:api-error', onApiError);
        window.addEventListener('app:flash', onFlashEvent);
        window.addEventListener('unhandledrejection', onUnhandledRejection);

        return () => {
            window.removeEventListener('app:api-error', onApiError);
            window.removeEventListener('app:flash', onFlashEvent);
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
        };
    }, []);

    const value = useMemo(
        () => ({
            flash,
            showFlash,
            showError: (message, duration) => showFlash(message, 'error', duration),
            showSuccess: (message, duration) => showFlash(message, 'success', duration),
            clearFlash,
        }),
        [flash]
    );

    return <FlashContext.Provider value={value}>{children}</FlashContext.Provider>;
};

export const useFlash = () => {
    const context = useContext(FlashContext);
    if (!context) {
        throw new Error('useFlash must be used inside FlashProvider');
    }
    return context;
};
