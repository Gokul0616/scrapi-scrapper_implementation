import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Star, Play, TrendingUp, Award, PlusCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ActorsV2 = () => {
  const navigate = useNavigate();
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchActors();
  }, []);

  const fetchActors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/actors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActors(response.data);
    } catch (error) {
      console.error('Failed to fetch actors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load actors',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (actorId, currentStarred) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API}/actors/${actorId}`,
        { is_starred: !currentStarred },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActors(actors.map(actor =>
        actor.id === actorId ? { ...actor, is_starred: !currentStarred } : actor
      ));
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const filteredActors = actors.filter(actor =>
    actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    actor.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Scrapi Logo" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading actors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Scraping Actors</h1>
              <p className="text-gray-500 mt-1">{filteredActors.length} actors available</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => navigate('/create-scraper')}
                className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Scraper
              </Button>
              <Badge variant="outline" className="px-4 py-2">
                <Award className="w-4 h-4 mr-2 text-yellow-500" />
                Premium Scrapers
              </Badge>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-8 pb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search actors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Actors Grid */}
      <div className="px-8 py-6">
        {filteredActors.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No actors found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActors.map((actor) => (
              <div
                key={actor.id}
                className="bg-white rounded-lg shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 group"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="text-6xl">{actor.icon}</div>
                    <button
                      onClick={() => toggleStar(actor.id, actor.is_starred)}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          actor.is_starred
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-white'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <h3 className="text-white font-bold text-xl mt-4">
                    {actor.name}
                  </h3>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
                      {actor.category}
                    </Badge>
                    {actor.type === 'prebuilt' && (
                      <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
                        ⚡ Verified
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {actor.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-4 py-3 border-t border-b border-gray-100">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {actor.runs_count} runs
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-sm font-medium text-gray-700">4.9</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => navigate(`/actor/${actor.id}`)}
                    className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 group-hover:shadow-lg transition-all text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Scraping
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActorsV2;
