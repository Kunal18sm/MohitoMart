const Skeleton = ({ type }) => {
    if (type === 'product') {
        return (
            <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="h-[120px] w-full bg-gray-200 sm:h-36 md:h-40"></div>
                <div className="space-y-2 p-3">
                    <div className="hidden h-3 w-2/3 rounded bg-gray-200 sm:block"></div>
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-1/3 rounded bg-gray-200"></div>
                        <div className="h-3 w-1/4 rounded bg-gray-200"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Generic block
    return <div className="animate-pulse bg-gray-200 rounded-lg w-full h-32"></div>;
};

export default Skeleton;
