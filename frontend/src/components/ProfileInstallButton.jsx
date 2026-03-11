import { useInstallAppPrompt } from '../hooks/useInstallAppPrompt';

const ProfileInstallButton = () => {
    const { isInstalled, isInstalling, showPrompt } = useInstallAppPrompt();

    const handleInstall = () => {
        if (!isInstalled) {
            showPrompt();
        }
    };

    const buttonLabel = isInstalled ? 'App Installed' : 'Install App';

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
        </div>
    );
};

export default ProfileInstallButton;
