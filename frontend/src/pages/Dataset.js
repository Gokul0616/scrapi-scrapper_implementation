import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Download, ArrowLeft } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dataset = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDataset();
  }, [runId]);

  const fetchDataset = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/datasets/${runId}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch dataset:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dataset',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/datasets/${runId}/export?format=${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dataset_${runId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: 'Export successful',
        description: `Dataset exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Failed to export dataset:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export dataset',
        variant: 'destructive'
      });
    }
  };

  const filteredItems = items.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    return Object.values(item.data).some(value =>
      String(value).toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Scrapi Logo" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading dataset...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white">
      <div className="border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/runs')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dataset</h1>
              <p className="text-gray-600 mt-1">Run ID: {runId.slice(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => handleExport('json')}>
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <span className="text-sm font-medium text-gray-700">{filteredItems.length} Results</span>
        </div>
      </div>

      <div className="px-8 pb-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No data found</div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {item.data.title && (
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900">{index + 1}. {item.data.title}</h3>
                      {item.data.category && <Badge variant="outline" className="mt-1">{item.data.category}</Badge>}
                    </div>
                  )}
                  {item.data.address && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Address</div>
                      <div className="text-gray-900">{item.data.address}</div>
                    </div>
                  )}
                  {item.data.phone && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Phone</div>
                      <div className="text-gray-900">{item.data.phone}</div>
                    </div>
                  )}
                  {item.data.website && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Website</div>
                      <a href={item.data.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{item.data.website}</a>
                    </div>
                  )}
                  {item.data.rating && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Rating</div>
                      <div className="text-gray-900">⭐ {item.data.rating}{item.data.reviewsCount && <span className="text-gray-500 text-sm ml-2">({item.data.reviewsCount} reviews)</span>}</div>
                    </div>
                  )}
                  {item.data.openingHours && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Hours</div>
                      <div className="text-gray-900 text-sm">{item.data.openingHours}</div>
                    </div>
                  )}
                  {item.data.url && (
                    <div className="md:col-span-2">
                      <a href={item.data.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View on Google Maps →</a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dataset;
