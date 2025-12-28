import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Users, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { SkeletonGrid } from '../components/SkeletonLoader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function Store() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [view, setView] = useState('landing'); // 'landing' or 'all'
  const [actors, setActors] = useState([]);
  const [featuredActors, setFeaturedActors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDeveloper, setSelectedDeveloper] = useState('all');
  const [selectedPricing, setSelectedPricing] = useState('all');
  const [sortBy, setSortBy] = useState('relevant');
  const [totalActors, setTotalActors] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (view === 'all') {
      fetchAllActors();
    }
  }, [view, searchQuery, selectedCategory, selectedDeveloper, sortBy]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch categories
      const categoriesRes = await fetch(`${BACKEND_URL}/api/store/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData);
      
      // Fetch featured actors for landing
      const featuredRes = await fetch(`${BACKEND_URL}/api/store/featured?limit=6`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const featuredData = await featuredRes.json();
      setFeaturedActors(featuredData);
      
      // Fetch developers
      const developersRes = await fetch(`${BACKEND_URL}/api/store/developers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const developersData = await developersRes.json();
      setDevelopers([{ id: 'all', name: 'All developers' }, ...developersData]);
      
      // Get total count
      const totalCategory = categoriesData.find(c => c.id === 'all');
      setTotalActors(totalCategory?.count || 0);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setLoading(false);
    }
  };

  const fetchAllActors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        skip: '0',
        limit: '50',
        sort_by: sortBy
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedDeveloper !== 'all') params.append('developer', selectedDeveloper);
      
      const response = await fetch(`${BACKEND_URL}/api/store/actors?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setActors(data.actors || []);
      setTotalActors(data.total || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching actors:', error);
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    setView('all');
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
    if (view === 'landing') {
      setView('all');
    }
  };

  const ActorCard = ({ actor }) => (
    <div
      onClick={() => navigate(`/actor/${actor.id}`)}
      data-testid={`actor-card-${actor.id}`}
      className={`border rounded-xl p-5 transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-1 ${
        theme === 'dark' 
          ? 'bg-card border-border hover:border-muted-foreground/30' 
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Actor Icon and Info */}
      <div className="flex items-start gap-3 mb-4">
        <div 
          className={`w-12 h-12 rounded flex items-center justify-center text-2xl flex-shrink-0 border ${
            theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'
          }`}
        >
          {actor.icon || '🗺️'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-[15px] leading-tight mb-1 transition-colors ${
            theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'
          }`}>
            {actor.name}
          </h3>
          <p className={`text-[12px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            {actor.author_name || 'unknown'}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className={`text-[13px] leading-[1.6] mb-4 line-clamp-3 min-h-[62px] ${
        theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'
      }`}>
        {actor.description || 'No description available'}
      </p>

      {/* Stats */}
      <div className={`flex items-center gap-5 text-[12px] font-medium ${
        theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'
      }`}>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>{(actor.runs_count || 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{actor.rating || '4.7'}</span>
          <span className={theme === 'dark' ? 'text-muted-foreground font-normal' : 'text-gray-500 font-normal'}>
            ({(actor.reviews_count || 0).toLocaleString()})
          </span>
        </div>
      </div>
    </div>
  );

  // Landing View
  if (view === 'landing') {
    return (
      <div className={`min-h-screen p-8 font-sans transition-colors ${
        theme === 'dark' ? 'bg-background' : 'bg-background'
      }`}>
        <div className="max-w-[1240px] mx-auto">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className={`text-[40px] font-normal mb-4 tracking-tight ${
              theme === 'dark' ? 'text-foreground' : 'text-gray-900'
            }`}>
              Scrapi Store
            </h1>
          </div>

          {/* Search Bar */}
          <div className="mb-7 max-w-[640px] mx-auto">
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-[18px] h-[18px] ${
                theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Search for Actors"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) setView('all');
                }}
                data-testid="store-search-input"
                className={`w-full h-[52px] pl-12 pr-4 border rounded-lg text-[15px] focus:outline-none focus:ring-2 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-card border-border text-foreground placeholder-muted-foreground focus:ring-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="mb-10 flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                data-testid={`category-pill-${category.id}`}
                className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all ${
                  selectedCategory === category.id
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 text-white'
                    : theme === 'dark'
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* All Actors Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-[22px] font-semibold ${
                theme === 'dark' ? 'text-foreground' : 'text-gray-900'
              }`}>
                All Actors
              </h2>
              <button 
                onClick={handleViewAll}
                data-testid="view-all-button"
                className={`text-[14px] font-medium flex items-center gap-1 transition-colors ${
                  theme === 'dark' 
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                View all →
              </button>
            </div>

            {loading ? (
              <SkeletonGrid count={6} columns={3} />
            ) : featuredActors.length > 0 ? (
              <div className="grid grid-cols-3 gap-6" data-testid="featured-actors-grid">
                {featuredActors.map((actor) => (
                  <ActorCard key={actor.id} actor={actor} />
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-card border-border' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
                  No actors found
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // All Actors View
  return (
    <div className={`min-h-screen p-8 font-sans transition-colors ${
      theme === 'dark' ? 'bg-background' : 'bg-background'
    }`}>
      <div className="max-w-[1240px] mx-auto">
        
        {/* Search Bar */}
        <div className="mb-5">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-[18px] h-[18px] ${
              theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Search for Actors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="all-actors-search-input"
              className={`w-full h-[52px] pl-12 pr-4 border rounded-lg text-[15px] focus:outline-none focus:ring-2 transition-colors ${
                theme === 'dark' 
                  ? 'bg-card border-border text-foreground placeholder-muted-foreground focus:ring-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Filters and Count */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                data-testid="category-filter"
                className={`appearance-none h-10 pl-4 pr-10 border rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-card border-border text-foreground'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="all">All categories</option>
                {categories.filter(c => c.id !== 'all').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none ${
                theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'
              }`} />
            </div>

            {/* Pricing Filter */}
            <div className="relative">
              <select
                value={selectedPricing}
                onChange={(e) => setSelectedPricing(e.target.value)}
                data-testid="pricing-filter"
                className={`appearance-none h-10 pl-4 pr-10 border rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-card border-border text-foreground'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="all">All pricing models</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none ${
                theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'
              }`} />
            </div>

            {/* Developer Filter */}
            <div className="relative">
              <select
                value={selectedDeveloper}
                onChange={(e) => setSelectedDeveloper(e.target.value)}
                data-testid="developer-filter"
                className={`appearance-none h-10 pl-4 pr-10 border rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-card border-border text-foreground'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {developers.map(dev => (
                  <option key={dev.id} value={dev.id}>{dev.name}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none ${
                theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'
              }`} />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                data-testid="sort-filter"
                className={`appearance-none h-10 pl-4 pr-10 border rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-card border-border text-foreground'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="relevant">Most relevant</option>
                <option value="rating">Highest rated</option>
                <option value="newest">Newest</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none ${
                theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'
              }`} />
            </div>
          </div>

          {/* Actor Count */}
          <div className={`text-[15px] font-semibold ${
            theme === 'dark' ? 'text-foreground' : 'text-gray-900'
          }`} data-testid="actor-count">
            {totalActors.toLocaleString()} Actors
          </div>
        </div>

        {/* Back to landing link */}
        <div className="mb-4">
          <button
            onClick={() => setView('landing')}
            data-testid="back-to-store-button"
            className={`text-[13px] font-medium transition-colors ${
              theme === 'dark' 
                ? 'text-muted-foreground hover:text-foreground' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ← Back to Store
          </button>
        </div>

        {/* Actors Grid */}
        {loading ? (
          <SkeletonGrid count={12} columns={3} />
        ) : actors.length > 0 ? (
          <div className="grid grid-cols-3 gap-6" data-testid="all-actors-grid">
            {actors.map((actor) => (
              <ActorCard key={actor.id} actor={actor} />
            ))}
          </div>
        ) : (
          <div className={`text-center py-12 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-card border-border' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <p className={`mb-2 text-[14px] ${theme === 'dark' ? 'text-foreground' : 'text-gray-500'}`}>
              No actors found
            </p>
            <p className={`text-[13px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>
              Try adjusting your search or filters
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default Store;
