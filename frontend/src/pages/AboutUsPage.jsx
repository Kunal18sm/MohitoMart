import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AboutUsPage = () => {
    const { t } = useTranslation();

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('about_us') || 'About Us'}</p>
                <h1 className="mt-2 text-3xl font-black text-dark sm:text-4xl">Mohito Mart</h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                    {t('about_us_intro') || 'Mohito Mart is a local-first marketplace where users can quickly discover nearby shops, products, and services. Our focus is a simple experience, trusted listings, and neighborhood-level relevance.'}
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black text-dark">{t('what_we_do') || 'What We Do'}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {t('what_we_do_desc') || 'Through a city and area-based feed, we show users nearby products and services. Shop owners can manage their listings and reach a local audience.'}
                    </p>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black text-dark">{t('our_vision') || 'Our Vision'}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {t('our_vision_desc') || 'Our vision is to make local commerce digital and accessible so both small and large businesses can grow efficiently.'}
                    </p>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black text-dark">{t('transparency') || 'Transparency'}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {t('transparency_desc') || 'We prioritize user privacy, clear policies, and responsible data handling.'}
                    </p>
                </section>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <Link
                    to="/privacy-policy"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary"
                >
                    {t('read_privacy_policy') || 'Read Privacy Policy'}
                </Link>
                <Link
                    to="/terms-and-conditions"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary"
                >
                    {t('read_terms_and_conditions') || 'Read Terms & Conditions'}
                </Link>
                <Link
                    to="/contact-us"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary"
                >
                    {t('contact_us') || 'Contact Us'}
                </Link>
            </div>
        </div>
    );
};

export default AboutUsPage;
