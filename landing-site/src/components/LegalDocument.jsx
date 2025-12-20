import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Settings, Search, Info } from 'lucide-react';
import Footer from './Footer';

// Docs Navbar Component
const DocsNavbar = () => {
  return (
    <nav className="fixed w-full top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Scrapi" className="w-8 h-8" />
            <span className="text-xl font-semibold text-gray-900">Scrapi</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Docs</span>
          </a>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-gray-900 transition-colors">Platform</a>
            <a href="#" className="hover:text-gray-900 transition-colors">API</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Python SDK</a>
            <a href="#" className="hover:text-gray-900 transition-colors">JavaScript SDK</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Academy</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md w-64 text-sm text-gray-500 cursor-text hover:border-gray-300 transition-colors">
            <Search className="w-4 h-4" />
            <span>Search docs...</span>
            <span className="ml-auto text-xs text-gray-400 border border-gray-300 rounded px-1.5">Ctrl K</span>
          </div>
          
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-gray-900">Log in</a>
          <a href="#" className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors">
            Sign up
          </a>
        </div>
      </div>
    </nav>
  );
};

// Content Skeleton Loader (Only for main content)
const ContentSkeleton = () => (
  <div className="flex-1 max-w-3xl space-y-8 pt-24 animate-pulse">
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
);

// Left Sidebar Skeleton
const LeftSidebarSkeleton = () => (
  <aside className="hidden lg:block w-64 flex-shrink-0">
    <div className="sticky top-28 space-y-8 animate-pulse">
      {[1, 2].map((groupIdx) => (
        <div key={groupIdx}>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="space-y-1 border-l border-gray-100 ml-1">
            {[1, 2, 3, 4].map((itemIdx) => (
              <div key={itemIdx} className="pl-4 py-1.5">
                <div className="h-3 bg-gray-100 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="pt-6 border-t border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  </aside>
);

// Right Sidebar Skeleton
const RightSidebarSkeleton = () => (
  <div className="hidden lg:block w-56 flex-shrink-0 space-y-4 mt-28 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-4 bg-gray-100 rounded w-3/4"></div>
      ))}
    </div>
  </div>
);

const LegalDocument = ({ onOpenCookieSettings }) => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarLinks, setSidebarLinks] = useState([]);

  // Default to terms if no docId provided
  const currentDoc = docId || 'terms-of-service';

  // Fetch categories and sidebar links on mount
  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        // Fetch categories first
        const categoriesResponse = await fetch('/api/categories/public');
        const policiesResponse = await fetch('/api/legal');
        
        if (categoriesResponse.ok && policiesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          const policiesData = await policiesResponse.json();
          
          // Group documents by category dynamically
          const categoryMap = new Map();
          
          // Initialize all categories with empty items
          categoriesData.categories.forEach(cat => {
            categoryMap.set(cat.name, { title: cat.name, items: [] });
          });
          
          // Add documents to their respective categories
          policiesData.documents.forEach(doc => {
            const categoryName = doc.category || 'Legal Documents';
            if (categoryMap.has(categoryName)) {
              categoryMap.get(categoryName).items.push({ label: doc.label, id: doc.id });
            } else {
              // If category not found, add to first category or create new one
              if (categoryMap.size > 0) {
                const firstCategory = Array.from(categoryMap.values())[0];
                firstCategory.items.push({ label: doc.label, id: doc.id });
              } else {
                categoryMap.set(categoryName, { title: categoryName, items: [{ label: doc.label, id: doc.id }] });
              }
            }
          });
          
          setSidebarLinks(Array.from(categoryMap.values()));
        }
      } catch (error) {
        console.error('Failed to fetch sidebar data:', error);
        // Keep empty structure if fetch fails
        setSidebarLinks([]);
      }
    };
    
    fetchSidebarData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Artificial delay of 2 seconds as requested
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await fetch(`/api/legal/${currentDoc}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
          // Set first section as active by default
          if (result.sections && result.sections.length > 0) {
            setActiveSection(result.sections[0].id);
          }
        } else {
            // Handle error or redirect
            console.error("Failed to fetch document");
        }
      } catch (error) {
        console.error('Failed to fetch legal document:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentDoc]);

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
      <article className="prose prose-gray max-w-none pt-24 pb-24" data-testid="legal-content">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{data.title}</h1>
        <p className="text-gray-500 mb-8">Last Updated: {data.last_updated}</p>

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-8 text-sm text-blue-800 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
          <div>
            This document is part of our commitment to transparency. If you have any questions, 
            please contact our Legal Team at legal@scrapi.com.
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

            {section.table && section.table.length > 0 && (
              <div className="mt-6 overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(section.table[0]).map((key) => (
                         <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                           {key.charAt(0).toUpperCase() + key.slice(1)}
                         </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {section.table.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        {Object.values(row).map((val, vIdx) => (
                          <td key={vIdx} className="px-6 py-4 text-sm text-gray-600">
                            {val}
                          </td>
                        ))}
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
      
      <main className="min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-12">
              {/* Left Sidebar - Navigation (Always Visible) */}
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
                            <Link
                              to={`/legal/${item.id}`}
                              className={`block pl-4 py-1.5 text-sm border-l -ml-px transition-colors ${
                                currentDoc === item.id
                                  ? 'border-blue-600 text-blue-600 font-medium'
                                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                              }`}
                            >
                              {item.label}
                            </Link>
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

              {/* Main Content Area */}
              {loading ? (
                 <>
                   <ContentSkeleton />
                   <RightSidebarSkeleton />
                 </>
              ) : (
                <>
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
                                className={`block w-full text-left py-1 text-sm transition-colors ${
                                  activeSection === item.id
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
                </>
              )}
            </div>
        </div>
      </main>

      <Footer onOpenCookieSettings={onOpenCookieSettings} />
    </div>
  );
};

export default LegalDocument;
