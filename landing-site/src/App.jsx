import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChevronDown, Star, Users, ArrowRight, ExternalLink, Play } from 'lucide-react';
import { actors, companyLogos, integrations, testimonials, codeTemplates } from './data/mockData';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ActorCards from './components/ActorCards';
import TrustSection from './components/TrustSection';
import FeaturesSection from './components/FeaturesSection';
import IntegrationsSection from './components/IntegrationsSection';
import OpenSourceSection from './components/OpenSourceSection';
import LearnCodeConnect from './components/LearnCodeConnect';
import GetPaidSection from './components/GetPaidSection';
import EnterpriseSection from './components/EnterpriseSection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import ConsentPopup from './components/ConsentPopup';
import CookieSettingsModal from './components/CookieSettingsModal';
import LegalDocument from './components/LegalDocument';
import DocsLandingPage from './components/docs/DocsLandingPage';
import NotFound from './components/NotFound';

// Main Landing Page Component
function LandingPage({ onOpenCookieSettings }) {
  const [featuredActors, setFeaturedActors] = useState(actors); // Initialize with mock data

  useEffect(() => {
    const fetchActors = async () => {
      try {
        const response = await fetch('/api/store/featured?limit=6');
        if (response.ok) {
          const data = await response.json();
          // Map API data to component format
          const mappedActors = data.map(actor => ({
            id: actor.id,
            name: actor.name,
            slug: actor.id.replace('actor_', 'store/'), // simple slug generation
            description: actor.description,
            icon: actor.icon || 'https://cdn.apify.com/actors/default-icon.png', // fallback
            author: actor.author_name || 'Anonymous',
            authorAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.author_name || 'A')}&background=random`,
            users: new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(actor.runs_count || 0),
            rating: actor.rating || 5.0,
          }));
          setFeaturedActors(mappedActors);
        }
      } catch (error) {
        console.error('Failed to fetch actors:', error);
      }
    };

    fetchActors();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <Navbar onOpenCookieSettings={onOpenCookieSettings} />
      <main>
        <HeroSection />
        <ActorCards actors={featuredActors} />
        {/* <TrustSection logos={companyLogos} /> */}
        <FeaturesSection />
        <IntegrationsSection integrations={integrations} />
        <OpenSourceSection templates={codeTemplates} />
        <LearnCodeConnect />
        <GetPaidSection />
        <EnterpriseSection testimonials={testimonials} />
        <CTASection />
      </main>
      <Footer onOpenCookieSettings={onOpenCookieSettings} />
    </div>
  );
}

function App() {
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [cookieSettings, setCookieSettings] = useState(null);

  // Load cookie settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('cookieSettings');
    if (savedSettings) {
      setCookieSettings(JSON.parse(savedSettings));
    }
  }, []);

  // System Theme Listener matching user device
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 'l' key listener for theme toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, or contentEditable element
      const tagName = e.target.tagName.toUpperCase();
      const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || e.target.isContentEditable;

      if (isInput) return;

      if (e.key.toLowerCase() === 'l') {
        document.documentElement.classList.toggle('dark');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenCookieSettings = () => {
    setShowCookieSettings(true);
  };

  const handleCloseCookieSettings = () => {
    setShowCookieSettings(false);
  };

  const handleAcceptAllCookies = () => {
    const allAccepted = {
      strictlyNecessary: true,
      targeting: true,
      performance: true,
    };
    localStorage.setItem('cookieSettings', JSON.stringify(allAccepted));
    localStorage.setItem('cookieConsent', 'true');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setCookieSettings(allAccepted);
  };

  const handleSaveCookieSettings = (settings) => {
    setCookieSettings(settings);
  };

  return (
    <Router>
      <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage onOpenCookieSettings={handleOpenCookieSettings} />
            }
          />
          {/* Redirect old path to new structure */}
          <Route path="/cookie-policy" element={<Navigate to="/legal/cookie-policy" replace />} />
          {/* Docs Landing Page */}
          <Route path="/docs" element={<DocsLandingPage />} />
          {/* Dynamic Legal Routes */}
          <Route path="/legal/:docId" element={<LegalDocument onOpenCookieSettings={handleOpenCookieSettings} />} />
          {/* 404 Not Found - Catch all routes */}
          <Route path="*" element={<NotFound onOpenCookieSettings={handleOpenCookieSettings} />} />
        </Routes>

        {/* Cookie Banner - shows on all pages */}
        <ConsentPopup
          onOpenSettings={handleOpenCookieSettings}
          onAcceptAll={handleAcceptAllCookies}
        />

        {/* Cookie Settings Modal */}
        <CookieSettingsModal
          isOpen={showCookieSettings}
          onClose={handleCloseCookieSettings}
          onSave={handleSaveCookieSettings}
        />
      </div>
    </Router>
  );
}

export default App;
