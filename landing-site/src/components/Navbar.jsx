import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ApifyLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0L25.2583 7V21L14 28L2.74167 21V7L14 0Z" fill="#FF9012"/>
    <path d="M14 0L25.2583 7V21L14 28V0Z" fill="#FF6E00"/>
    <path d="M14 7L19.1292 10V17L14 21L8.87083 17V10L14 7Z" fill="white"/>
  </svg>
);

const NavDropdown = ({ label, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors text-[15px] font-medium">
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
          {items.map((item, idx) => (
            <a 
              key={idx} 
              href={item.href || '#'} 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const productItems = [
    { label: 'Actors', href: '#' },
    { label: 'Apify Store', href: '#' },
    { label: 'Proxy', href: '#' },
    { label: 'Storage', href: '#' },
    { label: 'Integrations', href: '#' },
  ];
  
  const solutionsItems = [
    { label: 'Data for AI', href: '#' },
    { label: 'Lead generation', href: '#' },
    { label: 'Competitive intelligence', href: '#' },
    { label: 'E-commerce', href: '#' },
    { label: 'Social media monitoring', href: '#' },
  ];
  
  const developersItems = [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Code templates', href: '#' },
    { label: 'Web Scraping Academy', href: '#' },
    { label: 'Discord community', href: '#' },
  ];
  
  const resourcesItems = [
    { label: 'Blog', href: '#' },
    { label: 'Success stories', href: '#' },
    { label: 'Knowledge base', href: '#' },
    { label: 'Changelog', href: '#' },
    { label: 'Status', href: '#' },
  ];

  return (
    <nav className="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <ApifyLogo />
          <span className="text-xl font-semibold text-gray-900">apify</span>
        </a>
        
        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          <NavDropdown label="Product" items={productItems} />
          <NavDropdown label="Solutions" items={solutionsItems} />
          <NavDropdown label="Developers" items={developersItems} />
          <NavDropdown label="Resources" items={resourcesItems} />
          <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-[15px] font-medium">
            Pricing
          </a>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <a href="#" className="hidden md:inline-block text-gray-700 hover:text-gray-900 transition-colors text-[15px] font-medium">
            Contact sales
          </a>
          <a href="#" className="hidden md:inline-block text-gray-700 hover:text-gray-900 transition-colors text-[15px] font-medium">
            Log in
          </a>
          <a 
            href="#" 
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            Get started
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;