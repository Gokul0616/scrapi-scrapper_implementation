import React from 'react';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-8">
          It's time to run <br className="hidden md:block" />
          your first Actor.
        </h2>
        
        <div className="flex items-center justify-center gap-4">
          <a 
            href="#"
            className="px-8 py-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            Get started
          </a>
          <a 
            href="#"
            className="px-8 py-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Get a demo
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;