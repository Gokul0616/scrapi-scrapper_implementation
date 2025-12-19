import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Cookie, Shield, BarChart3, Target, Settings } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const CookiePolicy = () => {
  const [activeSection, setActiveSection] = useState('introduction');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sections = [
    { id: 'introduction', title: 'Introduction', icon: Cookie },
    { id: 'what-are-cookies', title: 'What are Cookies?', icon: Cookie },
    { id: 'how-we-use', title: 'How We Use Cookies', icon: Settings },
    { id: 'types', title: 'Types of Cookies', icon: Shield },
    { id: 'necessary', title: 'Strictly Necessary', icon: Shield },
    { id: 'performance', title: 'Performance Cookies', icon: BarChart3 },
    { id: 'targeting', title: 'Targeting Cookies', icon: Target },
    { id: 'managing', title: 'Managing Cookies', icon: Settings },
    { id: 'updates', title: 'Updates to Policy', icon: ExternalLink },
    { id: 'contact', title: 'Contact Us', icon: ExternalLink },
  ];

  const sidebarLinks = [
    { title: 'Terms and Conditions', items: ['General Terms', 'Store Publishing Terms', 'Data Processing Addendum', 'Affiliate Program Terms', 'Event Terms', 'Challenge Terms'] },
    { title: 'Scrapi Policies', items: ['Acceptable Use Policy', 'Community Code of Conduct', 'Privacy Policy', 'Cookie Policy'] },
  ];

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Navbar />
      
      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex gap-8">
            {/* Left Sidebar */}
            <aside className={`hidden lg:block transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-64'} flex-shrink-0`}>
              <div className="sticky top-24">
                {!isSidebarCollapsed && (
                  <div className="space-y-6">
                    {sidebarLinks.map((section, idx) => (
                      <div key={idx}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          {section.title}
                        </h4>
                        <ul className="space-y-1">
                          {section.items.map((item, itemIdx) => (
                            <li key={itemIdx}>
                              <a
                                href={item === 'Cookie Policy' ? '#' : '#'}
                                className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                                  item === 'Cookie Policy'
                                    ? 'bg-gray-100 text-gray-900 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                {item}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="mt-6 w-full flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 max-w-3xl">
              <article className="prose prose-gray max-w-none" data-testid="cookie-policy-content">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Scrapi Cookie Policy</h1>
                <p className="text-gray-500 mb-8">Last Updated: August 15, 2025</p>

                <section id="introduction" className="mb-12">
                  <p className="text-gray-700 leading-relaxed">
                    Welcome to the Scrapi Cookie Policy! This policy explains how Scrapi ("we", "our", or "us") 
                    uses cookies and similar technologies on our website scrapi.com ("Website") and our platform 
                    services ("Services"). By using our Website, you consent to the use of cookies in accordance 
                    with this policy.
                  </p>
                </section>

                <section id="what-are-cookies" className="mb-12">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">What are Cookies?</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Cookies are small text files that are placed on your device (computer, tablet, or mobile) 
                    when you visit a website. They are widely used to make websites work more efficiently, 
                    provide information to the site owners, and improve the user experience.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Cookies can be "session cookies" (temporary cookies that are deleted when you close your browser) 
                    or "persistent cookies" (cookies that remain on your device for a set period or until you delete them).
                  </p>
                </section>

                <section id="how-we-use" className="mb-12">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Cookies</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">We use cookies for several purposes:</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-2">
                    <li><strong>Essential Operations:</strong> To enable basic website functionality and security features</li>
                    <li><strong>Performance Analysis:</strong> To understand how visitors interact with our website and identify areas for improvement</li>
                    <li><strong>User Preferences:</strong> To remember your settings and preferences for a better experience</li>
                    <li><strong>Marketing:</strong> To deliver relevant advertisements and measure their effectiveness</li>
                  </ul>
                </section>

                <section id="types" className="mb-12">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Types of Cookies We Use</h2>
                  <p className="text-gray-700 leading-relaxed">
                    We categorize the cookies we use into three main types. Below is a detailed description of each category.
                  </p>
                </section>

                <section id="necessary" className="mb-12">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    Strictly Necessary Cookies
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    These cookies are essential for the website to function properly. They enable core functionality 
                    such as security, network management, and accessibility. You cannot opt out of these cookies 
                    as the website cannot function without them.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-semibold text-gray-700">Cookie Name</th>
                          <th className="text-left py-2 font-semibold text-gray-700">Purpose</th>
                          <th className="text-left py-2 font-semibold text-gray-700">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-600">cookieConsent</td>
                          <td className="py-2 text-gray-600">Stores user's cookie consent preferences</td>
                          <td className="py-2 text-gray-600">1 year</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-600">session_id</td>
                          <td className="py-2 text-gray-600">Maintains user session</td>
                          <td className="py-2 text-gray-600">Session</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">csrf_token</td>
                          <td className="py-2 text-gray-600">Security protection against CSRF attacks</td>
                          <td className="py-2 text-gray-600">Session</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="performance" className="mb-12">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Performance Cookies
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    These cookies allow us to count visits and traffic sources so we can measure and improve the 
                    performance of our site. They help us know which pages are most and least popular and see how 
                    visitors navigate around the site. All information these cookies collect is aggregated and anonymous.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-semibold text-gray-700">Cookie Name</th>
                          <th className="text-left py-2 font-semibold text-gray-700">Purpose</th>
                          <th className="text-left py-2 font-semibold text-gray-700">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-600">_ga</td>
                          <td className="py-2 text-gray-600">Google Analytics - distinguishes users</td>
                          <td className="py-2 text-gray-600">2 years</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-600">_gid</td>
                          <td className="py-2 text-gray-600">Google Analytics - distinguishes users</td>
                          <td className="py-2 text-gray-600">24 hours</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">_gat</td>
                          <td className="py-2 text-gray-600">Google Analytics - throttles request rate</td>
                          <td className="py-2 text-gray-600">1 minute</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="targeting" className="mb-12">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Targeting Cookies
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    These cookies may be set through our site by our advertising partners. They may be used to build 
                    a profile of your interests and show you relevant advertisements on other sites. They work by 
                    uniquely identifying your browser and device.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-semibold text-gray-700">Cookie Name</th>
                          <th className="text-left py-2 font-semibold text-gray-700">Purpose</th>
                          <th className="text-left py-2 font-semibold text-gray-700">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-600">_fbp</td>
                          <td className="py-2 text-gray-600">Facebook - tracks visits across websites</td>
                          <td className="py-2 text-gray-600">3 months</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-600">_gcl_au</td>
                          <td className="py-2 text-gray-600">Google Ads - conversion tracking</td>
                          <td className="py-2 text-gray-600">3 months</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">li_sugr</td>
                          <td className="py-2 text-gray-600">LinkedIn - advertising measurement</td>
                          <td className="py-2 text-gray-600">3 months</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="managing" className="mb-12">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Managing Your Cookie Preferences</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    You can manage your cookie preferences at any time by clicking the "Cookie Settings" button 
                    in the footer of our website. You can also control cookies through your browser settings:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                    <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                    <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
                    <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
                    <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
                  </ul>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Blocking certain cookies may impact your experience on our website 
                      and limit the services we can offer you.
                    </p>
                  </div>
                </section>

                <section id="updates" className="mb-12">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Updates to This Policy</h2>
                  <p className="text-gray-700 leading-relaxed">
                    We may update this Cookie Policy from time to time to reflect changes in our practices or for 
                    other operational, legal, or regulatory reasons. We will notify you of any material changes 
                    by posting the new policy on this page with an updated "Last Updated" date.
                  </p>
                </section>

                <section id="contact" className="mb-12">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    If you have any questions about our use of cookies or this Cookie Policy, please contact us:
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700"><strong>Email:</strong> privacy@scrapi.com</p>
                    <p className="text-gray-700"><strong>Address:</strong> 123 Tech Street, San Francisco, CA 94105</p>
                  </div>
                </section>
              </article>
            </div>

            {/* Right Sidebar - Table of Contents */}
            <aside className="hidden xl:block w-56 flex-shrink-0">
              <div className="sticky top-24">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">On this page</h4>
                <nav>
                  <ul className="space-y-1">
                    {sections.map((section) => (
                      <li key={section.id}>
                        <button
                          onClick={() => scrollToSection(section.id)}
                          className={`block w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
                            activeSection === section.id
                              ? 'text-blue-600 bg-blue-50 font-medium'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
