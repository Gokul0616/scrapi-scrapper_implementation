import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Play, Star, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Actors = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recently');
  const [searchQuery, setSearchQuery] = useState('');
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'recently', label: 'Recently used' },
    { id: 'starred', label: 'Starred' },
    { id: 'myown', label: 'My own' },
    { id: 'rented', label: 'Rented' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'issues', label: 'Issues' }
  ];

  const filteredActors = actors.filter(actor =>
    actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    actor.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStarToggle = async (actorId) => {
    const actor = actors.find(a => a.id === actorId);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/actors/${actorId}`, 
        { is_starred: !actor.is_starred },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActors(actors.map(a =>
        a.id === actorId ? { ...a, is_starred: !a.is_starred } : a
      ));
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

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
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Actors</h1>
          <div className="flex items-center space-x-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Go to store
            </Button>
            <Button variant="outline">API</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-8">
        <div className="flex space-x-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search and count */}
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by Actor name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {filteredActors.length} Actors
          </span>
        </div>
      </div>

      {/* Actors Table */}
      <div className="px-8 pb-8">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-12 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Runs</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Last run started</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Last run status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Last run duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredActors.map((actor, index) => (
                <tr
                  key={actor.id}
                  className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/actor/${actor.id}`)}
                >
                  <td className="px-4 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStarToggle(actor.id);
                      }}
                      className="text-gray-400 hover:text-yellow-500 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          actor.is_starred ? 'fill-yellow-500 text-yellow-500' : ''
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded flex items-center justify-center text-xl">
                        {actor.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{actor.name}</div>
                        <div className="text-sm text-gray-500 max-w-md truncate">
                          {actor.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-blue-600 font-medium">{actor.runs_count || 0}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-sm">-</td>
                  <td className="px-4 py-4">
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                      -
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-sm">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Actors;
