import React from 'react';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 mb-6 md:mb-8">
          Ready to start <br className="hidden md:block" />
          extracting web data?
        </h2>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
          <a 
            href="#"
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors text-center"
            data-testid="cta-get-started-button"
          >
            Get started free
          </a>
          <a 
            href="#"
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors text-center"
            data-testid="cta-view-docs-button"
          >
            View documentation
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;