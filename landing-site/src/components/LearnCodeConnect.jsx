import React from 'react';
import { ArrowRight } from 'lucide-react';

const LearnCodeConnect = () => {
  const cards = [
    {
      title: 'Learn.',
      image: 'https://apify.com/_next/image?url=%2Fimg%2Fhomepage%2Facademy.webp&w=640&q=75',
      heading: 'Web Scraping Academy',
      description: 'Classes for beginners and experts. Learn about web scraping and automation with our free courses.',
      link: 'Visit Academy',
      href: '#',
    },
    {
      title: 'Code.',
      image: 'https://apify.com/_next/image?url=%2Fimg%2Fhomepage%2Ftemplates.webp&w=640&q=75',
      heading: 'Code templates',
      description: 'JavaScript, TypeScript, and Python templates to quick-start your web scraping projects.',
      link: 'Get started',
      href: '#',
    },
    {
      title: 'Connect.',
      image: 'https://apify.com/_next/image?url=%2Fimg%2Fhomepage%2Fdiscord.webp&w=640&q=75',
      heading: 'Discord community',
      description: 'Get help from the Apify developer community of more than 11,500 members.',
      link: 'Join community',
      href: '#',
    },
  ];

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <div key={idx} className="flex flex-col">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{card.title}</h3>
              <a 
                href={card.href}
                className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group flex-1"
              >
                <div className="aspect-video overflow-hidden bg-gray-100">
                  <img 
                    src={card.image} 
                    alt={card.heading}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{card.heading}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{card.description}</p>
                  <span className="inline-flex items-center gap-1 text-gray-900 font-medium text-sm group-hover:gap-2 transition-all">
                    {card.link}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearnCodeConnect;