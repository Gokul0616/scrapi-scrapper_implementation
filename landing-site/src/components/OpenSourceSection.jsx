import React, { useState } from 'react';
import { Copy, Check, Github, Gitlab, Terminal, Globe, Shield, Cloud, BarChart3, Database, AlertCircle, Download } from 'lucide-react';

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

const unblockingCode = `{
  useFingerprints: true,
  fingerprintOptions: {
    fingerprintGeneratorOptions: {
      browsers: ['Chrome', 'Firefox'],
      devices: ['mobile'],
      locales: ['en-US'],
    },
  },
}`;

const deploymentOutput = `> scrapi push
Info: Deploying Scraper 'product-scraper' to Scrapi.
Run: Updated version 0.0 for scraper Actor.
Run: Building Actor scraper
ACTOR: Pushing Docker image to repository.
ACTOR: Build finished.
Actor build detail -> https://console.scrapi.dev/actors#/builds
Success: Actor was deployed to Scrapi cloud and built there.`;

// World Map SVG Component
const WorldMapVisual = () => (
  <div className="relative w-full h-full min-h-[350px] flex items-center justify-center">
    <svg viewBox="0 0 800 400" className="w-full h-auto opacity-20">
      {/* Simple world map outline */}
      <ellipse cx="400" cy="200" rx="350" ry="170" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" />
      {/* Proxy nodes - dots around the map */}
      {
        [ { x: 150, y: 120 }, { x: 200, y: 180 }, { x: 280, y: 140 }, { x: 320, y: 200 },
        { x: 400, y: 100 }, { x: 450, y: 150 }, { x: 500, y: 180 }, { x: 550, y: 120 },
        { x: 600, y: 200 }, { x: 650, y: 140 }, { x: 350, y: 280 }, { x: 450, y: 260 },
        { x: 550, y: 300 }, { x: 250, y: 250 }, { x: 380, y: 180 }, { x: 480, y: 220 },
      ].map((dot, i) => (
        <circle key={i} cx={dot.x} cy={dot.y} r="6" fill="#2BC56B" opacity={0.6 + Math.random() * 0.4} />
      ))}
      {/* Connection lines */}
      <path d="M150,120 Q275,50 400,100" fill="none" stroke="#2BC56B" strokeWidth="1" opacity="0.3" />
      <path d="M400,100 Q525,50 650,140" fill="none" stroke="#2BC56B" strokeWidth="1" opacity="0.3" />
      <path d="M320,200 Q400,300 480,220" fill="none" stroke="#2BC56B" strokeWidth="1" opacity="0.3" />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center gap-2 mb-3">
          <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Datacenter
          </span>
          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            Residential
          </span>
        </div>
        <p className="text-gray-500 text-sm">195+ Countries Covered</p>
      </div>
    </div>
  </div>
);

// Monitoring Chart Visual
const MonitoringVisual = () => (
  <div className="flex flex-col md:flex-row gap-4 h-full">
    {/* Chart area */}
    <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">Success Rate</span>
        <span className="text-xs text-green-600 font-medium">↑ 99.2%</span>
      </div>
      <svg viewBox="0 0 200 80" className="w-full h-20">
        <polyline
          fill="none"
          stroke="#2BC56B"
          strokeWidth="2"
          points="0,60 20,55 40,45 60,50 80,30 100,35 120,25 140,20 160,15 180,10 200,5"
        />
        <polyline
          fill="url(#gradient)"
          stroke="none"
          points="0,80 0,60 20,55 40,45 60,50 80,30 100,35 120,25 140,20 160,15 180,10 200,5 200,80"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2BC56B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2BC56B" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    {/* Alert panel */}
    <div className="w-full md:w-56 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Create alert</span>
      </div>
      <div className="space-y-2 mb-3">
        <div className="text-xs text-gray-500">Selected scrapers</div>
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">Google Maps</span>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">Amazon</span>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="text-xs text-gray-500">Trigger</div>
        <div className="flex gap-1">
          <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded flex items-center gap-1">
            Failed <span className="text-red-400">×</span>
          </span>
          <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded flex items-center gap-1">
            Aborted <span className="text-orange-400">×</span>
          </span>
        </div>
      </div>
      <div className="text-xs text-gray-500">Notification</div>
    </div>
  </div>
);

