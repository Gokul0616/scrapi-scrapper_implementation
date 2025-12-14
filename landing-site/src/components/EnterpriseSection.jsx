import React from 'react';
import { ArrowRight, Shield, Check } from 'lucide-react';

const TestimonialCard = ({ testimonial }) => (
  <a 
    href={testimonial.link}
    target="_blank"
    rel="noopener noreferrer"
    className="block p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow"
  >
    <p className="text-gray-700 text-sm leading-relaxed mb-6">
      {testimonial.quote}
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
  </a>
);

const EnterpriseSection = ({ testimonials }) => {
  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-[1400px] mx-auto">
        {/* Enterprise Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
            Enterprise-grade solution
          </h2>
          <p className="text-gray-600 mb-2">
            Secure and reliable web data extraction provider for any scale.
          </p>
          <p className="text-gray-600 mb-8">
            99.95% uptime. SOC2, GDPR, and CCPA compliant.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <a 
              href="#"
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Contact sales
            </a>
            <a 
              href="#"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Learn more
            </a>
          </div>
        </div>
        
        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, idx) => (
            <TestimonialCard key={idx} testimonial={testimonial} />
          ))}
        </div>
        
        <div className="text-center">
          <a 
            href="#"
            className="inline-flex items-center gap-2 text-gray-700 font-medium hover:text-gray-900 transition-colors"
          >
            Read more customer stories
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        
        {/* Professional Services */}
        <div className="mt-16 bg-white border border-gray-200 rounded-xl p-8 flex flex-col lg:flex-row items-center gap-8">
          <div className="lg:w-1/2">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Apify Professional Services
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Our experienced team can help you design, implement, and successfully execute your web scraping project.
            </p>
            <a 
              href="#"
              className="inline-flex items-center gap-2 text-gray-900 font-medium hover:gap-3 transition-all"
            >
              Learn more
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="lg:w-1/2">
            <img 
              src="https://apify.com/_next/image?url=%2Fimg%2Fhomepage%2Fhomepage-professional-services.webp&w=640&q=75"
              alt="Professional Services"
              className="rounded-lg w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnterpriseSection;