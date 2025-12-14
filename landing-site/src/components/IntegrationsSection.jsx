import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const integrationNames = ['Zapier', 'GitHub', 'Google Sheets', 'Pinecone', 'any app', 'Airbyte', 'MCP clients', 'Google Drive', 'Slack'];

const IntegrationsSection = ({ integrations }) => {
  const [currentIntegration, setCurrentIntegration] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIntegration((prev) => (prev + 1) % integrationNames.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
            Easily integrate <span className="text-[#2BC56B]">{integrationNames[currentIntegration]}</span> with Actors
          </h2>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <a 
              href="#" 
              className="text-gray-900 font-medium hover:underline"
            >
              Browse integrations
            </a>
            <a 
              href="#" 
              className="text-gray-900 font-medium hover:underline"
            >
              View SDKs
            </a>
          </div>
        </div>
        
        {/* Integration Icons */}
        <div className="flex flex-wrap justify-center items-center gap-8">
          {integrations.map((integration, idx) => (
            <div 
              key={idx}
              className="w-16 h-16 flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <img 
                src={integration.icon} 
                alt={integration.name}
                className="w-8 h-8 object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;