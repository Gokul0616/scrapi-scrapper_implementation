import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ScrapiLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="6" fill="#2BC56B"/>
    <path d="M8 12C8 10.8954 8.89543 10 10 10H14C15.1046 10 16 10.8954 16 12V14C16 15.1046 15.1046 16 14 16H10C8.89543 16 8 15.1046 8 14V12Z" fill="white"/>
    <path d="M18 12C18 10.8954 18.8954 10 20 10H22C23.1046 10 24 10.8954 24 12V14C24 15.1046 23.1046 16 22 16H20C18.8954 16 18 15.1046 18 14V12Z" fill="white"/>
    <path d="M8 20C8 18.8954 8.89543 18 10 18H22C23.1046 18 24 18.8954 24 20V22C24 23.1046 23.1046 24 22 24H10C8.89543 24 8 23.1046 8 22V20Z" fill="white"/>
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
    { label: 'Scrapers', href: '#' },
    { label: 'API Access', href: '#' },
    { label: 'Scheduling', href: '#' },
    { label: 'Datasets', href: '#' },
  ];
  
  const solutionsItems = [
    { label: 'Lead Generation', href: '#' },
    { label: 'Competitive Intelligence', href: '#' },
    { label: 'E-commerce Monitoring', href: '#' },
    { label: 'SEO Analysis', href: '#' },
  ];
  
  const developersItems = [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Code Examples', href: '#' },
  ];

  return (
    <nav className="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <ScrapiLogo />
          <span className="text-xl font-semibold text-gray-900">Scrapi</span>
        </a>
        
        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          <NavDropdown label="Product" items={productItems} />
          <NavDropdown label="Solutions" items={solutionsItems} />
          <NavDropdown label="Developers" items={developersItems} />
          <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-[15px] font-medium">
            Pricing
          </a>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-4">
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