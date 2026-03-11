import { useEffect, useState } from 'react';   

// install 

export const INSTALL_COMPLETED_KEY = 'mohito_app_installed_v1';

export const isStandaloneMode = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const isIosSafari = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|chrome/.test(userAgent);
    return isIos && isSafari;
};

const listeners = new Set();

let installState = {
    deferredPrompt: null,
    isInstalling: false,
    isInstalled: false,
    isPromptVisible: false,
    showManualHint: false,
};

const emitChange = () => {
    const snapshot = {
        ...installState,
        canInstall: Boolean(installState.deferredPrompt),
        shouldShowManualHint: !installState.isInstalled && isIosSafari(),
    };

    listeners.forEach((listener) => listener(snapshot));
};

const setInstallState = (updates) => {
    installState = {
        ...installState,
        ...updates,
    };
    emitChange();
};

if (typeof window !== 'undefined') {
    const installed =
        isStandaloneMode() || window.localStorage.getItem(INSTALL_COMPLETED_KEY) === 'true';

    installState = {
        ...installState,
        deferredPrompt: window.deferredInstallPrompt || null,
        isInstalled: installed,
        isPromptVisible: Boolean(window.deferredInstallPrompt) || (!installed && isIosSafari()),
        showManualHint: !installed && isIosSafari(),
    };

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        window.deferredInstallPrompt = event;
        setInstallState({
            deferredPrompt: event,
            isPromptVisible: true,
            showManualHint: false,
        });
    });

    window.addEventListener('appinstalled', () => {
        window.localStorage.setItem(INSTALL_COMPLETED_KEY, 'true');
        setInstallState({
            deferredPrompt: null,
            isInstalling: false,
            isInstalled: true,
            isPromptVisible: false,
            showManualHint: false,
        });
    });
}

const subscribe = (listener) => {
    listeners.add(listener);
    listener({
        ...installState,
        canInstall: Boolean(installState.deferredPrompt),
        shouldShowManualHint: !installState.isInstalled && isIosSafari(),
    });

    return () => {
        listeners.delete(listener);
    };
};

const dismissPrompt = () => {
    setInstallState({
        isPromptVisible: false,
        showManualHint: false,
    });
};

const showPrompt = () => {
    if (!installState.isInstalled) {
        setInstallState({
            isPromptVisible: true,
            showManualHint: isIosSafari() && !installState.deferredPrompt,
        });
    }
};

const promptInstall = async () => {
    if (!installState.deferredPrompt) {
        return {
            outcome: null,
            type: isIosSafari() ? 'manual' : 'unsupported',
        };
    }

    const promptEvent = installState.deferredPrompt;
    setInstallState({
        isInstalling: true,
        isPromptVisible: false,
        showManualHint: false,
    });

    try {
        promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        const accepted = choiceResult?.outcome === 'accepted';

        if (accepted && typeof window !== 'undefined') {
            window.localStorage.setItem(INSTALL_COMPLETED_KEY, 'true');
        }

        setInstallState({
            deferredPrompt: null,
            isInstalling: false,
            isInstalled: accepted || installState.isInstalled,
            isPromptVisible: false,
            showManualHint: false,
        });

        return {
            outcome: choiceResult?.outcome || null,
            type: 'prompt',
        };
    } catch (error) {
        setInstallState({
            deferredPrompt: null,
            isInstalling: false,
        });

        return {
            outcome: null,
            type: 'error',
        };
    }
};

export const useInstallAppPrompt = () => {
    const [snapshot, setSnapshot] = useState({
        ...installState,
        canInstall: Boolean(installState.deferredPrompt),
        shouldShowManualHint: !installState.isInstalled && isIosSafari(),
    });

    useEffect(() => {
        return subscribe(setSnapshot);
    }, []);

    return {
        ...snapshot,
        dismissPrompt,
        showPrompt,
        promptInstall,
    };
};
