import { useFlash } from '../context/FlashContext';

const FlashBanner = () => {
    const { flash, clearFlash } = useFlash();

    if (!flash) {
        return null;
    }

    const palette =
        flash.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-700';

    return (
        <div className="sticky top-[76px] z-40">
            <div className="container mx-auto px-4 pt-3">
                <div className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-sm ${palette}`}>
                    <p className="font-medium">{flash.message}</p>
                    <button
                        type="button"
                        onClick={clearFlash}
                        className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-black/5"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlashBanner;
