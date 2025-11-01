import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Edit, Trash2, Eye, Star, StarOff, Clock, CheckCircle, XCircle, Archive } from 'lucide-react';

function MyScraper() {
  const navigate = useNavigate();
  const [scrapers, setScrapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, draft, active, archived

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    fetchScrapers();
  }, []);

  const fetchScrapers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/scrapers/config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setScrapers(data.configs || []);
    } catch (error) {
      console.error('Error fetching scrapers:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteScraper = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scraper?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await fetch(`${backendUrl}/api/scrapers/config/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setScrapers(scrapers.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting scraper:', error);
      alert('Failed to delete scraper');
    }
  };

  const runScraper = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/scrapers/config/${id}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Scraper started! Run ID: ${data.run_id}`);
        navigate('/runs');
      } else {
        alert('❌ Failed to start scraper');
      }
    } catch (error) {
      console.error('Error running scraper:', error);
      alert('Failed to start scraper');
    }
  };

  const publishAsActor = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/scrapers/config/${id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchScrapers();
      } else {
        alert('❌ Failed to publish scraper');
      }
    } catch (error) {
      console.error('Error publishing scraper:', error);
      alert('Failed to publish scraper');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200">
            <Archive className="w-3 h-3 mr-1" />
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const filteredScrapers = filterStatus === 'all' 
    ? scrapers 
    : scrapers.filter(s => s.status === filterStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scrapers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Scrapers</h1>
              <p className="mt-1 text-sm text-gray-500">
                {scrapers.length} custom scraper{scrapers.length !== 1 ? 's' : ''} created
              </p>
            </div>
            
            <button
              onClick={() => navigate('/scraper-builder')}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:from-gray-900 hover:to-black"
            >
              <Plus className="w-5 h-5" />
              <span>Create Scraper</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="mt-6 flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setFilterStatus('all')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                filterStatus === 'all'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All ({scrapers.length})
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                filterStatus === 'draft'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Draft ({scrapers.filter(s => s.status === 'draft').length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                filterStatus === 'active'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active ({scrapers.filter(s => s.status === 'active').length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredScrapers.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filterStatus === 'all' ? 'No scrapers yet' : `No ${filterStatus} scrapers`}
            </h3>
            <p className="text-gray-500 mb-6">
              {filterStatus === 'all' 
                ? 'Get started by creating your first custom scraper' 
                : `You don't have any ${filterStatus} scrapers`}
            </p>
            {filterStatus === 'all' && (
              <button
                onClick={() => navigate('/scraper-builder')}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:from-gray-900 hover:to-black"
              >
                <Plus className="w-5 h-5" />
                <span>Create Your First Scraper</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScrapers.map((scraper) => (
              <div
                key={scraper.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow bg-white"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{scraper.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{scraper.name}</h3>
                      {getStatusBadge(scraper.status)}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {scraper.description || 'No description'}
                </p>

                <div className="space-y-2 mb-4 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>Fields:</span>
                    <span className="font-medium text-gray-900">{scraper.fields?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Start URLs:</span>
                    <span className="font-medium text-gray-900">{scraper.start_urls?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pagination:</span>
                    <span className="font-medium text-gray-900">
                      {scraper.pagination?.enabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {scraper.tags?.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => runScraper(scraper.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded hover:from-gray-900 hover:to-black text-sm"
                  >
                    <Play className="w-4 h-4" />
                    <span>Run</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {scraper.status === 'draft' && (
                      <button
                        onClick={() => publishAsActor(scraper.id)}
                        title="Publish as Actor"
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => navigate(`/scraper-builder?id=${scraper.id}`)}
                      title="Edit"
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => deleteScraper(scraper.id)}
                      title="Delete"
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyScraper;
