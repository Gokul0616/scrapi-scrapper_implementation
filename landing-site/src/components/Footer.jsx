import React from 'react';
import { Twitter, Linkedin, Github, Youtube } from 'lucide-react';

const ScrapiLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="6" fill="#2BC56B"/>
    <path d="M8 12C8 10.8954 8.89543 10 10 10H14C15.1046 10 16 10.8954 16 12V14C16 15.1046 15.1046 16 14 16H10C8.89543 16 8 15.1046 8 14V12Z" fill="white"/>
    <path d="M18 12C18 10.8954 18.8954 10 20 10H22C23.1046 10 24 10.8954 24 12V14C24 15.1046 23.1046 16 22 16H20C18.8954 16 18 15.1046 18 14V12Z" fill="white"/>
    <path d="M8 20C8 18.8954 8.89543 18 10 18H22C23.1046 18 24 18.8954 24 20V22C24 23.1046 23.1046 24 22 24H10C8.89543 24 8 23.1046 8 22V20Z" fill="white"/>
  </svg>
);

const Footer = () => {
  const footerLinks = {
    product: {
      title: 'Product',
      links: [
        { label: 'Scrapers', href: '#' },
        { label: 'API Access', href: '#' },
        { label: 'Scheduling', href: '#' },
        { label: 'Datasets', href: '#' },
        { label: 'Integrations', href: '#' },
      ],
    },
    solutions: {
      title: 'Solutions',
      links: [
        { label: 'Lead Generation', href: '#' },
        { label: 'Competitive Intelligence', href: '#' },
        { label: 'E-commerce Monitoring', href: '#' },
        { label: 'SEO Analysis', href: '#' },
        { label: 'Market Research', href: '#' },
      ],
    },
    developers: {
      title: 'Developers',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'Code Examples', href: '#' },
        { label: 'GitHub', href: '#' },
      ],
    },
    company: {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Contact', href: '#' },
        { label: 'Blog', href: '#' },
      ],
    },
    legal: {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Service', href: '#' },
        { label: 'Cookie Settings', href: '#' },
      ],
    },
  };

  return (
    <footer className="bg-[#1B1D1F] text-gray-400 py-16 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {Object.values(footerLinks).map((section, idx) => (
            <div key={idx}>
              <h4 className="text-white font-semibold mb-4 text-sm">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <a 
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <ScrapiLogo />
              <span className="text-white font-semibold">Scrapi</span>
            </div>
            
            {/* Copyright */}
            <p className="text-sm text-gray-500">
              © 2025 Scrapi. All rights reserved.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;