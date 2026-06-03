import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import ActionButton from './ActionButton';

interface CookieSettings {
    strictlyNecessary: boolean;
    targeting: boolean;
    performance: boolean;
}

interface CookieSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: CookieSettings) => void;
}

const CookieSettingsModal: React.FC<CookieSettingsModalProps> = ({ isOpen, onClose, onSave }) => {
    const [settings, setSettings] = useState<CookieSettings>({
        strictlyNecessary: true,
        targeting: true,
        performance: true,
    });
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    useEffect(() => {
        // Load saved settings from localStorage
        const savedSettings = localStorage.getItem('cookieSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, [isOpen]);

    const handleToggle = (key: keyof CookieSettings) => {
        if (key === 'strictlyNecessary') return; // Cannot disable necessary cookies
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleRejectAll = () => {
        const newSettings: CookieSettings = {
            strictlyNecessary: true,
            targeting: false,
            performance: false,
        };
        setSettings(newSettings);
        saveAndClose(newSettings);
    };

    const handleConfirm = () => {
        saveAndClose(settings);
    };

    const saveAndClose = (settingsToSave: CookieSettings) => {
        localStorage.setItem('cookieSettings', JSON.stringify(settingsToSave));
        localStorage.setItem('cookieConsent', 'true');
        localStorage.setItem('cookieConsentDate', new Date().toISOString());
        onSave(settingsToSave);
        onClose();
    };

    const toggleCategory = (category: string) => {
        setExpandedCategory(expandedCategory === category ? null : category);
    };

    if (!isOpen) return null;

    const cookieCategories = [
        {
            key: 'strictlyNecessary' as keyof CookieSettings,
            title: 'Strictly Necessary Cookies',
            alwaysActive: true,
            description: 'These cookies are necessary for the website to function and cannot be switched off. They are usually set in response to actions made by you such as setting your privacy preferences, logging in or filling in forms.',
        },
        {
            key: 'targeting' as keyof CookieSettings,
            title: 'Targeting Cookies',
            alwaysActive: false,
            description: 'These cookies may be set through our site by our advertising partners. They may be used to build a profile of your interests and show you relevant adverts on other sites. They work by uniquely identifying your browser and device.',
        },
        {
            key: 'performance' as keyof CookieSettings,
            title: 'Performance Cookies',
            alwaysActive: false,
            description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.',
        },
    ];

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            data-testid="cookie-settings-modal"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Close button */}
                <button
                    data-testid="cookie-settings-close"
                    onClick={onClose}
                    className="absolute top-3.5 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                    aria-label="Close cookie settings"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="p-3.5 sm:p-5 pb-0">
                    {/* Logo */}
                    <div className="flex items-center gap-2 mb-3">
                        <img src="/logo.png" alt="Scrapi" className="w-7 h-7 object-contain dark:brightness-0 dark:invert" />
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Scrapi</span>
                    </div>

                    {/* Description */}
                    <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                        Cookies enable us to store your preferences and give you a personalized website experience. We also use cookies for analytics and targeted marketing. We respect your right to privacy, so you can choose not to allow some types of cookies. Click on the category headings to learn more and change your settings.{' '}
                        <a
                            href="/cookie-policy"
                            data-testid="cookie-settings-policy-link"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium"
                        >
                            Read our cookie policy
                        </a>
                    </p>
                </div>

                {/* Cookie Categories */}
                <div className="px-3.5 sm:px-5">
                    <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white mb-2">Manage Consent Preferences</h4>

                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                        {cookieCategories.map((category, index) => (
                            <div
                                key={category.key}
                                className={`${index > 0 ? 'border-t border-gray-200 dark:border-gray-800' : ''}`}
                            >
                                {/* Category Header */}
                                <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    onClick={() => toggleCategory(category.key)}
                                    data-testid={`cookie-category-${category.key}`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <ChevronRight
                                            size={14}
                                            className={`text-gray-400 transition-transform ${expandedCategory === category.key ? 'rotate-90' : ''}`}
                                        />
                                        <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{category.title}</span>
                                    </div>

                                    {category.alwaysActive ? (
                                        <span className="text-xs font-medium text-blue-600">Always Active</span>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggle(category.key);
                                            }}
                                            data-testid={`cookie-toggle-${category.key}`}
                                            className={`relative w-9 h-5 rounded-full transition-colors ${settings[category.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[category.key] ? 'translate-x-4.5' : 'translate-x-0.5'
                                                    }`}
                                            />
                                        </button>
                                    )}
                                </div>

                                {/* Category Description */}
                                <div
                                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${expandedCategory === category.key ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                        }`}
                                >
                                    <div className="overflow-hidden">
                                        <div className="px-3 pb-3 pl-9">
                                            <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {category.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3.5 sm:p-5 flex justify-end gap-2.5">
                    <ActionButton
                        data-testid="cookie-reject-all"
                        onClick={handleRejectAll}
                        label="Reject all"
                        variant="default"
                    />
                    <ActionButton
                        data-testid="cookie-confirm-choices"
                        onClick={handleConfirm}
                        label="Confirm my Choices"
                        variant="primary"
                    />
                </div>
            </div >
        </div >
    );
};

export default CookieSettingsModal;
