import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, Star, ChevronDown, ChevronUp, Play, 
  ArrowUpDown, Filter, MapPin
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ActorsV2 = () => {
  const navigate = useNavigate();
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recent'); // 'recent' or 'issues'
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [filterPricingModel, setFilterPricingModel] = useState('all');
  const [sortColumn, setSortColumn] = useState('last_run_started');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchActorsUsed();
  }, []);

  const fetchActorsUsed = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/actors-used`, {
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

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds} s`;
    return `${Math.floor(seconds / 60)} m ${seconds % 60} s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      succeeded: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '✓' },
      running: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '↻' },
      failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '✗' },
      queued: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '⋯' },
      aborted: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '!' }
    };
    
    const config = statusConfig[status] || statusConfig.queued;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <span className="mr-1">{config.icon}</span>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-gray-700" /> : 
      <ChevronDown className="w-4 h-4 text-gray-700" />;
  };

  // Filter actors
  let filteredActors = actors.filter(actor => {
    // Search filter
    const matchesSearch = actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         actor.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || actor.last_run_status === filterStatus;
    
    // Bookmarked filter
    const matchesBookmarked = !filterBookmarked || actor.is_starred;
    
    // Tab filter
    const matchesTab = activeTab === 'recent' || (activeTab === 'issues' && actor.last_run_status === 'failed');
    
    return matchesSearch && matchesStatus && matchesBookmarked && matchesTab;
  });

  // Sort actors
  filteredActors = [...filteredActors].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];
    
    if (sortColumn === 'name') {
      aVal = a.name || '';
      bVal = b.name || '';
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    if (sortColumn === 'total_runs') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    if (sortColumn === 'last_run_started') {
      aVal = aVal ? new Date(aVal) : new Date(0);
      bVal = bVal ? new Date(bVal) : new Date(0);
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    if (sortColumn === 'last_run_duration') {
      return sortDirection === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    }
    
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(filteredActors.length / itemsPerPage);
  const paginatedActors = filteredActors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <img src="/logo.png" alt="Scrapi Logo" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading actors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-semibold text-gray-900">Actors</h1>
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                {filteredActors.length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/store')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-600"
              >
                Go to Store
              </button>
              <button
                onClick={() => navigate('/create-scraper')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-300"
              >
                Develop new
              </button>
              <button
                onClick={() => window.open(`${BACKEND_URL}/docs`, '_blank')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-300"
              >
                API
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center space-x-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('recent')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'recent'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Recent & Bookmarked
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'issues'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Issues
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Actor name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Last run status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              >
                <option value="all">Last run status</option>
                <option value="succeeded">Succeeded</option>
                <option value="running">Running</option>
                <option value="failed">Failed</option>
                <option value="queued">Queued</option>
                <option value="aborted">Aborted</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Bookmarked filter */}
            <div className="relative">
              <select
                value={filterBookmarked ? 'bookmarked' : 'all'}
                onChange={(e) => setFilterBookmarked(e.target.value === 'bookmarked')}
                className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              >
                <option value="all">Bookmarked</option>
                <option value="bookmarked">Bookmarked only</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Pricing model filter */}
            <div className="relative">
              <select
                value={filterPricingModel}
                onChange={(e) => setFilterPricingModel(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              >
                <option value="all">Pricing model</option>
                <option value="pay_per_event">Pay per event</option>
                <option value="free">Free</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <span className="text-sm text-gray-600">{filteredActors.length} Actor{filteredActors.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-white">
              <th className="w-12 px-4 py-3">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase hover:text-gray-900"
                >
                  <span>Name</span>
                  {getSortIcon('name')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('total_runs')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase hover:text-gray-900"
                >
                  <span>Total runs</span>
                  {getSortIcon('total_runs')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <div className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase">
                  <span>Pricing model</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('last_run_started')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase hover:text-gray-900"
                >
                  <span>Last run started</span>
                  {getSortIcon('last_run_started')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('last_run_status')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase hover:text-gray-900"
                >
                  <span>Last run status</span>
                  {getSortIcon('last_run_status')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('last_run_duration')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase hover:text-gray-900"
                >
                  <span>Last run duration</span>
                  {getSortIcon('last_run_duration')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedActors.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center">
                  <div className="text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No actors found</p>
                    <p className="text-xs mt-1">Try adjusting your filters or search query</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedActors.map((actor) => (
                <tr
                  key={actor.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/actor/${actor.id}`)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{actor.icon}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{actor.name}</span>
                          {actor.type === 'prebuilt' && (
                            <span className="text-xs text-gray-500">✓</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {actor.category || 'compass/crawler-google-places'}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(actor.id, actor.is_starred);
                        }}
                        className="ml-2"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            actor.is_starred
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 hover:text-gray-400'
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{actor.total_runs || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">
                      {actor.pricing_model === 'pay_per_event' ? 'Pay per event' : 'Free'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{formatDate(actor.last_run_started)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(actor.last_run_status)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{formatDuration(actor.last_run_duration)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginatedActors.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Go to page:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = Number(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                />
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActorsV2;
