import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TermsConditionsPage = () => {
    const { t } = useTranslation();

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('legal') || 'Legal'}</p>
                <h1 className="mt-2 text-3xl font-black text-dark sm:text-4xl">{t('terms_and_conditions') || 'Terms & Conditions'}</h1>
                <p className="mt-2 text-xs text-gray-500">{t('last_updated_2026_03_05') || 'Last updated: March 5, 2026'}</p>

                <div className="mt-5 space-y-5 text-sm leading-relaxed text-gray-600">
                    <section>
                        <h2 className="text-base font-black text-dark">{t('terms_platform_use_title') || '1. Platform Use'}</h2>
                        <p className="mt-1">
                            {t('terms_platform_use_desc') || 'By using Mohito Mart, you agree to provide accurate information, perform lawful activities, and follow platform policies.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('terms_listings_title') || '2. Listings & Availability'}</h2>
                        <p className="mt-1">
                            {t('terms_listings_desc') || 'Product/service details, prices, stock, and timings are provided by shop owners. Mohito Mart does not fully guarantee third-party listing accuracy.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('terms_user_accounts_title') || '3. User Accounts'}</h2>
                        <p className="mt-1">
                            {t('terms_user_accounts_desc') || 'Keeping account credentials secure is the user\'s responsibility. Access may be suspended or restricted for suspicious use or policy violations.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('terms_prohibited_title') || '4. Prohibited Activities'}</h2>
                        <p className="mt-1">
                            {t('terms_prohibited_desc') || 'Spam, fraud, abusive behavior, unauthorized scraping, or platform misuse is strictly prohibited.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('terms_liability_title') || '5. Liability'}</h2>
                        <p className="mt-1">
                            {t('terms_liability_desc') || 'Due to the intermediary nature of a marketplace, Mohito Mart follows a limited liability principle for direct seller obligations or third-party disputes.'}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-black text-dark">{t('terms_policy_updates_title') || '6. Policy Updates'}</h2>
                        <p className="mt-1">
                            {t('terms_policy_updates_desc') || 'Terms may be updated from time to time. Continued use will be treated as acceptance of the updated terms.'}
                        </p>
                    </section>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <Link
                    to="/privacy-policy"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary"
                >
                    {t('privacy_policy') || 'Privacy Policy'}
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

export default TermsConditionsPage;
