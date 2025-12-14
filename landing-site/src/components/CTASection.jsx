import React from 'react';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-8">
          Ready to start <br className="hidden md:block" />
          extracting web data?
        </h2>
        
        <div className="flex items-center justify-center gap-4">
          <a 
            href="#"
            className="px-8 py-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            Get started free
          </a>
          <a 
            href="#"
            className="px-8 py-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            View documentation
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;