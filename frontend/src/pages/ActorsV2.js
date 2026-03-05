import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Search, ChevronLeft, ChevronRight, Filter, Plus
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ErrorDisplay, { showError } from '../components/ErrorDisplay';
import LoadingScreen from '../components/LoadingScreen';
import ActorsTable from '../components/ActorsTable';
import CustomDropdown from '../components/CustomDropdown';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusOptions = [
  { label: 'Any Status', value: 'all' },
  { label: 'Succeeded', value: 'succeeded' },
  { label: 'Running', value: 'running' },
  { label: 'Failed', value: 'failed' },
  { label: 'Aborted', value: 'aborted' }
];

const pricingOptions = [
  { label: 'Any Price', value: 'all' },
  { label: 'Pay per event', value: 'pay_per_event' },
  { label: 'Free', value: 'free' }
];

const itemsPerPageOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 }
];

const ActorsV2 = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // State
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recent'); // 'recent' or 'issues'
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [filterPricingModel, setFilterPricingModel] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [selectedActors, setSelectedActors] = useState([]);
  const [totalActors, setTotalActors] = useState(0);

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, itemsPerPage, searchQuery, filterStatus, filterPricingModel, filterBookmarked]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'recent') {
        await fetchRecentlyViewedActors();
      } else {
        await fetchActorsUsed();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentlyViewedActors = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        status: filterStatus,
        pricingModel: filterPricingModel,
        bookmarked: filterBookmarked
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await axios.get(`${API}/actors/recently-viewed`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setActors(response.data.actors || []);
      setTotalActors(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch recently viewed actors:', error);
      showError('Failed to load recently viewed actors', { type: 'error', title: 'Error' });
    }
  };

  const fetchActorsUsed = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        status: filterStatus,
        pricingModel: filterPricingModel,
        bookmarked: filterBookmarked
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      // Parameters are now fully handled by the server
      const response = await axios.get(`${API}/actors-used`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setActors(response.data.actors || []);
      setTotalActors(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch actors:', error);
      showError('Failed to load actors', { type: 'error', title: 'Error' });
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

  // Filter & Search Logic
  // Filtering is now largely handled on server (especially search)
  // Client-side filtering can remain for other filters if not yet on server
  const filteredActors = actors; // Simplified for now to match requested pattern

  // Pagination Logic
  const totalPages = Math.ceil(totalActors / itemsPerPage);
  const paginatedActors = actors;


  const toggleActorSelection = (id) => {
    setSelectedActors(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAllActorsSelection = () => {
    if (selectedActors.length === paginatedActors.length) {
      setSelectedActors([]);
    } else {
      setSelectedActors(paginatedActors.map(a => a.id));
    }
  };

  return (
    <div className="min-h-screen p-8 font-sans transition-colors bg-background text-foreground">
      {/* Header */}
      <div className="max-w-full mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-foreground">Actors</h1>
            <span className="text-[22px] text-muted-foreground font-normal">({filteredActors.length})</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/store')}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Store
            </button>
            <button
              onClick={() => window.open(`${BACKEND_URL}/docs`, '_blank')}
              className="px-4 py-1.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
            >
              API
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-6 border-b border-border mb-6">
          <button
            onClick={() => { setActiveTab('recent'); setCurrentPage(1); }}
            className={`pb-3 px-1 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'recent'
              ? 'border-blue-500 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            Recently Viewed
          </button>
          <button
            onClick={() => { setActiveTab('issues'); setCurrentPage(1); }}
            className={`pb-3 px-1 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'issues'
              ? 'border-blue-500 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            Issues
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Actor name..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-9 pr-3 py-2 border border-border rounded-md text-[13px] bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CustomDropdown
              value={filterStatus}
              onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
              options={statusOptions}
              className="w-[140px]"
            />

            <CustomDropdown
              value={filterPricingModel}
              onChange={(val) => { setFilterPricingModel(val); setCurrentPage(1); }}
              options={pricingOptions}
              className="w-[140px]"
            />

            <button
              onClick={() => { setFilterBookmarked(!filterBookmarked); setCurrentPage(1); }}
              className={`px-3 py-2 text-[13px] border rounded-lg h-9 transition-colors ${filterBookmarked
                ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                : 'bg-card border-border text-foreground hover:bg-muted'
                }`}
            >
              Bookmarked
            </button>
          </div>
        </div>

        {/* Table */}
        <ActorsTable
          actors={paginatedActors}
          loading={loading}
          selectedActors={selectedActors}
          toggleActorSelection={toggleActorSelection}
          toggleAllActorsSelection={toggleAllActorsSelection}
          toggleStar={toggleStar}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          totalItems={totalActors}
        />

      </div>
    </div>
  );
};

export default ActorsV2;
