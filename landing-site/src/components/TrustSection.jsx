import React from 'react';

const TrustSection = ({ logos }) => {
  // Double the logos for seamless infinite scroll
  const doubledLogos = [...logos, ...logos];
  
  return (
    <section className="py-12 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6">
        <p className="text-center text-sm text-gray-500 mb-8">
          Trusted by global technology leaders
        </p>
        
        {/* Logo Carousel */}
        <div className="relative overflow-hidden">
          <div className="flex items-center gap-16 animate-marquee whitespace-nowrap">
            {doubledLogos.map((company, idx) => (
              <div key={idx} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <img 
                  src={company.logo} 
                  alt={company.name}
                  className="h-8 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;