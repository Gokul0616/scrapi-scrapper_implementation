import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const placeholderTexts = [
  'Scrape Google Maps data',
  'Extract Amazon products',
  'Get SEO metadata',
  'Monitor competitor prices',
  'Generate business leads',
  'Collect market insights',
];

const HeroSection = () => {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const text = placeholderTexts[currentPlaceholder];
    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < text.length) {
          setDisplayText(text.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentPlaceholder((prev) => (prev + 1) % placeholderTexts.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentPlaceholder]);

  return (
    <section className="pt-32 pb-16 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full"
          >
            <span className="px-2 py-0.5 bg-[#2BC56B] text-white text-xs font-semibold rounded">New</span>
            <span className="text-sm text-gray-700">Powerful web scraping made simple</span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-center text-[50px] md:text-[56px] font-semibold leading-[1.1] tracking-[-0.02em] text-gray-900 mb-6">
          Extract web data with precision
        </h1>

        {/* Subtitle */}
        <p className="text-center text-sm md:text-lg text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          Scrapi provides powerful web scraping tools for businesses, developers, and researchers.
          Extract data from Google Maps, Amazon, and any website with our ready-to-use scrapers.
        </p>

        {/* Search Box */}
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder={displayText || 'Ex: '}
              className="w-full md:flex-1 px-5 py-4 text-base text-gray-900 placeholder-gray-400 outline-none bg-white border-2 border-gray-200 rounded-lg focus:border-gray-400 transition-colors shadow-sm"
              data-testid="hero-search-input"
            />
            <button
              className="w-full md:w-auto px-6 py-4 bg-[#1B1D1F] text-white text-base font-medium hover:bg-gray-800 transition-colors rounded-lg shadow-sm"
              data-testid="hero-try-now-button"
            >
              Try it now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;