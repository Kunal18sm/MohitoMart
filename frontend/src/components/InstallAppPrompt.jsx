import { useInstallAppPrompt } from '../hooks/useInstallAppPrompt';

const InstallAppPrompt = () => {
    const {
        canInstall,
        dismissPrompt,
        isInstalled,
        isInstalling,
        isPromptVisible,
        promptInstall,
        showManualHint,
    } = useInstallAppPrompt();

    if (!isPromptVisible || isInstalled) {
        return null;
    }

    return (
        <div className="fixed left-1/2 top-[88px] z-[70] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-primary/20 bg-white/95 p-4 shadow-[0_24px_54px_-24px_rgba(15,23,42,0.55)] backdrop-blur sm:top-[96px]">
            <div className="mb-2 flex items-center gap-2">
                <img src="/logo/mohito-192-optimized.png" alt="Mohito Mart" className="h-8 w-8 rounded-lg object-cover" />
                <p className="text-sm font-semibold text-dark">Install Mohito Mart</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
                {showManualHint
                    ? 'Safari me Share button dabayein, phir Add to Home Screen select karein.'
                    : canInstall 
                        ? 'Ek click me app install karein aur home screen se direct open karein.' 
                        : "Browser menu (⋮) open karein aur 'Install app' ya 'Add to Home screen' select karein."}
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={dismissPrompt}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                    {showManualHint ? 'Got it' : 'Not now'}
                </button>
                {canInstall ? (
                    <button
                        type="button"
                        onClick={promptInstall}
                        disabled={isInstalling}
                        className="install-app-cta rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isInstalling ? 'Installing...' : 'Install App'}
                    </button>
                ) : null}
            </div>
        </div>
    );
};

export default InstallAppPrompt;
