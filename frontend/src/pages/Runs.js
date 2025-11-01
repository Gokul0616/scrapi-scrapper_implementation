import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Play, Download, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Runs = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRuns();
    // Refresh runs every 5 seconds to show progress
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRuns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/runs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRuns(response.data);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter(run =>
    run.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    run.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'queued':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      succeeded: 'bg-green-100 text-green-800 hover:bg-green-100',
      failed: 'bg-red-100 text-red-800 hover:bg-red-100',
      running: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      queued: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
      aborted: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
    };

    return (
      <Badge className={variants[status] || variants.queued}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Scrapi Logo" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Runs</h1>
        </div>
      </div>

      {/* Search and count */}
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by Actor name or status"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {filteredRuns.length} Runs
          </span>
        </div>
      </div>

      {/* Runs Table */}
      <div className="px-8 pb-8">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Actor</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Started</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Duration</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Results</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr
                  key={run.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{run.actor_name}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(run.status)}
                      {getStatusBadge(run.status)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-sm">
                    {formatDate(run.started_at)}
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-sm">
                    {formatDuration(run.duration_seconds)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-blue-600 font-medium">
                      {run.results_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {run.dataset_id && run.status === 'succeeded' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dataset/${run.id}`)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        View Data
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRuns.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                    No runs found. Start your first scraper from the Actors page!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Runs;
