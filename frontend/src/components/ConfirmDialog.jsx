const ConfirmDialog = ({
    open,
    title = 'Confirm Action',
    message = 'Do you really want to continue?',
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    loading = false,
    danger = true,
}) => {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-black text-dark">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                            danger
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-dark hover:bg-primary'
                        }`}
                    >
                        {loading ? 'Please wait...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
