import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded';
import { motion } from 'framer-motion';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import {
    filterCategoriesWithLocalImages,
    getCategoryLocalImage,
    handleCategoryImageError,
} from '../utils/categoryImage';

const AllCategoriesPage = () => {
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
                showError(extractErrorMessage(error, 'Unable to load categories'));
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
                    <p className="mb-2 text-sm text-gray-500">Explore every category at Mohito Mart</p>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">All Categories</h1>
                </div>
                <Button
                    component={Link}
                    to="/"
                    variant="outlined"
                    startIcon={<KeyboardBackspaceRoundedIcon />}
                    sx={{
                        borderRadius: '999px',
                        textTransform: 'none',
                        fontWeight: 700,
                    }}
                >
                    Back to Home
                </Button>
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
                    Categories available nahi hain.
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
                            <Card
                                elevation={0}
                                sx={{
                                    height: '100%',
                                    borderRadius: '18px',
                                    border: '1px solid rgba(148,163,184,0.25)',
                                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                                }}
                            >
                                <CardActionArea
                                    component={Link}
                                    to={`/category/${encodeURIComponent(category.toLowerCase())}`}
                                    sx={{
                                        p: 1.5,
                                        minHeight: 158,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                    }}
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
                                    <CardContent sx={{ p: 0, textAlign: 'center', '&:last-child': { pb: 0 } }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.9rem',
                                                color: '#1e293b',
                                                lineHeight: 1.25,
                                                minHeight: '2.5em',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {category}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AllCategoriesPage;
