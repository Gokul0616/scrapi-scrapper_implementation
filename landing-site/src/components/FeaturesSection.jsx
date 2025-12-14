import React from 'react';
import { ArrowRight } from 'lucide-react';

const FeatureCard = ({ icon, title, description, linkText, linkHref }) => (
  <a 
    href={linkHref || '#'}
    className="flex flex-col p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all group"
  >
    <div className="mb-4">
      <img src={icon} alt={title} className="w-10 h-10" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">{description}</p>
    <span className="inline-flex items-center gap-1 text-gray-900 font-medium text-sm group-hover:gap-2 transition-all">
      {linkText}
      <ArrowRight className="w-4 h-4" />
    </span>
  </a>
);

const FeaturesSection = () => {
  const features = [
    {
      icon: 'https://apify.com/img/homepage/marketplace.svg',
      title: 'Marketplace of 10,000+ Actors',
      description: 'Apify has Actors for scraping websites, automating the web, and feeding AI with web data.',
      linkText: 'Visit Apify Store',
      linkHref: '#',
    },
    {
      icon: 'https://apify.com/img/homepage/platform.svg',
      title: 'Build and deploy your own',
      description: 'Have a new use case? Start building new Actors with our code templates and extensive guides.',
      linkText: 'Start building',
      linkHref: '#',
    },
    {
      icon: 'https://apify.com/img/homepage/professional-services.svg',
      title: 'Or we can build it for you',
      description: 'Rely on our experts to deliver and maintain custom web scraping solutions for you.',
      linkText: 'Learn more',
      linkHref: '#',
    },
  ];

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-900 mb-12">
          Not just a web scraping API
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;