import React, { act } from 'react';
import { Star, Users, MapPin } from 'lucide-react';
import { Actor } from '../types';

interface ActorCardProps {
    actor: Actor;
}

const ActorCard: React.FC<ActorCardProps> = ({ actor }) => {
    return (
        <a
            href="#"
            className="flex flex-col rounded-xl bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 hover:shadow-xl transition-all group max-w-[350px]"
        >
            {/* Inner White Card (Content) */}
            <div className="flex-1 bg-white dark:bg-zinc-950 p-3 border-b border-gray-200 dark:border-zinc-800 rounded-t-xl flex flex-col">
                {/* Header row: Icon + Title */}
                <div className="flex items-start gap-2 mb-3">
                    <div className="w-[38px] h-[38px] rounded-lg flex-shrink-0 flex border border-gray-200 dark:border-zinc-700 items-center justify-center overflow-hidden bg-gray-50 dark:bg-zinc-900">
                        {actor.icon
                            ? (actor.icon.toLowerCase().startsWith('http') || actor.icon.toLowerCase().startsWith('/'))
                                ? <img src={actor.icon} alt={actor.name} className="w-full h-full object-cover" />
                                : <span className="text-xl leading-none">{actor.icon}</span>
                            : <MapPin className="w-5 h-5 text-red-500" />
                        }
                    </div>
                    <div className="min-w-0 pt-0.5 flex-1">
                        <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white transition-colors truncate leading-tight">
                            {actor.name}
                        </h3>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate leading-none">
                            {actor.author_name ? `${actor.author_name}/${actor.category || 'general'}` : `Viewed recently`}
                        </p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[13px] text-gray-600 dark:text-gray-300 line-clamp-3 leading-snug mt-1">
                    {actor.description}
                </p>
            </div>

            {/* Outer Gray Strip (Footer Analytics) */}
            <div className="p-1.5 flex items-center justify-between text-[13px] font-medium text-gray-600 dark:text-gray-400">
                {/* Author */}
                <div className="flex items-center gap-2">
                    {actor.authorAvatar
                        ? (actor.authorAvatar.toLowerCase().startsWith('http') || actor.authorAvatar.toLowerCase().startsWith('/'))
                            ? <img src={actor.authorAvatar} alt={actor.author} className="w-[18px] h-[18px] rounded-full object-cover shrink-0" />
                            : <span className="text-base leading-none shrink-0">{actor.authorAvatar}</span>
                        : <div className="w-[18px] h-[18px] rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[9px] font-bold shrink-0">
                            {(actor.author || 'U')[0].toUpperCase()}
                        </div>
                    }
                    <span className="truncate max-w-[80px] text-gray-800 dark:text-gray-200">{actor.author}</span>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-transparent text-gray-400 group-hover:text-yellow-500 transition-colors" />
                        <span className="text-gray-800 dark:text-gray-200">{actor.rating}</span>
                    </span>
                    <span className="text-gray-300 dark:text-zinc-600">|</span>
                    <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-gray-800 dark:text-gray-200">{actor.users}</span>
                    </span>
                </div>
            </div>
        </a>
    );
};

interface ActorCardsProps {
    actors: Actor[];
}

const ActorCards: React.FC<ActorCardsProps> = ({ actors }) => {
    return (
        <section className="py-8 px-6">
            <div className="max-w-[1400px] mx-auto">
                <div className="flex flex-wrap gap-4 p-2 -m-2 justify-center">
                    {actors.map((actor) => (
                        <ActorCard key={actor.id} actor={actor} />
                    ))}
                </div>

                {/* Browse More */}
                <div className="text-center mt-8">
                    <a
                        href="#"
                        className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                    >
                        Browse all scrapers
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

