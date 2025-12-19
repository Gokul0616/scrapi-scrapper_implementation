import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import CookieBanner from './components/CookieBanner';
import CookieSettingsModal from './components/CookieSettingsModal';
import CookiePolicy from './components/CookiePolicy';

// Main Landing Page Component
function LandingPage({ onOpenCookieSettings }) {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Navbar onOpenCookieSettings={onOpenCookieSettings} />
      <main>
        <HeroSection />
        <ActorCards actors={actors} />
        <TrustSection logos={companyLogos} />
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
      <Routes>
        <Route 
          path="/" 
          element={
            <LandingPage onOpenCookieSettings={handleOpenCookieSettings} />
          } 
        />
        <Route path="/cookie-policy" element={<CookiePolicy onOpenCookieSettings={handleOpenCookieSettings} />} />
      </Routes>
      
      {/* Cookie Banner - shows on all pages */}
      <CookieBanner 
        onOpenSettings={handleOpenCookieSettings}
        onAcceptAll={handleAcceptAllCookies}
      />
      
      {/* Cookie Settings Modal */}
      <CookieSettingsModal 
        isOpen={showCookieSettings}
        onClose={handleCloseCookieSettings}
        onSave={handleSaveCookieSettings}
      />
    </Router>
  );
}

export default App;
