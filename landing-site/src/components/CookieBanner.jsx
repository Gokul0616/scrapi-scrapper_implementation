import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';

const CookieBanner = ({ onOpenSettings, onAcceptAll }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 1000);
    }
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleAccept = () => {
    onAcceptAll();
    handleClose();
  };

  const handleSettings = () => {
    onOpenSettings();
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div 
      data-testid="cookie-banner"
      className={`fixed bottom-4 left-4 z-50 w-[340px] bg-white rounded-xl shadow-2xl border border-gray-100 transition-all duration-300 ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Close button */}
      <button
        data-testid="cookie-banner-close"
        onClick={handleClose}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close cookie banner"
      >
        <X size={18} />
      </button>

      <div className="p-5">
        {/* Cookie Icon */}
        <div className="mb-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
        </div>

        {/* Title */}
        <h3 
          data-testid="cookie-banner-title"
          className="text-base font-semibold text-gray-900 mb-2"
        >
          Scrapi uses cookies
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          We use cookies to improve your experience and analyze traffic. By using our website, you agree to let us store cookies on your device. Or adjust your preferences with the "Cookie settings" button.{' '}
          <a 
            href="/cookie-policy" 
            data-testid="cookie-policy-link"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            Read our cookie policy
          </a>
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            data-testid="cookie-settings-btn"
            onClick={handleSettings}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            Cookie settings
          </button>
          <button
            data-testid="cookie-continue-btn"
            onClick={handleAccept}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
