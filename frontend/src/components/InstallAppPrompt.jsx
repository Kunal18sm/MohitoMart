import { useEffect, useState } from 'react';

const INSTALL_PROMPT_DISMISSED_KEY = 'mohito_install_prompt_dismissed_v2';

const isStandaloneMode = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const InstallAppPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        if (isStandaloneMode()) {
            return;
        }

        const isDismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === 'true';
        if (isDismissed) {
            return;
        }

        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
            setIsVisible(true);
        };

        const handleAppInstalled = () => {
            localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
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
        localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
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
                localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
            }
        } finally {
            setDeferredPrompt(null);
            setIsVisible(false);
            setIsInstalling(false);
        }
    };

    if (!isVisible || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed left-1/2 top-[88px] z-[70] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-primary/20 bg-white/95 p-4 shadow-[0_24px_54px_-24px_rgba(15,23,42,0.55)] backdrop-blur sm:top-[96px]">
            <p className="text-sm font-semibold text-dark">Install Mohito Mart</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Ek click me app install karein aur home screen se direct open karein.
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={closePrompt}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                    Not now
                </button>
                <button
                    type="button"
                    onClick={installApp}
                    disabled={isInstalling}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isInstalling ? 'Installing...' : 'Install App'}
                </button>
            </div>
        </div>
    );
};

export default InstallAppPrompt;
