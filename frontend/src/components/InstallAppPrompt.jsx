import { useEffect, useState } from 'react';

const INSTALL_COMPLETED_KEY = 'mohito_app_installed_v1';

const isStandaloneMode = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIosSafari = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|chrome/.test(userAgent);
    return isIos && isSafari;
};

const InstallAppPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [showManualHint, setShowManualHint] = useState(false);

    useEffect(() => {
        if (isStandaloneMode()) {
            return;
        }

        if (localStorage.getItem(INSTALL_COMPLETED_KEY) === 'true') {
            return;
        }

        if (isIosSafari()) {
            setShowManualHint(true);
            setIsVisible(true);
        }

        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setShowManualHint(false);
            setDeferredPrompt(event);
            setIsVisible(true);
        };

        const handleAppInstalled = () => {
            localStorage.setItem(INSTALL_COMPLETED_KEY, 'true');
            setDeferredPrompt(null);
            setIsVisible(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const closePrompt = () => {
        setDeferredPrompt(null);
        setShowManualHint(false);
        setIsVisible(false);
    };

    const installApp = async () => {
        if (!deferredPrompt) {
            return;
        }

        setIsInstalling(true);
        deferredPrompt.prompt();

        try {
            const choiceResult = await deferredPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                localStorage.setItem(INSTALL_COMPLETED_KEY, 'true');
            }
        } finally {
            setDeferredPrompt(null);
            setIsVisible(false);
            setIsInstalling(false);
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed left-1/2 top-[88px] z-[70] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-primary/20 bg-white/95 p-4 shadow-[0_24px_54px_-24px_rgba(15,23,42,0.55)] backdrop-blur sm:top-[96px]">
            <div className="mb-2 flex items-center gap-2">
                <img src="/logo/mohito-192.png" alt="Mohito Mart" className="h-8 w-8 rounded-lg object-cover" />
                <p className="text-sm font-semibold text-dark">Install Mohito Mart</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
                {showManualHint
                    ? 'Safari me Share button dabayein, phir Add to Home Screen select karein.'
                    : 'Ek click me app install karein aur home screen se direct open karein.'}
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={closePrompt}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                    {showManualHint ? 'Got it' : 'Not now'}
                </button>
                {deferredPrompt ? (
                    <button
                        type="button"
                        onClick={installApp}
                        disabled={isInstalling}
                        className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isInstalling ? 'Installing...' : 'Install App'}
                    </button>
                ) : null}
            </div>
        </div>
    );
};

export default InstallAppPrompt;
