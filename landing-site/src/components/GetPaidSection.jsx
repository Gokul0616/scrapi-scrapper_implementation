import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

const GetPaidSection = () => {
  const benefits = [
    {
      title: 'Powerful Scrapers',
      description: 'Access our collection of production-ready scrapers for Google Maps, Amazon, SEO analysis, and more.',
    },
    {
      title: 'Scalable Infrastructure',
      description: 'Built on cloud infrastructure that automatically scales based on your needs. No server management required.',
    },
    {
      title: 'Data Quality',
      description: 'Get clean, structured data with automatic validation and error handling. Export in multiple formats.',
    },
  ];

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
              Built for scale and reliability
            </h2>
            <h3 className="text-2xl font-semibold text-gray-600 mb-6">
              Enterprise-grade web scraping
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Scrapi handles the complexity of web scraping so you can focus on using the data.
              Our platform manages proxies, handles anti-bot measures, and ensures reliable data extraction.
            </p>
            
            <a 
              href="#"
              className="inline-flex items-center gap-2 text-gray-900 font-medium hover:gap-3 transition-all"
            >
              Explore features
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          
          {/* Right - Illustration */}
          <div className="bg-gradient-to-br from-[#2BC56B]/10 to-gray-50 rounded-xl p-8">
            <div className="aspect-square max-w-md mx-auto flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-[#2BC56B] rounded-2xl mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Fast & Reliable</h3>
                <p className="text-gray-600">Extract data at scale with confidence</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2BC56B] flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{benefit.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GetPaidSection;