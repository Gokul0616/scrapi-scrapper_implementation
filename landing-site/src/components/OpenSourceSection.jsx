import React, { useState } from 'react';

const pythonCode = `from scrapi import ScrapiClient

# Initialize client
client = ScrapiClient(api_key='your_api_key')

# Run Google Maps scraper
run = client.run_actor(
    actor_id='google-maps-scraper-v2',
    run_input={
        'search_terms': ['restaurants in New York'],
        'location': 'New York, NY',
        'max_results': 100
    }
)

# Get results
results = client.get_dataset_items(run['defaultDatasetId'])
for item in results:
    print(item['name'], item['address'])`;

const jsCode = `import { ScrapiClient } from '@scrapi/client';

// Initialize client
const client = new ScrapiClient({
  apiKey: 'your_api_key'
});

// Run Amazon scraper
const run = await client.runActor(
  'amazon-product-scraper',
  {
    search_keywords: ['wireless headphones'],
    max_results: 50,
    extract_reviews: false
  }
);

// Get results
const dataset = await client.getDataset(
  run.defaultDatasetId
);
const items = await dataset.listItems();
console.log(items);`;

const OpenSourceSection = ({ templates }) => {
  const [activeTab, setActiveTab] = useState('python');

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
          Developer-friendly API
        </h2>
        
        {/* Feature Pills */}
        <div className="flex flex-wrap gap-3 mb-12">
          {['RESTful API', 'Webhooks', 'Scheduling', 'Data Export', 'Proxy Support', 'Rate Limiting'].map((pill, idx) => (
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
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Simple integration</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Scrapi works seamlessly with both Python and JavaScript. Our API is designed for developers,
              with comprehensive documentation and code examples to get you started quickly.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2BC56B] flex items-center justify-center text-white text-xs font-bold">✓</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Easy Authentication</h4>
                  <p className="text-sm text-gray-600">Simple API key authentication for secure access</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2BC56B] flex items-center justify-center text-white text-xs font-bold">✓</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Flexible Output</h4>
                  <p className="text-sm text-gray-600">Export data in JSON, CSV, or Excel formats</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2BC56B] flex items-center justify-center text-white text-xs font-bold">✓</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Real-time Status</h4>
                  <p className="text-sm text-gray-600">Monitor scraping jobs with webhooks and status APIs</p>
                </div>
              </div>
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
                onClick={() => setActiveTab('python')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'python' 
                    ? 'text-white bg-gray-800' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Python
              </button>
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
            </div>
            
            {/* Code */}
            <div className="p-6 overflow-x-auto">
              <pre className="text-sm leading-relaxed">
                <code className="text-gray-300 font-mono">
                  {activeTab === 'python' ? pythonCode : jsCode}
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