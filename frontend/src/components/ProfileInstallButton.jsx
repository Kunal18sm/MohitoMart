import { useState } from 'react';
import { useInstallAppPrompt } from '../hooks/useInstallAppPrompt';

const ProfileInstallButton = () => {
    const [showHint, setShowHint] = useState(false);
    const [showUnsupportedHint, setShowUnsupportedHint] = useState(false);
    const { canInstall, isInstalled, isInstalling, promptInstall, shouldShowManualHint } =
        useInstallAppPrompt();

    const handleInstall = async () => {
        if (isInstalled) {
            return;
        }

        if (canInstall) {
            setShowHint(false);
            setShowUnsupportedHint(false);
            await promptInstall();
            return;
        }

        if (shouldShowManualHint) {
            setShowHint((previous) => !previous);
            setShowUnsupportedHint(false);
            return;
        }

        setShowUnsupportedHint((previous) => !previous);
        setShowHint(false);
    };

    const buttonLabel = isInstalled
        ? 'App Installed'
        : canInstall
            ? 'Install App'
            : shouldShowManualHint
                ? 'Add to Home'
                : 'Install App';

    return (
        <div className="flex flex-col items-end gap-1.5">
            <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalled || isInstalling}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isInstalled
                        ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15'
                }`}
            >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v11m0 0 4-4m-4 4-4-4m-5 9h18" />
                </svg>
                {isInstalling ? 'Installing...' : buttonLabel}
            </button>

            {showHint ? (
                <p className="max-w-[220px] text-right text-[11px] leading-relaxed text-gray-500">
                    Safari me Share dabayein, phir <span className="font-semibold">Add to Home Screen</span> select karein.
                </p>
            ) : null}

            {showUnsupportedHint ? (
                <p className="max-w-[220px] text-right text-[11px] leading-relaxed text-gray-500">
                    Install option ke liye page ko Chrome ya Edge me open karein.
                </p>
            ) : null}
        </div>
    );
};

export default ProfileInstallButton;
