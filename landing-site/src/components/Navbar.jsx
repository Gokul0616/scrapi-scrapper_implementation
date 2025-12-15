import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Layers, Zap, Database, Clock, Target, Briefcase, Building2, GraduationCap, Heart, Search, TrendingUp, BarChart3, ShoppingCart, FileText, Code, BookOpen, Rocket, Wrench, DollarSign, HelpCircle, Lightbulb, FileCheck, MessageSquare, Info, Mail, Users, Calendar, Handshake, BriefcaseBusiness } from 'lucide-react';

const ScrapiLogo = () => (
  <img src="/logo.png" alt="Scrapi Logo" width="32" height="32" />
);

// Mega Menu Dropdown Component with Position Awareness
const MegaMenuDropdown = ({ label, content, position = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Position-aware positioning
  const getDropdownPosition = () => {
    if (position === 'right') {
      return 'right-0';
    } else if (position === 'center') {
      return 'left-1/2 -translate-x-1/2';
    }
    return 'left-0';
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors text-[15px] font-medium py-2"
        data-testid={`nav-${label.toLowerCase()}-button`}
      >
        {label}
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Mega Menu Dropdown */}
      <div
        className={`absolute top-full ${getDropdownPosition()} mt-1 transition-all duration-200 ${
          isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
        }`}
        style={{ zIndex: 9999 }}
      >
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
          {content}
        </div>
      </div>
    </div>
  );
};

