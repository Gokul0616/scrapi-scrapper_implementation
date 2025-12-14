import React from 'react';
import { Twitter, Linkedin, Github, Youtube } from 'lucide-react';

const ApifyLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0L25.2583 7V21L14 28L2.74167 21V7L14 0Z" fill="#FF9012"/>
    <path d="M14 0L25.2583 7V21L14 28V0Z" fill="#FF6E00"/>
    <path d="M14 7L19.1292 10V17L14 21L8.87083 17V10L14 7Z" fill="white"/>
  </svg>
);

const Footer = () => {
  const footerLinks = {
    product: {
      title: 'Product',
      links: [
        { label: 'Actors', href: '#' },
        { label: 'Apify Store', href: '#' },
        { label: 'Proxy', href: '#' },
        { label: 'Storage', href: '#' },
        { label: 'Integrations', href: '#' },
        { label: 'Open source', href: '#' },
      ],
    },
    solutions: {
      title: 'Solutions',
      links: [
        { label: 'Data for AI', href: '#' },
        { label: 'Lead generation', href: '#' },
        { label: 'Competitive intelligence', href: '#' },
        { label: 'E-commerce', href: '#' },
        { label: 'Enterprise', href: '#' },
        { label: 'Professional services', href: '#' },
      ],
    },
    developers: {
      title: 'Developers',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'API reference', href: '#' },
        { label: 'Code templates', href: '#' },
        { label: 'Web Scraping Academy', href: '#' },
        { label: 'Discord community', href: '#' },
        { label: 'GitHub', href: '#' },
      ],
    },
    resources: {
      title: 'Resources',
      links: [
        { label: 'Blog', href: '#' },
        { label: 'Success stories', href: '#' },
        { label: 'Knowledge base', href: '#' },
        { label: 'Changelog', href: '#' },
        { label: 'Status', href: '#' },
        { label: 'Partners', href: '#' },
      ],
    },
    company: {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Contact sales', href: '#' },
        { label: 'Trust center', href: '#' },
        { label: 'Media kit', href: '#' },
      ],
    },
    legal: {
      title: 'Legal',
      links: [
        { label: 'Privacy policy', href: '#' },
        { label: 'Terms of service', href: '#' },
        { label: 'Cookie settings', href: '#' },
        { label: 'Security', href: '#' },
      ],
    },
  };

  return (
    <footer className="bg-[#1B1D1F] text-gray-400 py-16 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
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
              <ApifyLogo />
              <span className="text-white font-semibold">apify</span>
            </div>
            
            {/* Copyright */}
            <p className="text-sm text-gray-500">
              © 2024 Apify Technologies s.r.o. All rights reserved.
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
              <a href="#" className="hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;