import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Cookie, Shield, BarChart3, Target, Settings, Search, Menu, X, Home, Book, FileText, ChevronDown, Info } from 'lucide-react';
import Footer from './Footer';

import DocsNavbar from './docs/DocsNavbar';

// Skeleton Loader Component

// Skeleton Loader Component
const PageSkeleton = () => (
  <div className="flex gap-8 animate-pulse">
    {/* Left Sidebar Skeleton */}
    <div className="hidden lg:block w-64 flex-shrink-0 space-y-8">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-8 bg-gray-100 rounded w-full"></div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Main Content Skeleton */}
    <div className="flex-1 max-w-3xl space-y-8">
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Right Sidebar Skeleton */}
    <div className="hidden lg:block w-56 flex-shrink-0 space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 bg-gray-100 rounded w-3/4"></div>
        ))}
      </div>
    </div>
  </div>
);

const CookiePolicy = ({ onOpenCookieSettings }) => {
  const [activeSection, setActiveSection] = useState('cookies');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/legal/cookie-policy');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch cookie policy:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sidebarLinks = [
    { title: 'Legal Documents', items: ['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'Acceptable Use Policy'] },
    { title: 'Compliance', items: ['GDPR', 'CCPA', 'Security', 'Subprocessors'] },
  ];

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderContent = () => {
    if (!data) return null;

    return (
      <article className="prose prose-gray max-w-none" data-testid="cookie-policy-content">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
        <p className="text-gray-500 mb-8">Last Updated: {data.last_updated}</p>

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-8 text-sm text-blue-800 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
          <div>
            This policy is part of our commitment to transparency. If you have any questions,
            please contact our Data Protection Officer at privacy@scrapi.com.
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed text-lg mb-12">
          {data.intro}
        </p>

        {data.sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-12 scroll-mt-28">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 group flex items-center gap-2">
              {section.title}
              <a href={`#${section.id}`} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity">#</a>
            </h2>

            {section.content && (
              <p className="text-gray-700 leading-relaxed mb-6">
                {section.content}
              </p>
            )}

            {section.subsections && (
              <div className="space-y-8 mt-6">
                {section.subsections.map((sub) => (
                  <div key={sub.id} id={sub.id} className="scroll-mt-28">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{sub.title}</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {sub.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {section.table && (
              <div className="mt-6 overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cookie Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiration</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {section.table.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.type.toLowerCase().includes('necessary') ? 'bg-green-100 text-green-800' :
                              row.type.toLowerCase().includes('performance') ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.expiration}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{row.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </article>
    );
  };

  // Helper function to extract all section IDs for TOC
  const getTableOfContents = () => {
    if (!data) return [];
    const toc = [];
    data.sections.forEach(section => {
      toc.push({ id: section.id, title: section.title, level: 1 });
      if (section.subsections) {
        section.subsections.forEach(sub => {
          toc.push({ id: sub.id, title: sub.title, level: 2 });
        });
      }
    });
    return toc;
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <DocsNavbar />

      <main className="pt-24 pb-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <PageSkeleton />
          ) : (
            <div className="flex gap-12">
              {/* Left Sidebar - Navigation */}
              <aside className={`hidden lg:block w-64 flex-shrink-0 transition-all duration-300`}>
                <div className="sticky top-28 space-y-8">
                  {sidebarLinks.map((group, idx) => (
                    <div key={idx}>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                        {group.title}
                      </h4>
                      <ul className="space-y-1 border-l border-gray-100 ml-1">
                        {group.items.map((item, itemIdx) => (
                          <li key={itemIdx}>
                            <a
                              href={item === 'Cookie Policy' ? '#' : '#'}
                              className={`block pl-4 py-1.5 text-sm border-l -ml-px transition-colors ${item === 'Cookie Policy'
                                  ? 'border-blue-600 text-blue-600 font-medium'
                                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                                }`}
                            >
                              {item}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div className="pt-6 border-t border-gray-100">
                    <button
                      onClick={onOpenCookieSettings}
                      className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                      data-testid="sidebar-cookie-settings"
                    >
                      <Settings className="w-4 h-4" />
                      Cookie Settings
                    </button>
                  </div>
                </div>
              </aside>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {renderContent()}
              </div>

              {/* Right Sidebar - Table of Contents */}
              <aside className="hidden lg:block w-56 flex-shrink-0">
                <div className="sticky top-28">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    On this page
                  </h4>
                  <nav>
                    <ul className="space-y-1">
                      {getTableOfContents().map((item) => (
                        <li key={item.id} className={item.level === 2 ? 'ml-4' : ''}>
                          <button
                            onClick={() => scrollToSection(item.id)}
                            className={`block w-full text-left py-1 text-sm transition-colors ${activeSection === item.id
                                ? 'text-blue-600 font-medium'
                                : 'text-gray-600 hover:text-gray-900'
                              }`}
                          >
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer onOpenCookieSettings={onOpenCookieSettings} />
    </div>
  );
};

// End of file

export default CookiePolicy;
