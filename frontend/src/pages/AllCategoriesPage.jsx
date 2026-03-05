import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import {
    filterCategoriesWithLocalImages,
    getCategoryLocalImage,
    handleCategoryImageError,
} from '../utils/categoryImage';

const AllCategoriesPage = () => {
    const { t } = useTranslation();
    const { showError } = useFlash();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/shops/categories');
                setCategories(filterCategoriesWithLocalImages(data.categories || []));
            } catch (error) {
                showError(extractErrorMessage(error, t('unable_load_categories') || 'Unable to load categories'));
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="mb-2 text-sm text-gray-500">{t('explore_all_categories') || 'Explore every category at Mohito Mart'}</p>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">{t('all_categories') || 'All Categories'}</h1>
                </div>
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-dark transition hover:border-slate-400 hover:bg-slate-50"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 19-7-7 7-7" />
                    </svg>
                    {t('back_to_home') || 'Back to Home'}
                </Link>
            </div>

            {loading && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {[...Array(10)].map((_, index) => (
                        <div
                            key={index}
                            className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
                        />
                    ))}
                </div>
            )}

            {!loading && categories.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                    {t('categories_not_available') || 'Categories are not available.'}
                </p>
            )}

            {!loading && categories.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {categories.map((category, index) => (
                        <motion.div
                            key={category}
                            className="h-full"
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.02, duration: 0.25 }}
                        >
                            <Link
                                to={`/category/${encodeURIComponent(category.toLowerCase())}`}
                                className="block h-full rounded-[18px] border border-slate-300/50 bg-gradient-to-b from-white to-slate-50 p-1.5 transition hover:-translate-y-0.5 hover:shadow-sm"
                            >
                                <div className="mx-auto mb-2 h-24 w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <img
                                        src={getCategoryLocalImage(category)}
                                        alt={category}
                                        loading="lazy"
                                        decoding="async"
                                        onError={(event) =>
                                            handleCategoryImageError(event, category, {
                                                width: 640,
                                                height: 420,
                                            })
                                        }
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <p className="line-clamp-2 min-h-[2.5em] px-1 text-center text-sm font-semibold leading-tight text-slate-800">
                                    {category}
                                </p>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AllCategoriesPage;
