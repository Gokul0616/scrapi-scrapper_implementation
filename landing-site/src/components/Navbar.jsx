import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Menu, X, ArrowLeft, Layers, Zap, Database, Clock, Target, Briefcase, Building2, GraduationCap, Heart, Search, TrendingUp, BarChart3, ShoppingCart, FileText, Code, BookOpen, Rocket, Wrench, DollarSign, HelpCircle, Lightbulb, FileCheck, MessageSquare, Info, Mail, Users, Calendar, Handshake, BriefcaseBusiness } from 'lucide-react';

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
        className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium py-2"
        data-testid={`nav-${label.toLowerCase()}-button`}
      >
        {label}
        <ChevronDown 
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Mega Menu Dropdown */}
      <div
        className={`absolute top-full ${getDropdownPosition()} mt-1 transition-all duration-200 ${
          isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
        }`}
        style={{ zIndex: 9999 }}
      >
        <div className="bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden">
          {content}
        </div>
      </div>
    </div>
  );
};

// Menu Item Component with Apify sizing
const MenuItem = ({ icon: Icon, title, description, href = '#', badge = null }) => (
  <a
    href={href}
    className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors group rounded-md"
    data-testid={`menu-item-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gray-100 rounded-md group-hover:bg-orange-50 transition-colors">
      <Icon className="w-4 h-4 text-gray-600 group-hover:text-orange-500 transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-gray-900 group-hover:text-orange-500 transition-colors">
          {title}
        </h4>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-900 text-white rounded">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  </a>
);

// Section Header Component
const SectionHeader = ({ title }) => (
  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1.5">
    {title}
  </h3>
);

// Featured Card Component
const FeaturedCard = ({ title, description, cta, ctaLink = '#', image }) => (
  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-md p-3.5 border border-orange-200">
    {image && (
      <div className="mb-2.5 rounded-md overflow-hidden h-28 bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
        <Rocket className="w-10 h-10 text-white" />
      </div>
    )}
    <h4 className="text-sm font-semibold text-gray-900 mb-1">{title}</h4>
    <p className="text-xs text-gray-600 mb-2.5 leading-relaxed">{description}</p>
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
  <div className="w-[750px] p-3">
    <div className="grid grid-cols-3 gap-4">
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
  <div className="w-[650px] p-3">
    <div className="grid grid-cols-2 gap-4">
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
  <div className="w-[800px] p-3">
    <div className="grid grid-cols-12 gap-4">
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
  <div className="w-[750px] p-3">
    <div className="grid grid-cols-12 gap-4">
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
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-md p-3.5 border border-purple-200">
            <div className="mb-2.5 flex items-center justify-center">
              <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1 text-center">Join our Discord</h4>
            <p className="text-xs text-gray-600 mb-2.5 text-center leading-relaxed">Talk to scraping experts</p>
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

// Mobile Menu Item Component
const MobileMenuItem = ({ icon: Icon, title, onClick, hasSubmenu, badge }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
    data-testid={`mobile-menu-item-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-md">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
      )}
      <span className="text-base font-medium text-gray-900">{title}</span>
      {badge && (
        <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-900 text-white rounded">
          {badge}
        </span>
      )}
    </div>
    {hasSubmenu && <ChevronRight className="w-5 h-5 text-gray-400" />}
  </button>
);

