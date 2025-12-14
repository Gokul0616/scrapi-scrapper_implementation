import React, { useState } from 'react';
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

function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Navbar />
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
      <Footer />
    </div>
  );
}

export default App;