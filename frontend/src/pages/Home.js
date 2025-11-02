import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, Users, TrendingUp, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function Home() {
  const navigate = useNavigate();
  const [recentActors, setRecentActors] = useState([]);
  const [suggestedActors, setSuggestedActors] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recent');

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 seconds to show new runs
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch actors
      const actorsRes = await fetch(`${BACKEND_URL}/api/actors`, { headers });
      const actors = await actorsRes.json();

      // Set recent actors (last 3)
      setRecentActors(actors.slice(0, 3));
      
      // Set suggested actors (all available actors)
      setSuggestedActors(actors.slice(0, 3));

      // Fetch recent runs
      const runsRes = await fetch(`${BACKEND_URL}/api/runs?limit=5&sort_by=created_at&sort_order=desc`, { headers });
      const runsData = await runsRes.json();
      console.log('Fetched runs data:', runsData); // Debug log
      setRecentRuns(runsData.runs || []); // Get runs array from response

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      succeeded: 'bg-green-50 text-green-700 border-green-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      running: 'bg-blue-50 text-blue-700 border-blue-200',
      queued: 'bg-gray-50 text-gray-700 border-gray-200'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${styles[status] || styles.queued}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader className="w-8 h-8 text-gray-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Recently Viewed Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently viewed</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentActors.map((actor) => (
              <div
                key={actor.id}
                onClick={() => navigate(`/actor/${actor.id}`)}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-900 transition-all cursor-pointer bg-white hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-2xl">
                    {actor.icon || '🗺️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{actor.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{actor.type || 'compass/crawler-google-places'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Actors Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Suggested Actors for you
              <span className="ml-2 text-sm text-gray-500 font-normal">ⓘ</span>
            </h2>
            <div className="flex gap-2">
              <button className="text-sm text-gray-600 hover:text-gray-900">View all</button>
              <button className="text-sm text-gray-600 hover:text-gray-900">Hide</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {suggestedActors.map((actor) => (
              <div
                key={actor.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-gray-900 transition-all cursor-pointer bg-white hover:shadow-lg"
                onClick={() => navigate(`/actor/${actor.id}`)}
              >
                {/* Actor Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                    {actor.icon || '🗺️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{actor.name}</h3>
                    <p className="text-xs text-gray-500">{actor.type || 'compass/google-maps-extractor'}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {actor.description || 'Extract data from hundreds of places fast. Scrape Google Maps by keyword, category, location, URLs & other filters. Get addresses, contacts, emails, websites, reviews, photos & more.'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-600 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{actor.runs_count || '61K'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{actor.rating || '4.8'} ({actor.reviews_count || '104'})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actor Runs Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Actor runs</h2>
            <button 
              onClick={() => navigate('/runs')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              View all runs
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('recent')}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'recent'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'scheduled'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Scheduled
              </button>
            </div>
          </div>

          {/* Runs Table */}
          {activeTab === 'recent' && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Results</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Started</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentRuns.length > 0 ? (
                    recentRuns.map((run) => (
                      <tr 
                        key={run.id}
                        onClick={() => {
                          // Only navigate to dataset for succeeded runs
                          if (run.status === 'succeeded') {
                            navigate(`/dataset/${run.id}`);
                          }
                        }}
                        className={`transition-colors ${run.status === 'succeeded' ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(run.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center text-sm">
                              {run.actor_icon || '🗺️'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{run.actor_name || 'Google Maps Scraper'}</div>
                              <div className="text-xs text-gray-500">compass/crawler-google-places</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">▶ Pay per event</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-blue-600 font-medium">{run.results_count || 0}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(run.started_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDuration(run.duration_seconds)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Play className="w-12 h-12 text-gray-300" />
                          <p>No recent runs</p>
                          <button
                            onClick={() => navigate('/actors')}
                            className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                          >
                            Start your first run
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No scheduled runs</p>
              <button
                onClick={() => navigate('/schedules')}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Create schedule
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Home;