// Mobile Submenu Item Component
const MobileSubmenuItem = ({ icon: Icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
    data-testid={`mobile-submenu-item-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    {Icon && (
      <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gray-100 rounded-md">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
    )}
    <div className="flex-1">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  </button>
);

// Mobile Menu Component
const MobileMenu = ({ isOpen, onClose }) => {
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setActiveSubmenu(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleBack = () => {
    setActiveSubmenu(null);
  };

  const submenuContent = {
    product: [
      { icon: Layers, title: 'Web Scrapers', description: 'Extract data from any website' },
      { icon: Zap, title: 'API Access', description: 'RESTful API for integration' },
      { icon: Database, title: 'Datasets', description: 'Store and manage data' },
      { icon: Clock, title: 'Scheduling', description: 'Automate scraping tasks' },
      { icon: Target, title: 'Lead Generation', description: 'Find potential customers' },
      { icon: TrendingUp, title: 'Market Research', description: 'Track competitors' },
      { icon: ShoppingCart, title: 'E-commerce Monitoring', description: 'Monitor prices' },
      { icon: BarChart3, title: 'SEO Analysis', description: 'Gather SEO metrics' },
    ],
    solutions: [
      { icon: Building2, title: 'Enterprise', description: 'Solutions for large organizations' },
      { icon: Rocket, title: 'Startups', description: 'Scale data collection' },
      { icon: GraduationCap, title: 'Universities', description: 'Research use cases' },
      { icon: Heart, title: 'Nonprofits', description: 'Special pricing' },
      { icon: Target, title: 'Lead Generation', description: 'Build prospect lists' },
      { icon: Search, title: 'Competitive Intelligence', description: 'Monitor competition' },
    ],
    developers: [
      { icon: FileText, title: 'Documentation', description: 'Full platform reference' },
      { icon: Code, title: 'Code Templates', description: 'Python, JS, TypeScript' },
      { icon: BookOpen, title: 'Web Scraping Academy', description: 'Courses for all levels' },
      { icon: DollarSign, title: 'Monetize Your Code', description: 'Publish and get paid' },
      { icon: Layers, title: 'SDK', description: 'Software development kits' },
      { icon: Wrench, title: 'Crawlee', description: 'Open-source library' },
    ],
    resources: [
      { icon: HelpCircle, title: 'Help and Support', description: 'Advice and answers' },
      { icon: Lightbulb, title: 'Scraper Ideas', description: 'Get inspired' },
      { icon: FileCheck, title: 'Changelog', description: "What's new" },
      { icon: MessageSquare, title: 'Customer Stories', description: 'User experiences' },
      { icon: Info, title: 'About Scrapi', description: 'Our mission' },
      { icon: Mail, title: 'Contact Us', description: 'Get in touch' },
      { icon: FileText, title: 'Blog', description: 'News and insights' },
      { icon: BriefcaseBusiness, title: 'Jobs', description: "We're hiring" },
    ],
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        data-testid="mobile-menu-backdrop"
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full bg-white z-50 transform transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        data-testid="mobile-menu-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-gray-200">
          {activeSubmenu ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
              data-testid="mobile-menu-back-button"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <ScrapiLogo />
              <span className="text-xl font-semibold text-gray-900">Scrapi</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            data-testid="mobile-menu-close-button"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          {/* Main Menu View */}
          <div
            className={`transition-transform duration-300 ease-out ${
              activeSubmenu ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            {!activeSubmenu && (
              <div>
                {/* CTA Buttons */}
                <div className="px-6 py-6 space-y-3 border-b border-gray-200">
                  <a
                    href="#"
                    className="block w-full px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors text-center"
                    data-testid="mobile-menu-get-started-button"
                  >
                    Get started
                  </a>
                  <a
                    href="#"
                    className="block w-full px-4 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors text-center"
                    data-testid="mobile-menu-login-button"
                  >
                    Log in
                  </a>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <MobileMenuItem
                    title="Product"
                    hasSubmenu
                    onClick={() => setActiveSubmenu('product')}
                  />
                  <MobileMenuItem
                    title="Solutions"
                    hasSubmenu
                    onClick={() => setActiveSubmenu('solutions')}
                  />
                  <MobileMenuItem
                    title="Developers"
                    hasSubmenu
                    onClick={() => setActiveSubmenu('developers')}
                  />
                  <MobileMenuItem
                    title="Resources"
                    hasSubmenu
                    onClick={() => setActiveSubmenu('resources')}
                  />
                  <MobileMenuItem title="Pricing" onClick={() => {}} />
                  <MobileMenuItem
                    title="Contact sales"
                    onClick={() => {}}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submenu View */}
          {activeSubmenu && (
            <div
              className={`absolute top-16 left-0 right-0 bottom-0 bg-white transition-transform duration-300 ease-out ${
                activeSubmenu ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="py-2">
                {submenuContent[activeSubmenu]?.map((item, index) => (
                  <MobileSubmenuItem
                    key={index}
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed w-full top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2" data-testid="nav-logo">
            <ScrapiLogo />
            <span className="text-xl font-semibold text-gray-900">Scrapi</span>
          </a>

          {/* Desktop Nav Links */}
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
              className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
              data-testid="nav-pricing-link"
            >
              Pricing
            </a>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <a 
              href="#" 
              className="hidden md:inline-block text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
              data-testid="nav-login-link"
            >
              Log in
            </a>
            <a
              href="#"
              className="hidden md:inline-block px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
              data-testid="nav-get-started-button"
            >
              Get started
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
              data-testid="mobile-menu-hamburger-button"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
};

export default Navbar;