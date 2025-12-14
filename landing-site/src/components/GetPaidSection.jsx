import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

const GetPaidSection = () => {
  const benefits = [
    {
      title: 'No upfront costs',
      description: 'Publishing your Actor is free of charge—the customers pay for the computing resources. New creators get $500 free platform credits.',
    },
    {
      title: 'Rely on Apify infra',
      description: "Actors scale automatically as you gain new users. You don't need to worry about compute, storage, proxies, or authentication.",
    },
    {
      title: 'Billing is on us',
      description: 'Handling payments, taxes, and invoicing is a painful part of running a SaaS. Apify does all that and sends you a net payout every month.',
    },
  ];

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
              Publish Actors. Get paid.
            </h2>
            <h3 className="text-2xl font-semibold text-gray-600 mb-6">
              Reach thousands of new customers
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Building and running a SaaS is hard. Building an Actor and selling it on Apify Store is 10x easier. Get users from day one.
            </p>
            
            <a 
              href="#"
              className="inline-flex items-center gap-2 text-gray-900 font-medium hover:gap-3 transition-all"
            >
              Learn more
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          
          {/* Right - Animation Placeholder */}
          <div className="bg-gray-50 rounded-xl p-8">
            <div className="aspect-square max-w-md mx-auto flex items-center justify-center">
              <img 
                src="https://apify.com/img/homepage/get-paid-animation.svg" 
                alt="Get paid"
                className="w-full h-full object-contain"
              />
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