import React from 'react';
import { ArrowRight, Globe, Zap, Code, Database, Shield, Check, Terminal, Play, Server, Layers } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-apify-dark selection:bg-apify-green selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-apify-green flex items-center justify-center">
              <span className="text-white font-bold text-xl leading-none pt-0.5">{'{'}s{'}'}</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-apify-dark">
              Scrapi
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#store" className="hover:text-apify-green transition-colors">Store</a>
            <a href="#features" className="hover:text-apify-green transition-colors">Features</a>
            <a href="#pricing" className="hover:text-apify-green transition-colors">Pricing</a>
            <div className="flex items-center gap-4 ml-4">
              <a href="http://localhost:8001/auth/login" className="hover:text-apify-blue">
                Sign in
              </a>
              <a href="http://localhost:8001/auth/register" className="px-5 py-2 bg-apify-green hover:bg-green-600 text-white font-semibold rounded-md transition-all shadow-md hover:shadow-lg">
                Sign up for free
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left Content */}
            <div className="lg:w-1/2 text-left z-10">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1] text-apify-dark">
                The full-stack <br />
                <span className="text-apify-green">web scraping</span> <br />
                platform
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
                Build reliable web scrapers. Automate anything you can do manually in a web browser. Run on our scalable cloud infrastructure.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href="http://localhost:8001/auth/register" className="px-8 py-4 bg-apify-green text-white font-bold rounded-md hover:bg-green-600 transition-all shadow-lg hover:shadow-xl text-center">
                  Get started for free
                </a>
                <a href="#" className="px-8 py-4 bg-white text-apify-dark font-bold rounded-md border border-slate-200 hover:border-apify-dark transition-all text-center">
                  Book a demo
                </a>
              </div>

              <div className="mt-8 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">User</div>
                  ))}
                </div>
                <p>Trusted by 10,000+ developers</p>
              </div>
            </div>

            {/* Right Graphic/Code */}
            <div className="lg:w-1/2 w-full">
              <div className="relative rounded-xl bg-apify-dark shadow-2xl overflow-hidden border border-slate-700 transform rotate-1 hover:rotate-0 transition-all duration-500">
                <div className="flex items-center justify-between px-4 py-3 bg-apify-navy border-b border-slate-700">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs font-mono text-slate-400">scraper_task.js</div>
                  <Play className="w-4 h-4 text-green-500" />
                </div>
                <div className="p-6 overflow-x-auto">
                  <pre className="font-mono text-sm leading-relaxed">
                    <code className="text-slate-300">
                      <span className="text-purple-400">import</span> {'{ Actor }'} <span className="text-purple-400">from</span> <span className="text-green-400">'scrapi-sdk'</span>;{'\n\n'}
                      <span className="text-slate-500">// Initialize the actor</span>{'\n'}
                      <span className="text-purple-400">await</span> Actor.init();{'\n\n'}
                      <span className="text-slate-500">// Get input</span>{'\n'}
                      <span className="text-purple-400">const</span> {'{ url }'} = <span className="text-purple-400">await</span> Actor.getInput();{'\n\n'}
                      <span className="text-slate-500">// Start scraper</span>{'\n'}
                      <span className="text-purple-400">const</span> requestQueue = <span className="text-purple-400">await</span> Actor.openRequestQueue();{'\n'}
                      <span className="text-purple-400">await</span> requestQueue.addRequest({'{'} url {'}'});{'\n\n'}
                      <span className="text-purple-400">const</span> crawler = <span className="text-purple-400">new</span> CheerioCrawler({'{'}{'\n'}
                      {'  '}requestQueue,{'\n'}
                      {'  '}handlePageFunction: <span className="text-purple-400">async</span> ({'{'} $ {'}'}) {'=>'} {'{'}{'\n'}
                      {'    '}<span className="text-purple-400">const</span> title = $(<span className="text-green-400">'title'</span>).text();{'\n'}
                      {'    '}<span className="text-purple-400">await</span> Actor.pushData({'{'} title, url {'}'});{'\n'}
                      {'  '}{'}'}{'\n'}
                      {'}'});{'\n\n'}
                      <span className="text-purple-400">await</span> crawler.run();
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Trusted by innovative teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholders for logos */}
            <h3 className="text-xl font-bold text-slate-600">Siemens</h3>
            <h3 className="text-xl font-bold text-slate-600">Samsung</h3>
            <h3 className="text-xl font-bold text-slate-600">Accenture</h3>
            <h3 className="text-xl font-bold text-slate-600">T-Mobile</h3>
            <h3 className="text-xl font-bold text-slate-600">Microsoft</h3>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-apify-dark mb-4">
              Everything you need to <span className="text-apify-green">scrape the web</span>
            </h2>
            <p className="text-lg text-slate-600">
              From open-source tools to enterprise-grade cloud platform. Scrapi provides the complete toolkit for data extraction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white group">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-apify-dark mb-3">Scrapi Store</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Hundreds of ready-made Actors for scraping Instagram, Google Maps, Amazon, and more. Launch in seconds.
              </p>
              <a href="#" className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                Browse Store <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white group">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Server className="w-6 h-6 text-apify-green" />
              </div>
              <h3 className="text-xl font-bold text-apify-dark mb-3">Cloud Platform</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Schedule, monitor, and scale your scrapers on our reliable cloud infrastructure. No DevOps required.
              </p>
              <a href="#" className="font-semibold text-apify-green hover:text-green-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                View Features <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white group">
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-apify-dark mb-3">Proxy Network</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Avoid blocking with our intelligent rotation and vast pool of residential and datacenter proxies.
              </p>
              <a href="#" className="font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                Explore Proxies <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Code Demo Section */}
      <section className="py-24 bg-apify-dark text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-apify-green to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 relative z-10">
          <div className="md:w-1/2">
            <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-apify-green text-xs font-bold mb-6">
              <span className="mr-2">●</span> DEVELOPER EXPERIENCE
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for developers by developers</h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Use your favorite open-source libraries like Playwright, Puppeteer, or Cheerio. Deploy to Scrapi Cloud with a single CLI command.
            </p>
            <ul className="space-y-4">
              {[
                "Standardized API input/output",
                "Automatic retries and error handling",
                "Built-in proxy rotation and management",
                "Docker-based containerization"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-apify-green flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-slate-300 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:w-1/2 w-full">
            <div className="bg-apify-navy rounded-lg border border-slate-700 p-6 font-mono text-sm shadow-2xl">
              <div className="text-slate-500 mb-4 select-none"># Install Scrapi CLI</div>
              <div className="flex gap-4 mb-6">
                <span className="text-apify-green">$</span>
                <span className="text-white">npm install -g scrapi-cli</span>
              </div>

              <div className="text-slate-500 mb-4 select-none"># Create a new actor</div>
              <div className="flex gap-4 mb-6">
                <span className="text-apify-green">$</span>
                <span className="text-white">scrapi create my-scraper</span>
              </div>

              <div className="text-slate-500 mb-4 select-none"># Run it locally</div>
              <div className="flex gap-4 mb-6">
                <span className="text-apify-green">$</span>
                <span className="text-white">scrapi run</span>
              </div>

              <div className="text-slate-500 mb-4 select-none"># Deploy to cloud</div>
              <div className="flex gap-4">
                <span className="text-apify-green">$</span>
                <span className="text-white">scrapi push</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-apify-dark mb-6">Start scraping today</h2>
          <p className="text-xl text-slate-600 mb-10">
            Join our community of developers and start extracting data for free. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="http://localhost:8001/auth/register" className="px-8 py-4 bg-apify-green text-white font-bold rounded-md hover:bg-green-600 transition-all shadow-lg w-full sm:w-auto">
              Sign up for free
            </a>
            <a href="#" className="px-8 py-4 bg-white text-apify-dark font-bold rounded-md border border-slate-200 hover:border-apify-dark transition-all w-full sm:w-auto">
              Contact sales
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-apify-dark text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded bg-apify-green flex items-center justify-center">
                <span className="text-white font-bold text-xs">{'{'}s{'}'}</span>
              </div>
              <span className="font-bold text-white text-lg">Scrapi</span>
            </div>
            <p>The platform for web scraping and data extraction.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Platform</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white">Store</a></li>
              <li><a href="#" className="hover:text-white">Actors</a></li>
              <li><a href="#" className="hover:text-white">Proxy</a></li>
              <li><a href="#" className="hover:text-white">Storage</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Developers</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white">Documentation</a></li>
              <li><a href="#" className="hover:text-white">API Reference</a></li>
              <li><a href="#" className="hover:text-white">SDKs</a></li>
              <li><a href="#" className="hover:text-white">Community</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white">About</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
              <li><a href="#" className="hover:text-white">Careers</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
