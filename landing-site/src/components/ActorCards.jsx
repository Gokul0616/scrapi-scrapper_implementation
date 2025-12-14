import React from 'react';
import { Star, Users } from 'lucide-react';

const ActorCard = ({ actor }) => {
  return (
    <a 
      href="#" 
      className="block p-5 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-gray-300 transition-all group"
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className="w-[52px] h-[52px] rounded-xl overflow-hidden flex-shrink-0">
          <img 
            src={actor.icon} 
            alt={actor.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">
              {actor.name}
            </h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">{actor.slug}</p>
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {actor.description}
          </p>
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src={actor.authorAvatar} 
                alt={actor.author}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm text-gray-600">{actor.author}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {actor.users}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {actor.rating}
              </span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
};

const ActorCards = ({ actors }) => {
  return (
    <section className="py-8 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actors.map((actor) => (
            <ActorCard key={actor.id} actor={actor} />
          ))}
        </div>
        
        {/* Browse More */}
        <div className="text-center mt-8">
          <a 
            href="#" 
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Browse 10,000+ Actors
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default ActorCards;