// Menu Item Component
const MenuItem = ({ icon: Icon, title, description, href = '#', badge = null }) => (
  <a
    href={href}
    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group rounded-lg"
    data-testid={`menu-item-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg group-hover:bg-orange-50 transition-colors">
      <Icon className="w-5 h-5 text-gray-600 group-hover:text-orange-500 transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-orange-500 transition-colors">
          {title}
        </h4>
        {badge && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-900 text-white rounded-full">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {description}
        </p>
      )}
    </div>
  </a>
);

// Section Header Component
const SectionHeader = ({ title }) => (
  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">
    {title}
  </h3>
);

// Featured Card Component
const FeaturedCard = ({ title, description, cta, ctaLink = '#', image }) => (
  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
    {image && (
      <div className="mb-3 rounded-lg overflow-hidden h-32 bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
        <Rocket className="w-12 h-12 text-white" />
      </div>
    )}
    <h4 className="text-sm font-bold text-gray-900 mb-1">{title}</h4>
    <p className="text-xs text-gray-600 mb-3">{description}</p>
    <a
      href={ctaLink}
      className="inline-flex items-center text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
    >
      {cta}
      <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  </div>
);

// Product Dropdown Content
const ProductDropdown = () => (
  <div className="w-[750px] p-4">
    <div className="grid grid-cols-3 gap-6">
      {/* Column 1: Core Features */}
      <div>
        <SectionHeader title="Core Features" />
        <MenuItem
          icon={Layers}
          title="Web Scrapers"
          description="Extract data from any website with powerful scrapers"
        />
        <MenuItem
          icon={Zap}
          title="API Access"
          description="RESTful API for seamless integration"
        />
        <MenuItem
          icon={Database}
          title="Datasets"
          description="Store and manage your scraped data"
        />
        <MenuItem
          icon={Clock}
          title="Scheduling"
          description="Automate your scraping tasks"
        />
      </div>

      {/* Column 2: Use Cases */}
      <div>
        <SectionHeader title="Use Cases" />
        <MenuItem
          icon={Target}
          title="Lead Generation"
          description="Find and qualify potential customers"
        />
        <MenuItem
          icon={TrendingUp}
          title="Market Research"
          description="Track competitors and market trends"
        />
        <MenuItem
          icon={ShoppingCart}
          title="E-commerce Monitoring"
          description="Monitor prices and product data"
        />
        <MenuItem
          icon={BarChart3}
          title="SEO Analysis"
          description="Gather SEO metrics and insights"
        />
      </div>

      {/* Column 3: Enterprise */}
      <div>
        <SectionHeader title="For Teams" />
        <MenuItem
          icon={Building2}
          title="Enterprise"
          description="Advanced features for large teams"
          badge="Popular"
        />
        <MenuItem
          icon={Briefcase}
          title="Professional Services"
          description="Custom scraping solutions"
        />
      </div>
    </div>
  </div>
);

// Solutions Dropdown Content
const SolutionsDropdown = () => (
  <div className="w-[650px] p-4">
    <div className="grid grid-cols-2 gap-6">
      {/* Column 1: By Industry */}
      <div>
        <SectionHeader title="By Industry" />
        <MenuItem
          icon={Building2}
          title="Enterprise"
          description="Solutions for large organizations"
        />
        <MenuItem
          icon={Rocket}
          title="Startups"
          description="Scale your data collection quickly"
        />
        <MenuItem
          icon={GraduationCap}
          title="Universities"
          description="Research and academic use cases"
        />
        <MenuItem
          icon={Heart}
          title="Nonprofits"
          description="Special pricing for good causes"
        />
      </div>

      {/* Column 2: By Use Case */}
      <div>
        <SectionHeader title="By Use Case" />
        <MenuItem
          icon={Target}
          title="Lead Generation"
          description="Build targeted prospect lists"
        />
        <MenuItem
          icon={Search}
          title="Competitive Intelligence"
          description="Monitor your competition"
        />
        <MenuItem
          icon={TrendingUp}
          title="Market Research"
          description="Gather market insights"
        />
        <MenuItem
          icon={BarChart3}
          title="Data for AI"
          description="Feed your AI models with fresh data"
        />
      </div>
    </div>
  </div>
);

// Developers Dropdown Content
const DevelopersDropdown = () => (
  <div className="w-[800px] p-4">
    <div className="grid grid-cols-12 gap-6">
      {/* Column 1: Get Started - spans 4 columns */}
      <div className="col-span-4">
        <SectionHeader title="Get Started" />
        <MenuItem
          icon={FileText}
          title="Documentation"
          description="Full reference for the Scrapi platform"
        />
        <MenuItem
          icon={Code}
          title="Code Templates"
          description="Python, JavaScript, and TypeScript"
        />
        <MenuItem
          icon={BookOpen}
          title="Web Scraping Academy"
          description="Courses for beginners and experts"
        />
        <MenuItem
          icon={DollarSign}
          title="Monetize Your Code"
          description="Publish your scrapers and get paid"
        />
      </div>

      {/* Column 2: Learn - spans 4 columns */}
      <div className="col-span-4">
        <SectionHeader title="Learn" />
        <MenuItem
          icon={FileText}
          title="API Reference"
          description="Complete API documentation"
        />
        <MenuItem
          icon={Code}
          title="CLI"
          description="Command line interface"
        />
        <MenuItem
          icon={Layers}
          title="SDK"
          description="Software development kits"
        />
        <MenuItem
          icon={Wrench}
          title="Crawlee"
          description="Open-source web scraping library"
        />
      </div>

      {/* Column 3: Featured Card - spans 4 columns */}
      <div className="col-span-4">
        <div className="h-full flex flex-col">
          <div className="flex-1" />
          <FeaturedCard
            title="Build & Win Big"
            description="Publish tools on Scrapi and win exciting prizes"
            cta="Join the challenge"
            ctaLink="#"
            image={true}
          />
        </div>
      </div>
    </div>
  </div>
);

// Resources Dropdown Content
const ResourcesDropdown = () => (
  <div className="w-[750px] p-4">
    <div className="grid grid-cols-12 gap-6">
      {/* Column 1: Resources - spans 4 columns */}
      <div className="col-span-4">
        <SectionHeader title="Resources" />
        <MenuItem
          icon={HelpCircle}
          title="Help and Support"
          description="Advice and answers about Scrapi"
        />
        <MenuItem
          icon={Lightbulb}
          title="Scraper Ideas"
          description="Get inspired to build scrapers"
        />
        <MenuItem
          icon={FileCheck}
          title="Changelog"
          description="See what's new on Scrapi"
        />
        <MenuItem
          icon={MessageSquare}
          title="Customer Stories"
          description="Find out how others use Scrapi"
        />
      </div>

      {/* Column 2: Company - spans 4 columns */}
      <div className="col-span-4">
        <SectionHeader title="Company" />
        <MenuItem
          icon={Info}
          title="About Scrapi"
          description="Learn about our mission"
        />
        <MenuItem
          icon={Mail}
          title="Contact Us"
          description="Get in touch with our team"
        />
        <MenuItem
          icon={FileText}
          title="Blog"
          description="Latest news and insights"
        />
        <MenuItem
          icon={Calendar}
          title="Live Events"
          description="Webinars and workshops"
        />
        <MenuItem
          icon={Handshake}
          title="Partners"
          description="Become a Scrapi partner"
        />
        <MenuItem
          icon={BriefcaseBusiness}
          title="Jobs"
          description="We're hiring"
          badge="New"
        />
      </div>

      {/* Column 3: Featured Card - spans 4 columns */}
      <div className="col-span-4">
        <div className="h-full flex flex-col">
          <div className="flex-1" />
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="mb-3 flex items-center justify-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <h4 className="text-sm font-bold text-gray-900 mb-1 text-center">Join our Discord</h4>
            <p className="text-xs text-gray-600 mb-3 text-center">Talk to scraping experts</p>
            <a
              href="#"
              className="w-full inline-flex items-center justify-center text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
            >
              Join community
              <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Navbar = () => {
  return (
    <nav className="fixed w-full top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2" data-testid="nav-logo">
          <ScrapiLogo />
          <span className="text-xl font-semibold text-gray-900">Scrapi</span>
        </a>

        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          <MegaMenuDropdown 
            label="Product" 
            content={<ProductDropdown />}
            position="left"
          />
          <MegaMenuDropdown 
            label="Solutions" 
            content={<SolutionsDropdown />}
            position="left"
          />
          <MegaMenuDropdown 
            label="Developers" 
            content={<DevelopersDropdown />}
            position="center"
          />
          <MegaMenuDropdown 
            label="Resources" 
            content={<ResourcesDropdown />}
            position="right"
          />
          <a 
            href="#" 
            className="text-gray-700 hover:text-gray-900 transition-colors text-[15px] font-medium"
            data-testid="nav-pricing-link"
          >
            Pricing
          </a>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <a 
            href="#" 
            className="hidden md:inline-block text-gray-700 hover:text-gray-900 transition-colors text-[15px] font-medium"
            data-testid="nav-login-link"
          >
            Log in
          </a>
          <a
            href="#"
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            data-testid="nav-get-started-button"
          >
            Get started
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;