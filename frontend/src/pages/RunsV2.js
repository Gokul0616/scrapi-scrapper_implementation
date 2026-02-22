import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Play, Clock, CheckCircle2, XCircle, Loader2, Database, Search, Filter } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RunsV2 = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRuns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/runs`, {
        headers: { Authorization: `Bearer ${token}` },
        hideErrorToast: true
      });
      setRuns(response.data);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-gray-700 animate-spin" />;
      case 'queued':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      succeeded: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      running: 'bg-gray-200 text-gray-900 border-gray-300',
      queued: 'bg-gray-100 text-gray-700 border-gray-200'
    };

    return (
      <Badge variant="outline" className={`${variants[status] || variants.queued} font-medium`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRuns = runs.filter(run => {
    const matchesSearch = run.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-700 animate-spin" />
          <p className="text-gray-600">Loading runs...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Scraping Runs</h1>
              <p className="text-gray-500 mt-1">{filteredRuns.length} total runs</p>
            </div>
            <Button
              onClick={() => navigate('/actors')}
              className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              New Run
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 pb-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={statusFilter === 'all' ? 'bg-gray-900' : ''}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'running' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('running')}
              className={statusFilter === 'running' ? 'bg-gray-800 hover:bg-gray-700 text-white' : ''}
            >
              Running
            </Button>
            <Button
              variant={statusFilter === 'succeeded' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('succeeded')}
              className={statusFilter === 'succeeded' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Succeeded
            </Button>
            <Button
              variant={statusFilter === 'failed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('failed')}
              className={statusFilter === 'failed' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Failed
            </Button>
          </div>
        </div>
      </div>

      {/* Runs Table */}
      <div className="px-8 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {filteredRuns.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No runs found</p>
              <p className="text-sm text-gray-400 mt-2">Start a new scraping run to see it here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actor</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Run ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Results</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Started</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(run.status)}
                          {getStatusBadge(run.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{run.actor_name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {run.input_data?.search_terms?.join(', ') || 'No search terms'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {run.id.slice(0, 8)}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900 text-lg">{run.results_count}</span>
                          <span className="text-gray-400 text-sm">items</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDuration(run.duration_seconds)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(run.started_at)}
                      </td>
                      <td className="px-6 py-4">
                        {run.status === 'succeeded' && run.results_count > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/dataset/${run.id}`)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          >
                            <Database className="w-4 h-4 mr-1" />
                            View Leads
                          </Button>
                        ) : run.status === 'failed' ? (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            In Progress
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunsV2;
