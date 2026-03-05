import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PrivacyPolicyPage = () => {
    const { t } = useTranslation();

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('legal') || 'Legal'}</p>
                <h1 className="mt-2 text-3xl font-black text-dark sm:text-4xl">{t('privacy_policy') || 'Privacy Policy'}</h1>
                <p className="mt-2 text-xs text-gray-500">{t('last_updated_2026_03_05') || 'Last updated: March 5, 2026'}</p>

                <div className="mt-5 space-y-5 text-sm leading-relaxed text-gray-600">
                    <section>
                        <h2 className="text-base font-black text-dark">{t('privacy_data_collect_title') || '1. Data We Collect'}</h2>
                        <p className="mt-1">
                            {t('privacy_data_collect_desc') || 'Account details (name/email), selected location information (city/area), and platform activity data may be collected to improve service quality.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('privacy_data_use_title') || '2. Why We Use Data'}</h2>
                        <p className="mt-1">
                            {t('privacy_data_use_desc') || 'Data is used for nearby product/service recommendations, account security, personalization, and operational analytics.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('privacy_location_title') || '3. Location Data'}</h2>
                        <p className="mt-1">
                            {t('privacy_location_desc') || 'Location permission is optional. If you allow it, location data is used to provide a relevant city/area feed.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('privacy_sharing_title') || '4. Data Sharing'}</h2>
                        <p className="mt-1">
                            {t('privacy_sharing_desc') || 'We do not sell personal data to unauthorized third parties. Limited sharing happens only for service operations, compliance, or legal obligations.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('privacy_security_title') || '5. Data Security'}</h2>
                        <p className="mt-1">
                            {t('privacy_security_desc') || 'Reasonable technical and operational safeguards are applied, but absolute security cannot be guaranteed in internet-based systems.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('privacy_choices_title') || '6. Your Choices'}</h2>
                        <p className="mt-1">
                            {t('privacy_choices_desc') || 'You can update your profile data and change location preferences. For additional privacy requests, contact support.'}
                        </p>
                    </section>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <Link
                    to="/terms-and-conditions"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary"
                >
                    {t('terms_and_conditions') || 'Terms & Conditions'}
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

export default PrivacyPolicyPage;
