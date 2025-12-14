import React, { useState } from 'react';
import { Star } from 'lucide-react';

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

await crawler.run(["https://crawlee.dev"]);`;

const pythonCode = `from crawlee.playwright_crawler import PlaywrightCrawler

crawler = PlaywrightCrawler()

@crawler.router.default_handler
async def request_handler(context):
    await context.push_data({
        'url': context.request.url,
        'title': await context.page.title()
    })
    await context.enqueue_links()

await crawler.run(['https://crawlee.dev'])`;

const OpenSourceSection = ({ templates }) => {
  const [activeTab, setActiveTab] = useState('javascript');

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
          Build and deploy reliable scrapers
        </h2>
        
        {/* Feature Pills */}
        <div className="flex flex-wrap gap-3 mb-12">
          {['Open-source tools', 'Proxies', 'Unblocking', 'Cloud deployment', 'Monitoring', 'Data processing'].map((pill, idx) => (
            <span 
              key={idx}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full"
            >
              {pill}
            </span>
          ))}
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left - Text Content */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">We love open source</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Apify works great with both Python and JavaScript, as well as Playwright, Puppeteer, Selenium, Scrapy, and Crawlee - our own web crawling and browser automation library.
            </p>
            
            {/* Crawlee Badge */}
            <div className="flex items-center gap-4 mb-8">
              <img src="https://apify.com/img/logo/crawlee.svg" alt="Crawlee" className="h-8" />
              <a 
                href="https://github.com/apify/crawlee" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Star className="w-4 h-4" />
                <span className="font-medium">Star</span>
                <span className="text-gray-500">20,800</span>
              </a>
            </div>
            
            {/* Template Icons */}
            <div className="flex flex-wrap gap-4">
              {templates.map((template, idx) => (
                <a 
                  key={idx}
                  href="#"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <img src={template.icon} alt={template.name} className="w-5 h-5" />
                  <span className="text-sm text-gray-700">{template.name}</span>
                </a>
              ))}
            </div>
          </div>
          
          {/* Right - Code Block */}
          <div className="bg-[#1B1D1F] rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button 
                onClick={() => setActiveTab('javascript')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'javascript' 
                    ? 'text-white bg-gray-800' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                JavaScript
              </button>
              <button 
                onClick={() => setActiveTab('python')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'python' 
                    ? 'text-white bg-gray-800' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Python
              </button>
            </div>
            
            {/* Code */}
            <div className="p-6 overflow-x-auto">
              <pre className="text-sm leading-relaxed">
                <code className="text-gray-300 font-mono">
                  {activeTab === 'javascript' ? jsCode : pythonCode}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OpenSourceSection;