// Data Processing Visual
const DataProcessingVisual = () => (
  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 h-full">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-gray-700">Dataset</span>
    </div>
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
      <Database className="w-5 h-5 text-gray-600" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 text-sm">Amazon Products</span>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" /> Success
          </span>
        </div>
        <span className="text-xs text-gray-500">Results: 12,485</span>
      </div>
    </div>
    <div className="space-y-3">
      <div className="text-sm text-gray-600">Export format</div>
      <div className="relative">
        <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent">
          <option>Select format</option>
          <option>JSON</option>
          <option>CSV</option>
          <option>Excel</option>
        </select>
        <Download className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
          <span>CSV</span>
        </button>
        <button className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
          <span>Excel</span>
        </button>
      </div>
    </div>
  </div>
);

// Deployment Icons
const DeploymentIcons = () => (
  <div className="flex justify-center gap-4 mb-4">
    <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center">
      <Github className="w-5 h-5 text-gray-700" />
    </div>
    <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#E24329">
        <path d="M12 22l-9-7 1.3-4L6 4l3 7h6l3-7 1.7 7L21 15l-9 7z"/>
      </svg>
    </div>
    <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center">
      <Terminal className="w-5 h-5 text-gray-700" />
    </div>
  </div>
);

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

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code || (activeCodeTab === 'javascript' ? jsCode : pythonCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getContent = () => {
    switch(activeTab) {
      case 'open-source':
        return {
          title: 'We love open source',
          description: 'Scrapi works great with both Python and JavaScript, as well as Playwright, Puppeteer, Selenium, Scrapy, and Crawlee - our own web crawling and browser automation library.',
          showCode: true,
          codeType: 'main'
        };
      case 'proxies':
        return {
          title: 'Proxies are baked in',
          description: 'Smartly rotating datacenter and residential proxies are an integral part of the Scrapi platform. You can add them to your scrapers with a single line of code.',
          showCode: false,
          visual: 'map'
        };
      case 'unblocking':
        return {
          title: 'Never get blocked',
          description: 'Add just a few lines of code to combine Scrapi proxies, headless browsers, and our human-like browser fingerprints to blend in with normal internet traffic.',
          showCode: true,
          codeType: 'unblocking'
        };
      case 'cloud':
        return {
          title: 'Scale as you go',
          description: 'Deploy Scrapers from Git, CLI, or web IDE to Scrapi\'s cloud infrastructure, and let it handle running and scaling your workloads.',
          showCode: true,
          codeType: 'deployment'
        };
      case 'monitoring':
        return {
          title: 'Know when it breaks',
          description: 'The Scrapi platform monitors the performance of your scrapers and alerts you if something goes wrong. Track data quality with precise statistics.',
          showCode: false,
          visual: 'monitoring'
        };
      case 'data':
        return {
          title: 'Store and export data',
          description: 'Scrapi provides scalable storage for files, structured data, and URL queues. You can easily export and integrate scraping results in formats such as JSON, CSV, or Excel.',
          showCode: false,
          visual: 'data'
        };
      default:
        return { title: '', description: '', showCode: false };
    }
  };

  const content = getContent();

  const renderVisual = () => {
    if (content.showCode) {
      if (content.codeType === 'unblocking') {
        return (
          <div className="bg-[#1B1D1F] rounded-xl overflow-hidden shadow-lg">
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-green-400/20 to-transparent rounded-full blur-xl"></div>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-gray-400 text-xs ml-2">fingerprint.config.js</span>
              <div className="ml-auto">
                <button
                  onClick={() => handleCopy(unblockingCode)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copy code"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6 overflow-x-auto scrollbar-hide">
              <pre className="text-xs md:text-sm leading-relaxed">
                <code className="text-gray-300 font-mono">
                  {unblockingCode.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="text-gray-500 w-6 text-right mr-3 md:mr-4 select-none">{i + 1}</span>
                      <span>
                        {line.includes(':') ? (
                          <>
                            <span className="text-orange-400">{line.split(':')[0]}</span>
                            <span className="text-gray-300">:</span>
                            <span className="text-green-400">{line.split(':').slice(1).join(':')}</span>
                          </>
                        ) : (
                          <span className="text-gray-300">{line}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        );
      }
      
      if (content.codeType === 'deployment') {
        return (
          <div>
            <DeploymentIcons />
            <div className="bg-[#1B1D1F] rounded-xl overflow-hidden shadow-lg">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-xs ml-2">Terminal</span>
              </div>
              <div className="p-4 md:p-6 overflow-x-auto scrollbar-hide">
                <pre className="text-xs md:text-sm leading-relaxed font-mono">
                  {deploymentOutput.split('\n').map((line, i) => (
                    <div key={i} className={
                      line.startsWith('>') ? 'text-green-400' :
                      line.startsWith('Success') ? 'text-green-400' :
                      line.startsWith('Info') ? 'text-blue-400' :
                      line.startsWith('Run') ? 'text-yellow-400' :
                      line.startsWith('ACTOR') ? 'text-gray-400' :
                      line.includes('->') ? 'text-cyan-400' :
                      'text-gray-300'
                    }>{line}</div>
                  ))}
                </pre>
              </div>
            </div>
          </div>
        );
      }

      // Main code block (open-source tab)
      return (
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
                onClick={() => handleCopy()}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Code */}
          <div className="p-4 md:p-6 overflow-x-auto scrollbar-hide">
            <pre className="text-xs md:text-sm leading-relaxed">
              <code className="text-gray-300 font-mono">
                {(activeCodeTab === 'javascript' ? jsCode : pythonCode).split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="text-gray-500 w-6 text-right mr-3 md:mr-4 select-none">{i + 1}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      );
    }

    // Non-code visuals
    if (content.visual === 'map') {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden min-h-[350px]">
          <WorldMapVisual />
        </div>
      );
    }

    if (content.visual === 'monitoring') {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 min-h-[350px]">
          <MonitoringVisual />
        </div>
      );
    }

    if (content.visual === 'data') {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 min-h-[350px]">
          <DataProcessingVisual />
        </div>
      );
    }

    return null;
  };

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-white overflow-hidden" data-testid="open-source-section">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-8 md:mb-12 text-center px-2 tracking-tight">
          Build and deploy reliable scrapers
        </h2>
        
        {/* Tab Navigation - Pill Style like Apify */}
        <div className="mb-8 md:mb-12 relative">
          {/* Gradient fade indicators for mobile scroll */}
          <div className="block md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
          
          <div className="overflow-x-auto scrollbar-hide w-full md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex md:flex-wrap gap-2 md:gap-3 min-w-max md:min-w-0 md:justify-center pb-2 md:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-full flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-start">
          {/* Left - Text Content */}
          <div className="lg:pt-8 px-2 md:px-0">
            <h3 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-normal text-gray-900 mb-3 md:mb-4" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 400, letterSpacing: '-0.01em' }}>{content.title}</h3>
            <p className="text-gray-600 mb-4 md:mb-6 lg:mb-8 leading-relaxed text-sm md:text-base lg:text-lg">
              {content.description}
            </p>
            
            {activeTab === 'open-source' && (
              <>
                {/* Crawlee badge */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
                  <div className="flex items-center gap-2 px-2.5 md:px-3 py-1.5 md:py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24">
                      <path fill="#2BC56B" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <span className="font-semibold text-gray-800 text-sm md:text-base">crawlee</span>
                  </div>
                  <a href="https://github.com/apify/crawlee" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                    <Github className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="text-xs md:text-sm text-gray-600">Star</span>
                  </a>
                  <span className="text-xs md:text-sm font-medium text-gray-700">20,804</span>
                </div>
                
                {/* Template Icons */}
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {templates?.map((template, idx) => (
                    <a 
                      key={idx}
                      href="#"
                      className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <img src={template.icon} alt={template.name} className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="text-xs md:text-sm text-gray-700">{template.name}</span>
                    </a>
                  ))}
                </div>
              </>
            )}

            {activeTab !== 'open-source' && (
              <a 
                href="#"
                className="inline-block px-5 md:px-6 py-2 md:py-2.5 border border-gray-300 text-gray-700 text-sm md:text-base font-medium rounded-lg hover:bg-gray-50 transition-colors"
                data-testid={`learn-more-${activeTab}`}
              >
                Learn more
              </a>
            )}
          </div>
          
          {/* Right - Visual Content */}
          <div className="w-full overflow-hidden px-2 md:px-0">
            {renderVisual()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OpenSourceSection;