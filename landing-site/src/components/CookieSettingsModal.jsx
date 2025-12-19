import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';

const CookieSettingsModal = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState({
    strictlyNecessary: true,
    targeting: true,
    performance: true,
  });
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('cookieSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [isOpen]);

  const handleToggle = (key) => {
    if (key === 'strictlyNecessary') return; // Cannot disable necessary cookies
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleRejectAll = () => {
    const newSettings = {
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

  const saveAndClose = (settingsToSave) => {
    localStorage.setItem('cookieSettings', JSON.stringify(settingsToSave));
    localStorage.setItem('cookieConsent', 'true');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    onSave(settingsToSave);
    onClose();
  };

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  if (!isOpen) return null;

  const cookieCategories = [
    {
      key: 'strictlyNecessary',
      title: 'Strictly Necessary Cookies',
      alwaysActive: true,
      description: 'These cookies are necessary for the website to function and cannot be switched off. They are usually set in response to actions made by you such as setting your privacy preferences, logging in or filling in forms.',
    },
    {
      key: 'targeting',
      title: 'Targeting Cookies',
      alwaysActive: false,
      description: 'These cookies may be set through our site by our advertising partners. They may be used to build a profile of your interests and show you relevant adverts on other sites. They work by uniquely identifying your browser and device.',
    },
    {
      key: 'performance',
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
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Close button */}
        <button
          data-testid="cookie-settings-close"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close cookie settings"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-4 sm:p-6 pb-0">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-5">
            <img src="/logo.png" alt="Scrapi" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-900">Scrapi</span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Cookies enable us to store your preferences and give you a personalized website experience. We also use cookies for analytics and targeted marketing. We respect your right to privacy, so you can choose not to allow some types of cookies. Click on the category headings to learn more and change your settings.{' '}
            <a
              href="/cookie-policy"
              data-testid="cookie-settings-policy-link"
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              Read our cookie policy
            </a>
          </p>
        </div>

        {/* Cookie Categories */}
        <div className="px-4 sm:px-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Manage Consent Preferences</h4>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {cookieCategories.map((category, index) => (
              <div
                key={category.key}
                className={`${index > 0 ? 'border-t border-gray-200' : ''}`}
              >
                {/* Category Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(category.key)}
                  data-testid={`cookie-category-${category.key}`}
                >
                  <div className="flex items-center gap-3">
                    <ChevronRight
                      size={16}
                      className={`text-gray-400 transition-transform ${expandedCategory === category.key ? 'rotate-90' : ''}`}
                    />
                    <span className="text-sm font-medium text-gray-800">{category.title}</span>
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
                      className={`relative w-11 h-6 rounded-full transition-colors ${settings[category.key] ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[category.key] ? 'translate-x-6' : 'translate-x-1'
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
                    <div className="px-4 pb-4 pl-11">
                      <p className="text-sm text-gray-600 leading-relaxed">
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
        <div className="p-4 sm:p-6 flex justify-end gap-3">
          <button
            data-testid="cookie-reject-all"
            onClick={handleRejectAll}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            Reject all
          </button>
          <button
            data-testid="cookie-confirm-choices"
            onClick={handleConfirm}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
          >
            Confirm my Choices
          </button>
        </div>

        {/* Powered by */}
        <div className="px-4 sm:px-6 pb-4 text-center">
          <span className="text-xs text-gray-400">Powered by Scrapi</span>
        </div>
      </div >
    </div >
  );
};

export default CookieSettingsModal;
