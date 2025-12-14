import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const pythonCode = `from crawlee.playwright_crawler import PlaywrightCrawler

crawler = PlaywrightCrawler()

@crawler.router.default_handler
async def request_handler(context):
    await context.push_data({
        'url': context.request.url,
        'title': await context.page.title()
    })
    await context.enqueue_links()

await crawler.run(['https://scrapi.dev'])`;

const jsCode = `import { PuppeteerCrawler, Dataset } from "crawlee";

const crawler = new PuppeteerCrawler({
  async requestHandler({ request, page, enqueueLinks }) {
    await Dataset.pushData({
      url: request.url,
      title: await page.title(),
    });
    await enqueueLinks();
  },
});

await crawler.run(["https://scrapi.dev"]);`;

const OpenSourceSection = ({ templates }) => {
  const [activeTab, setActiveTab] = useState('open-source');
  const [activeCodeTab, setActiveCodeTab] = useState('javascript');
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'open-source', label: 'Open-source tools' },
    { id: 'proxies', label: 'Proxies' },
    { id: 'unblocking', label: 'Unblocking' },
    { id: 'cloud', label: 'Cloud deployment' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'data', label: 'Data processing' },
  ];

  const handleCopy = () => {
    const code = activeCodeTab === 'javascript' ? jsCode : pythonCode;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getContent = () => {
    switch(activeTab) {
      case 'open-source':
        return {
          title: 'We love open source',
          description: 'Scrapi works great with both Python and JavaScript, as well as Playwright, Puppeteer, Selenium, Scrapy, and BeautifulSoup - popular web scraping and browser automation libraries.',
          showCode: true
        };
      case 'proxies':
        return {
          title: 'Proxies are baked in',
          description: 'Smartly rotating datacenter and residential proxies are an integral part of the Scrapi platform. You can add them to your scrapers with simple configuration.',
          showCode: false
        };
      case 'unblocking':
        return {
          title: 'Advanced unblocking',
          description: 'Bypass anti-scraping measures with our advanced unblocking features including CAPTCHA solving, browser fingerprinting, and intelligent request patterns.',
          showCode: false
        };
      case 'cloud':
        return {
          title: 'Deploy to the cloud',
          description: 'Run your scrapers on our cloud infrastructure with automatic scaling, monitoring, and maintenance. No server management required.',
          showCode: false
        };
      case 'monitoring':
        return {
          title: 'Monitor everything',
          description: 'Track your scraping jobs in real-time with detailed logs, performance metrics, and error alerts. Stay informed with webhook notifications.',
          showCode: false
        };
      case 'data':
        return {
          title: 'Process and export data',
          description: 'Transform, filter, and export your scraped data in multiple formats including JSON, CSV, and Excel. Integrate with your data pipeline seamlessly.',
          showCode: false
        };
      default:
        return { title: '', description: '', showCode: false };
    }
  };

  const content = getContent();

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-8 text-center">
          Build and deploy reliable scrapers
        </h2>
        
        {/* Tab Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 border-2 border-blue-500 shadow-sm'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left - Text Content */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">{content.title}</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {content.description}
            </p>
            
            {content.showCode && (
              <>
                {/* Template Icons */}
                <div className="flex flex-wrap gap-4 mb-6">
                  {templates.map((template, idx) => (
                    <a 
                      key={idx}
                      href="#"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <img src={template.icon} alt={template.name} className="w-5 h-5" />
                      <span className="text-sm text-gray-700">{template.name}</span>
                    </a>
                  ))}
                </div>
              </>
            )}

            {!content.showCode && (
              <a 
                href="#"
                className="inline-block px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Learn more
              </a>
            )}
          </div>
          
          {/* Right - Code Block or Visual */}
          {content.showCode ? (
            <div className="bg-[#1B1D1F] rounded-xl overflow-hidden shadow-lg">
              {/* Code Tabs */}
              <div className="flex border-b border-gray-700">
                <button 
                  onClick={() => setActiveCodeTab('javascript')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    activeCodeTab === 'javascript' 
                      ? 'text-white bg-gray-800' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  JavaScript
                </button>
                <button 
                  onClick={() => setActiveCodeTab('python')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    activeCodeTab === 'python' 
                      ? 'text-white bg-gray-800' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Python
                </button>
                <div className="ml-auto flex items-center px-4">
                  <button
                    onClick={handleCopy}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Code */}
              <div className="p-6 overflow-x-auto">
                <pre className="text-sm leading-relaxed">
                  <code className="text-gray-300 font-mono">
                    {activeCodeTab === 'javascript' ? jsCode : pythonCode}
                  </code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-12 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-[#2BC56B] rounded-2xl mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {activeTab === 'proxies' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                    {activeTab === 'unblocking' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    )}
                    {activeTab === 'cloud' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    )}
                    {activeTab === 'monitoring' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    )}
                    {activeTab === 'data' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    )}
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{content.title}</h4>
                <p className="text-gray-600 max-w-sm mx-auto">{content.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default OpenSourceSection;