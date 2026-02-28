import { useEffect, useState } from 'react';

const SHOW_DELAY_MS = 120;

const GlobalSavingOverlay = () => {
    const [pendingCount, setPendingCount] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleMutationState = (event) => {
            setPendingCount(Number(event.detail?.pendingCount || 0));
        };

        window.addEventListener('app:mutation-state', handleMutationState);
        return () => {
            window.removeEventListener('app:mutation-state', handleMutationState);
        };
    }, []);

    useEffect(() => {
        if (pendingCount > 0) {
            const showTimer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
            return () => window.clearTimeout(showTimer);
        }

        setVisible(false);
        return undefined;
    }, [pendingCount]);

    if (!visible) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px]">
            <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white px-4 py-3 shadow-xl">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-semibold text-dark">Saving changes...</p>
            </div>
        </div>
    );
};

export default GlobalSavingOverlay;
