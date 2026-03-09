import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Star, Play } from 'lucide-react';

const ActorCard = ({ actor, recent = false }) => {
    const navigate = useNavigate();

    if (recent) {
        return (
            <div
                onClick={() => navigate(`/actor/${actor.id}`)}
                className="flex items-center gap-1 p-1.5 bg-card border border-border rounded-lg hover:shadow-xl transition-all cursor-pointer group"
            >
                <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-transparent border border-border flex items-center justify-center overflow-hidden">
                    {actor.icon || <Play className="w-5 h-5 text-blue-500" strokeWidth={1.5} />}
                </div>
                <div className="min-w-0 pr-1 flex flex-col justify-center">
                    <h3 className="font-semibold text-[13px] text-foreground transition-colors truncate leading-tight">
                        {actor.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate leading-none">
                        {actor.author_name ? `${actor.author_name}/${actor.category || 'general'}` : `Viewed recently`}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => navigate(`/actor/${actor.id}`)}
            className="flex flex-col rounded-xl bg-muted/40 dark:bg-muted/20 border border-border hover:shadow-xl transition-all cursor-pointer group h-full max-w-[280px]"
        >
            {/* Inner White Card (Content) */}
            <div className="flex-1 bg-card p-3 border-b border-border flex flex-col">
                {/* Header row: Icon + Title */}
                <div className="flex items-start gap-2 mb-3">
                    <div className="w-[38px] h-[38px] rounded-lg flex-shrink-0 flex border border-border items-center justify-center overflow-hidden">
                        {actor?.icon
                            ? (actor.icon.toLowerCase().startsWith('http') || actor.icon.toLowerCase().startsWith('/'))
                                ? <img src={actor.icon} alt={actor.name} className="w-full h-full object-cover" />
                                : <span className="text-xl leading-none">{actor.icon}</span>
                            : <MapPin className="w-5 h-5 text-red-500" />
                        }
                    </div>
                    <div className="min-w-0 pt-0.5 flex-1">
                        <h3 className="font-semibold text-[15px] text-foreground transition-colors truncate leading-tight">
                            {actor.name}
                        </h3>
                        <p className="text-[12px] text-muted-foreground truncate leading-none">
                            {actor.author_name || 'unknown'}/{actor.category || 'general'}
                        </p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[13px] text-accent-foreground font-medium dark:text-gray-300 line-clamp-3 leading-snug mt-1">
                    {actor.description}
                </p>
            </div>

            {/* Outer Gray Strip (Footer Analytics) */}
            <div className="p-1.5 flex items-center justify-between text-[13px] font-medium text-accent-foreground bg-muted/60 dark:bg-muted/20">
                {/* Author */}
                <div className="flex items-center gap-2">
                    {actor.author_icon
                        ? (actor.author_icon.toLowerCase().startsWith('http') || actor.author_icon.toLowerCase().startsWith('/'))
                            ? <img src={actor.author_icon} alt={actor.author_name} className="w-[18px] h-[18px] rounded-full object-cover shrink-0" />
                            : <span className="text-base leading-none shrink-0">{actor.author_icon}</span>
                        : <div className="w-[18px] h-[18px] rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[9px] font-bold shrink-0">
                            {(actor.author_name || 'U')[0].toUpperCase()}
                        </div>
                    }
                    <span className="truncate max-w-[80px] text-foreground">{actor.author_name || 'unknown'}</span>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-transparent text-muted-foreground group-hover:text-yellow-500 transition-colors" />
                        <span className="text-foreground">{actor.rating || '0.0'}</span>
                        <span className="text-muted-foreground font-normal">({actor.reviews_count || '0'})</span>
                    </span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-foreground">{actor.runs_count || '0'}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ActorCard;

