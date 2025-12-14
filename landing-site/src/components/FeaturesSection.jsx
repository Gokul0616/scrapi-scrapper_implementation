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
      title: 'Ready-to-use Scrapers',
      description: 'Access powerful prebuilt scrapers for Google Maps, Amazon, SEO analysis, and more. Start extracting data in minutes.',
      linkText: 'Explore scrapers',
      linkHref: '#',
    },
    {
      icon: 'https://apify.com/img/homepage/platform.svg',
      title: 'Scalable Infrastructure',
      description: 'Built on robust cloud infrastructure with automatic scaling, proxy rotation, and unblocking capabilities.',
      linkText: 'Learn more',
      linkHref: '#',
    },
    {
      icon: 'https://apify.com/img/homepage/professional-services.svg',
      title: 'Developer-friendly API',
      description: 'Integrate scraping into your workflow with our RESTful API, webhooks, and comprehensive documentation.',
      linkText: 'View API docs',
      linkHref: '#',
    },
  ];

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-900 mb-12">
          Everything you need for web scraping
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