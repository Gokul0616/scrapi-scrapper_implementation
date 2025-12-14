import React from 'react';
import { ArrowRight } from 'lucide-react';

const TestimonialCard = ({ testimonial }) => (
  <div className="block p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
    <p className="text-gray-700 text-sm leading-relaxed mb-6">
      "{testimonial.quote}"
    </p>
    <div className="flex items-center gap-3">
      <img 
        src={testimonial.avatar} 
        alt={testimonial.author}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div>
        <p className="font-semibold text-gray-900 text-sm">{testimonial.author}</p>
        <p className="text-gray-500 text-xs">{testimonial.role}</p>
      </div>
    </div>
  </div>
);

const EnterpriseSection = ({ testimonials }) => {
  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-[1400px] mx-auto">
        {/* Enterprise Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
            Trusted by businesses worldwide
          </h2>
          <p className="text-gray-600 mb-2">
            Reliable web scraping infrastructure for teams of all sizes.
          </p>
          <p className="text-gray-600 mb-8">
            99% uptime. Secure and compliant.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <a 
              href="#"
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Get started
            </a>
            <a 
              href="#"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Contact us
            </a>
          </div>
        </div>
        
        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, idx) => (
            <TestimonialCard key={idx} testimonial={testimonial} />
          ))}
        </div>
        
        {/* Use Cases */}
        <div className="mt-16 bg-white border border-gray-200 rounded-xl p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Popular Use Cases
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#2BC56B]/10 rounded-lg mb-3">
                <svg className="w-6 h-6 text-[#2BC56B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Lead Generation</h4>
              <p className="text-sm text-gray-600">Extract business contacts and leads from Google Maps and directories</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#2BC56B]/10 rounded-lg mb-3">
                <svg className="w-6 h-6 text-[#2BC56B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">E-commerce Intelligence</h4>
              <p className="text-sm text-gray-600">Monitor competitor prices, products, and reviews from Amazon</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#2BC56B]/10 rounded-lg mb-3">
                <svg className="w-6 h-6 text-[#2BC56B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">SEO Analysis</h4>
              <p className="text-sm text-gray-600">Extract metadata, structured data, and technical SEO insights</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnterpriseSection;