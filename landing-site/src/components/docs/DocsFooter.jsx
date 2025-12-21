import React from 'react';
import { Twitter, Linkedin, Github, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

const ScrapiLogo = () => (
  <img 
    src="/logo.png" 
    alt="Scrapi Logo" 
    width="28" 
    height="28" 
    className="brightness-0 invert"
  />
);

const DocsFooter = ({ onOpenCookieSettings }) => {
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
        { label: 'Cookie Policy', href: '/cookie-policy', isLink: true },
        { label: 'Cookie Settings', href: '#', isButton: true },
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
                    {link.isButton ? (
                      <button
                        onClick={onOpenCookieSettings}
                        data-testid="footer-cookie-settings-btn"
                        className="text-sm hover:text-white transition-colors cursor-pointer"
                      >
                        {link.label}
                      </button>
                    ) : link.isLink ? (
                      <Link
                        to={link.href}
                        className="text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
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

export default DocsFooter;