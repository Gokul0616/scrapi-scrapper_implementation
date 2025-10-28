import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Hls from 'hls.js';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Download, ArrowLeft, MessageSquare, X, Send, Mail, Phone, CheckCircle2, FileText, MapPin, ExternalLink, Settings, Eye, Table as TableIcon, MoreHorizontal, Star, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DatasetV2 = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [runDetails, setRunDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedLinksItem, setSelectedLinksItem] = useState(null);
  const [linksModalPosition, setLinksModalPosition] = useState({ x: 0, y: 0 });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [videoThumbnails, setVideoThumbnails] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({
    number: true,
    title: true,
    totalScore: true,
    rating: true,
    reviewsCount: true,
    address: true,
    city: true,
    state: true,
    countryCode: true,
    website: true,
    phone: true,
    email: true,
    category: true,
    socialMedia: true,
    url: true,
    actions: true
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  useEffect(() => {
    fetchRunDetails();
    fetchDataset();
  }, [runId, page, limit, searchQuery]);

  useEffect(() => {
    if (selectedLead) {
      fetchChatHistory(selectedLead.id);
    }
  }, [selectedLead]);

  const fetchRunDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRunDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch run details:', error);
    }
  };

  const fetchDataset = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/datasets/${runId}/items`, {
        params: {
          page,
          limit,
          search: searchQuery || undefined
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(response.data.items || []);
      setTotalCount(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
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

  const fetchChatHistory = async (leadId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/leads/${leadId}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      setChatMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedLead) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatLoading(true);

    // Add user message to chat immediately
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }]);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/leads/${selectedLead.id}/chat`,
        {
          message: userMessage,
          lead_data: selectedLead.data
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Validate response data
      if (!response || !response.data || !response.data.response) {
        throw new Error('Invalid response from server');
      }

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to get AI response';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setChatLoading(false);
    }
  };

  const openChat = (item) => {
    setSelectedLead(item);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setSelectedLead(null);
    setChatMessages([]);
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

  const generateTemplate = async (channel) => {
    if (!selectedLead) return;
    
    setChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/leads/${selectedLead.id}/outreach-template?channel=${channel}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Validate response data
      if (!response || !response.data || !response.data.template) {
        throw new Error('Invalid response from server');
      }

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `**${channel.toUpperCase()} Outreach Template:**\n\n${response.data.template}`,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Template generation error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to generate template';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setChatLoading(false);
    }
  };

  const openLinksModal = (item, event) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    
    // Estimate popup dimensions
    const popupWidth = 320;
    const popupHeight = 400; // max height
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate position with smart placement
    let x = buttonRect.left;
    let y = buttonRect.bottom + 5;
    
    // Check if popup goes off bottom - if yes, open above button
    if (y + popupHeight > viewportHeight - 10) {
      y = buttonRect.top - popupHeight - 5; // Open above button
      
      // If still goes off top, position at top of viewport
      if (y < 10) {
        y = 10;
      }
    }
    
    // Check if popup goes off right edge - if yes, align to right
    if (x + popupWidth > viewportWidth - 10) {
      x = buttonRect.right - popupWidth; // Align to right edge of button
      
      // If still goes off left, position at left of viewport
      if (x < 10) {
        x = 10;
      }
    }
    
    setLinksModalPosition({ x, y });
    setSelectedLinksItem(item);
    setShowLinksModal(true);
  };

  const closeLinksModal = () => {
    setShowLinksModal(false);
    setSelectedLinksItem(null);
  };

  const openImageModal = (product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedProduct(null);
    setCurrentImageIndex(0);
  };

  // Combine images and videos into a single media array
  const getAllMedia = (product) => {
    if (!product) return [];
    const media = [];
    
    // Add all images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(img => {
        media.push({ type: 'image', url: img });
      });
    }
    
    // Add all videos
    if (product.videos && Array.isArray(product.videos)) {
      product.videos.forEach(video => {
        media.push({ type: 'video', url: video });
      });
    }
    
    return media;
  };

  const nextImage = () => {
    if (selectedProduct) {
      const allMedia = getAllMedia(selectedProduct);
      setCurrentImageIndex((prev) => 
        prev < allMedia.length - 1 ? prev + 1 : 0
      );
    }
  };

  const previousImage = () => {
    if (selectedProduct) {
      const allMedia = getAllMedia(selectedProduct);
      setCurrentImageIndex((prev) => 
        prev > 0 ? prev - 1 : allMedia.length - 1
      );
    }
  };

  const selectThumbnail = (index) => {
    setCurrentImageIndex(index);
  };

  const getSocialMediaLinks = (socialMedia) => {
    if (!socialMedia) return [];
    return Object.entries(socialMedia).map(([platform, url]) => ({
      platform,
      url
    }));
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on search
  };

  // Helper function to detect if this is an Amazon scraper run
  const isAmazonScraper = () => {
    return runDetails?.actor_name?.toLowerCase().includes('amazon') || false;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🕷️</div>
          <p className="text-gray-600">Loading dataset...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', count: totalCount },
    { id: 'contact', label: 'Contact info' },
    { id: 'social', label: 'Social media' },
    { id: 'rating', label: 'Rating' },
    { id: 'reviews', label: 'Reviews (if any)' },
    { id: 'enrichment', label: 'Leads Enrichment' },
    { id: 'all', label: 'All fields' },
    { id: 'preview', label: 'Preview in new tab', icon: Eye },
    { id: 'table', label: 'Table', icon: TableIcon }
  ];

  return (
    <div className="flex-1 bg-white min-h-screen">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/runs')} className="hover:bg-gray-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Actor
              </Button>
              <div className="border-l h-6"></div>
              <h1 className="text-2xl font-semibold text-blue-600">
                {isAmazonScraper() ? 'Amazon Product Scraper - Run' : 'Google Maps Scraper - Run'}
              </h1>
              <Button variant="ghost" size="icon" className="hover:bg-gray-50">
                <Star className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="hover:bg-gray-50">Actions</Button>
              <Button variant="outline" size="sm" className="hover:bg-gray-50">API</Button>
              <Button variant="outline" size="sm" className="hover:bg-gray-50">Share</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Export</Button>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        <div className="px-6 py-4 bg-green-50 border-b border-green-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-green-800">
                <strong>Scraping finished.</strong> {isAmazonScraper() 
                  ? 'You can view all scraped products with detailed information.' 
                  : 'You can view all scraped places laid out on a map.'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-8 text-sm">
            <div>
              <span className="text-gray-600">RESULTS</span>
              <span className="ml-2 text-blue-600 font-semibold">{totalCount}</span>
            </div>
            <div>
              <span className="text-gray-600">REQUESTS</span>
              <span className="ml-2 text-gray-900 font-semibold">2 of 20 handled</span>
            </div>
            <div>
              <span className="text-gray-600">PRICE</span>
              <span className="ml-2 text-gray-900 font-semibold">$0.207</span>
            </div>
            <div>
              <span className="text-gray-600">STARTED</span>
              <span className="ml-2 text-gray-900">{new Date().toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">DURATION</span>
              <span className="ml-2 text-gray-900">12 s</span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="px-6 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 rounded">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Table settings</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-6">
        <div className="bg-white">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No results found</p>
            </div>
          ) : isAmazonScraper() ? (
            // Amazon Product Table
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Picture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">ASIN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Reviews</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Availability</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">URL</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const product = item.data;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        {/* # */}
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          {(page - 1) * limit + index + 1}
                        </td>
                        
                        {/* Picture */}
                        <td className="px-4 py-4">
                          {product.images && product.images.length > 0 ? (
                            <div className="relative group cursor-pointer" onClick={() => openImageModal(product)}>
                              <img 
                                src={product.images[0]} 
                                alt={product.title}
                                className="w-16 h-16 object-cover rounded border border-gray-200 group-hover:border-blue-500 transition-all"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/64?text=No+Image';
                                }}
                              />
                              {product.images.length > 1 && (
                                <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded-tl">
                                  +{product.images.length - 1}
                                </div>
                              )}
                              {product.videos && product.videos.length > 0 && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-bl">
                                  <Play className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-xs">
                              No image
                            </div>
                          )}
                        </td>
                        
                        {/* Title */}
                        <td className="px-4 py-4 text-sm max-w-xs">
                          <div className="font-medium text-gray-900 line-clamp-2" title={product.title}>
                            {product.title || '-'}
                          </div>
                        </td>
                        
                        {/* ASIN */}
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                            {product.asin || '-'}
                          </code>
                        </td>
                        
                        {/* Brand */}
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {product.brand || product.seller || product.soldBy || '-'}
                        </td>
                        
                        {/* Price */}
                        <td className="px-4 py-4 text-sm">
                          {product.price ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">
                                ${product.price.toFixed(2)}
                              </span>
                              {product.originalPrice && product.originalPrice > product.price && (
                                <>
                                  <span className="text-xs text-gray-500 line-through">
                                    ${product.originalPrice.toFixed(2)}
                                  </span>
                                  {product.discount && product.discount > 0 && (
                                    <span className="text-xs text-green-600">
                                      -{product.discount.toFixed(0)}%
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        
                        {/* Rating */}
                        <td className="px-4 py-4 text-sm">
                          {product.rating ? (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">⭐</span>
                              <span className="font-medium text-gray-900">{product.rating}</span>
                            </div>
                          ) : '-'}
                        </td>
                        
                        {/* Reviews Count */}
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {product.reviewCount ? product.reviewCount.toLocaleString() : '-'}
                        </td>
                        
                        {/* Availability */}
                        <td className="px-4 py-4 text-sm">
                          {product.availability ? (
                            <div className="flex items-center gap-1">
                              {product.availability.toLowerCase().includes('in stock') ? (
                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                  In Stock
                                </span>
                              ) : (
                                <span className="text-gray-600 text-xs">
                                  {product.availability.substring(0, 30)}
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        
                        {/* Category */}
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-xs">
                          <div className="line-clamp-2" title={product.category}>
                            {product.category || '-'}
                          </div>
                        </td>
                        
                        {/* URL */}
                        <td className="px-4 py-4 text-sm">
                          {product.url ? (
                            <a 
                              href={product.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // Google Maps Table (existing code)
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    {visibleColumns.number && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">#</th>
                    )}
                    {visibleColumns.title && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Place name
                      </th>
                    )}
                    {visibleColumns.totalScore && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Total Score
                      </th>
                    )}
                    {visibleColumns.rating && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Rating
                      </th>
                    )}
                    {visibleColumns.reviewsCount && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Reviews
                      </th>
                    )}
                    {visibleColumns.address && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Address
                      </th>
                    )}
                    {visibleColumns.city && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        City
                      </th>
                    )}
                    {visibleColumns.state && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        State
                      </th>
                    )}
                    {visibleColumns.countryCode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Country
                      </th>
                    )}
                    {visibleColumns.website && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Website
                      </th>
                    )}
                    {visibleColumns.phone && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Phone
                      </th>
                    )}
                    {visibleColumns.category && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Category
                      </th>
                    )}
                    {visibleColumns.url && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Map URL
                      </th>
                    )}
                    {visibleColumns.socialMedia && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Social Media
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {visibleColumns.number && (
                        <td className="px-6 py-4 text-sm text-gray-900">{(page - 1) * limit + index + 1}</td>
                      )}
                      {visibleColumns.title && (
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900 max-w-xs truncate" title={item.data.title}>
                            {item.data.title || '-'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.totalScore && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.data.totalScore || '-'}
                        </td>
                      )}
                      {visibleColumns.rating && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.data.rating ? (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">⭐</span>
                              <span className="font-medium">{item.data.rating}</span>
                            </div>
                          ) : '-'}
                        </td>
                      )}
                      {visibleColumns.reviewsCount && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.data.reviewsCount || '0'}
                        </td>
                      )}
                      {visibleColumns.address && (
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={item.data.address}>
                          {item.data.address || '-'}
                        </td>
                      )}
                      {visibleColumns.city && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.data.city || '-'}
                        </td>
                      )}
                      {visibleColumns.state && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.data.state || '-'}
                        </td>
                      )}
                      {visibleColumns.countryCode && (
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                          {item.data.countryCode || '-'}
                        </td>
                      )}
                      {visibleColumns.website && (
                        <td className="px-6 py-4 text-sm">
                          {item.data.website ? (
                            <a 
                              href={item.data.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline max-w-xs truncate block"
                              title={item.data.website}
                            >
                              {item.data.website}
                            </a>
                          ) : (
                            // If no website, show social media links
                            (() => {
                              const socialLinks = [];
                              if (item.data.socialMedia) {
                                const social = item.data.socialMedia;
                                if (social.facebook) socialLinks.push({ name: 'Facebook', url: social.facebook });
                                if (social.instagram) socialLinks.push({ name: 'Instagram', url: social.instagram });
                                if (social.twitter) socialLinks.push({ name: 'Twitter', url: social.twitter });
                                if (social.linkedin) socialLinks.push({ name: 'LinkedIn', url: social.linkedin });
                                if (social.youtube) socialLinks.push({ name: 'YouTube', url: social.youtube });
                                if (social.tiktok) socialLinks.push({ name: 'TikTok', url: social.tiktok });
                              }
                              
                              if (socialLinks.length > 0) {
                                return (
                                  <div className="flex flex-col gap-1">
                                    {socialLinks.slice(0, 2).map((link, idx) => (
                                      <a 
                                        key={idx}
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-xs truncate max-w-xs"
                                        title={`${link.name}: ${link.url}`}
                                      >
                                        {link.name}
                                      </a>
                                    ))}
                                    {socialLinks.length > 2 && (
                                      <span className="text-xs text-gray-500">+{socialLinks.length - 2} more</span>
                                    )}
                                  </div>
                                );
                              }
                              return '-';
                            })()
                          )}
                        </td>
                      )}
                      {visibleColumns.phone && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.data.phone || '-'}
                        </td>
                      )}
                      {visibleColumns.category && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.data.category || '-'}
                        </td>
                      )}
                      {visibleColumns.url && (
                        <td className="px-6 py-4 text-sm">
                          {item.data.url ? (
                            <a 
                              href={item.data.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                              title="View on Google Maps"
                            >
                              View Map
                            </a>
                          ) : '-'}
                        </td>
                      )}
                      {visibleColumns.socialMedia && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {(() => {
                              const allLinks = [];
                              if (item.data.socialMedia) {
                                const social = item.data.socialMedia;
                                if (social.facebook) allLinks.push({ platform: 'Facebook', url: social.facebook, icon: 'f', color: 'blue' });
                                if (social.instagram) allLinks.push({ platform: 'Instagram', url: social.instagram, icon: '📷', color: 'pink' });
                                if (social.twitter) allLinks.push({ platform: 'Twitter', url: social.twitter, icon: '𝕏', color: 'sky' });
                                if (social.linkedin) allLinks.push({ platform: 'LinkedIn', url: social.linkedin, icon: 'in', color: 'blue' });
                                if (social.youtube) allLinks.push({ platform: 'YouTube', url: social.youtube, icon: '▶', color: 'red' });
                                if (social.tiktok) allLinks.push({ platform: 'TikTok', url: social.tiktok, icon: '🎵', color: 'black' });
                              }
                              
                              const visibleLinks = allLinks.slice(0, 5);
                              const hasMore = allLinks.length > 5;
                              
                              if (allLinks.length === 0) return <span className="text-gray-400 text-xs">-</span>;
                              
                              return (
                                <>
                                  {visibleLinks.map((link, idx) => (
                                    <a
                                      key={idx}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full bg-${link.color}-100 hover:bg-${link.color}-200 transition-colors`}
                                      title={link.platform}
                                    >
                                      <span className={`text-xs font-bold text-${link.color}-600`}>{link.icon}</span>
                                    </a>
                                  ))}
                                  {hasMore && (
                                    <button
                                      onClick={(e) => openLinksModal(item, e)}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                      title={`+${allLinks.length - 5} more`}
                                    >
                                      <MoreHorizontal className="w-4 h-4 text-gray-600" />
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4">
                          <Button
                            size="sm"
                            onClick={() => openChat(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            AI Chat
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 0 && items.length > 0 && (
            <div className="border-t border-gray-200 bg-white px-6 py-4 mt-4">
              <div className="flex items-center justify-between">
                {/* Items per page */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value));
                      setPage(1);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-gray-400"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Go to page:</span>
                    <Input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={goToPageInput}
                      onChange={(e) => setGoToPageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const pageNum = parseInt(goToPageInput);
                          if (pageNum >= 1 && pageNum <= totalPages) {
                            setPage(pageNum);
                            setGoToPageInput('');
                          }
                        }
                      }}
                      className="w-16 h-8 text-sm border-gray-300 text-center focus:border-gray-400 focus:ring-0"
                      placeholder={page.toString()}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const pageNum = parseInt(goToPageInput);
                        if (pageNum >= 1 && pageNum <= totalPages) {
                          setPage(pageNum);
                          setGoToPageInput('');
                        }
                      }}
                      className="h-8 px-3 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                    >
                      Go
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="px-3 py-1 text-sm font-medium text-gray-700">
                      {page}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notion-style Contextual Links Popup */}
      {showLinksModal && selectedLinksItem && (
        <>
          {/* Transparent overlay to close on click outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeLinksModal}
          />
          
          {/* Contextual popup at click position */}
          <div 
            className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
            style={{
              left: `${linksModalPosition.x}px`,
              top: `${linksModalPosition.y}px`,
              minWidth: '320px',
              maxWidth: '400px',
              maxHeight: '400px'
            }}
          >
            {/* Header with business name */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="font-semibold text-gray-900 text-sm truncate">
                {selectedLinksItem.data.title}
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                All social links
              </div>
            </div>
            
            {/* Links list - scrollable */}
            <div className="overflow-y-auto max-h-[320px]">
              <div className="py-1">
                {/* Social Media Links */}
                {selectedLinksItem.data.socialMedia && Object.entries(selectedLinksItem.data.socialMedia).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 hover:bg-gray-100 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 flex-shrink-0 ${
                      platform === 'facebook' ? 'bg-blue-50 group-hover:bg-blue-100' :
                      platform === 'instagram' ? 'bg-pink-50 group-hover:bg-pink-100' :
                      platform === 'twitter' ? 'bg-sky-50 group-hover:bg-sky-100' :
                      platform === 'linkedin' ? 'bg-blue-50 group-hover:bg-blue-100' :
                      platform === 'youtube' ? 'bg-red-50 group-hover:bg-red-100' :
                      platform === 'tiktok' ? 'bg-gray-100 group-hover:bg-gray-200' : 'bg-gray-50 group-hover:bg-gray-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        platform === 'facebook' ? 'text-blue-600' :
                        platform === 'instagram' ? 'text-pink-600' :
                        platform === 'twitter' ? 'text-sky-600' :
                        platform === 'linkedin' ? 'text-blue-700' :
                        platform === 'youtube' ? 'text-red-600' :
                        platform === 'tiktok' ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {platform === 'facebook' ? 'f' :
                         platform === 'instagram' ? '📷' :
                         platform === 'twitter' ? '𝕏' :
                         platform === 'linkedin' ? 'in' :
                         platform === 'youtube' ? '▶' :
                         platform === 'tiktok' ? '🎵' : ''}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {platform}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {url.length > 40 ? url.substring(0, 40) + '...' : url}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
                
                {/* Website Link */}
                {selectedLinksItem.data.website && (
                  <a
                    href={selectedLinksItem.data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 hover:bg-gray-100 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">Website</div>
                      <div className="text-xs text-gray-500 truncate">
                        {selectedLinksItem.data.website.length > 40 
                          ? selectedLinksItem.data.website.substring(0, 40) + '...' 
                          : selectedLinksItem.data.website}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                
                {/* Google Maps Link */}
                {selectedLinksItem.data.url && (
                  <a
                    href={selectedLinksItem.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 hover:bg-gray-100 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded bg-red-50 group-hover:bg-red-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <MapPin className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">Google Maps</div>
                      <div className="text-xs text-gray-500">View on map</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Amazon Product Image Modal - Compact Style like Social Links */}
      {showImageModal && selectedProduct && (
        <>
          {/* Transparent overlay to close on click outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeImageModal}
          />
          
          {/* Compact image popup */}
          <div 
            className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '380px',
              maxWidth: '90vw',
              maxHeight: '85vh'
            }}
          >
            {/* Header with product name */}
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-xs truncate">
                  {selectedProduct.title}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {currentImageIndex + 1} / {getAllMedia(selectedProduct).length}
                  {getAllMedia(selectedProduct)[currentImageIndex]?.type === 'video' && (
                    <span className="ml-1 text-red-600 font-semibold">• VIDEO</span>
                  )}
                </div>
              </div>
              <button 
                onClick={closeImageModal}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Main Media Display with Navigation */}
            <div className="relative bg-gray-50">
              <div className="flex items-center justify-center p-3" style={{ height: '280px' }}>
                {(() => {
                  const allMedia = getAllMedia(selectedProduct);
                  const currentMedia = allMedia[currentImageIndex];
                  
                  if (!currentMedia) {
                    return (
                      <div className="text-gray-400 text-center">
                        <div className="text-3xl mb-2">📦</div>
                        <p className="text-xs">No media</p>
                      </div>
                    );
                  }
                  
                  if (currentMedia.type === 'video') {
                    const videoUrl = currentMedia.url;
                    const isHLS = videoUrl.includes('.m3u8');
                    console.log('[VIDEO PLAYER] Loading video:', videoUrl, 'HLS:', isHLS);
                    
                    return (
                      <HLSVideoPlayer 
                        videoUrl={videoUrl} 
                        isHLS={isHLS}
                      />
                    );
                  }
                  
                  return (
                    <img
                      src={currentMedia.url}
                      alt={`Product ${currentImageIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/250?text=No+Image';
                      }}
                    />
                  );
                })()}
              </div>

              {/* Previous Button */}
              {getAllMedia(selectedProduct).length > 1 && (
                <button
                  onClick={previousImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-1.5 shadow-md transition-all z-10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Next Button */}
              {getAllMedia(selectedProduct).length > 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-1.5 shadow-md transition-all z-10"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Media Type Indicator */}
              {getAllMedia(selectedProduct)[currentImageIndex]?.type === 'video' && (
                <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 shadow-md">
                  <Play className="w-3 h-3" />
                  Playing Video
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery - Combined Images and Videos */}
            {getAllMedia(selectedProduct).length > 1 && (
              <div className="px-3 py-2 border-t border-gray-200 bg-white overflow-y-auto" style={{ maxHeight: '120px' }}>
                <div className="flex gap-1.5 flex-wrap">
                  {getAllMedia(selectedProduct).map((media, index) => (
                    <button
                      key={index}
                      onClick={() => selectThumbnail(index)}
                      className={`relative flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                        index === currentImageIndex
                          ? 'border-blue-500 ring-1 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {media.type === 'video' ? (
                        <div className="w-full h-full relative">
                          {/* Use video element with poster to show thumbnail */}
                          <video
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                            playsInline
                            onLoadedData={(e) => {
                              // Seek to 1 second to get a better thumbnail
                              e.target.currentTime = 1;
                            }}
                          >
                            <source src={`${media.url}#t=1`} type="video/mp4" />
                          </video>
                          {/* Overlay with play icon */}
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center pointer-events-none">
                            <Play className="w-6 h-6 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={media.url}
                          alt={`${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/48?text=?';
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Info Footer */}
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-xs mb-2">
                {selectedProduct.brand && (
                  <span className="text-gray-600 truncate flex-1 mr-2">
                    {selectedProduct.brand}
                  </span>
                )}
                {selectedProduct.price && (
                  <span className="text-green-600 font-semibold whitespace-nowrap">
                    ${selectedProduct.price.toFixed(2)}
                  </span>
                )}
              </div>
              {selectedProduct.rating && (
                <div className="flex items-center gap-1 text-xs mb-2">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-medium">{selectedProduct.rating}</span>
                  {selectedProduct.reviewCount && (
                    <span className="text-gray-500">
                      ({selectedProduct.reviewCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
              {selectedProduct.url && (
                <a
                  href={selectedProduct.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-xs font-medium transition-colors"
                >
                  View on Amazon
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {/* Column Settings Modal */}
      {showColumnSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Table Settings</h3>
              <button onClick={() => setShowColumnSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">Select columns to display in the table:</p>
              <div className="space-y-2">
                {Object.entries({
                  number: '#',
                  title: 'Place name',
                  totalScore: 'Total Score',
                  reviewsCount: 'Reviews Count',
                  address: 'Street',
                  city: 'City',
                  state: 'State',
                  countryCode: 'Country Code',
                  website: 'Website',
                  phone: 'Phone',
                  category: 'Category Name',
                  url: 'URL',
                  socialMedia: 'Social Media',
                  actions: 'Actions'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setVisibleColumns({
                    number: true,
                    title: true,
                    totalScore: true,
                    rating: true,
                    reviewsCount: true,
                    address: true,
                    city: true,
                    state: true,
                    countryCode: true,
                    website: true,
                    phone: true,
                    email: true,
                    category: true,
                    socialMedia: true,
                    url: true,
                    actions: true
                  });
                }}
              >
                Reset
              </Button>
              <Button onClick={() => setShowColumnSettings(false)} className="bg-blue-600 hover:bg-blue-700">
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Sidebar */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-1/3 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">AI Engagement Assistant</h3>
              <p className="text-sm opacity-90">{selectedLead?.data.title}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={closeChat} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="px-6 py-3 bg-gray-50 border-b flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => generateTemplate('email')} className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Email Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => generateTemplate('phone')} className="text-xs">
              <Phone className="w-3 h-3 mr-1" />
              Call Script
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ask me anything about engaging with this lead!</p>
                <p className="text-xs text-gray-400 mt-2">Try: "How should I approach this business?"</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-sm prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-li:text-gray-900 prose-ul:text-gray-900 prose-ol:text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex space-x-2">
              <Input
                placeholder="Ask for engagement advice..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !chatLoading && handleSendMessage()}
                className="flex-1"
                disabled={chatLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatasetV2;
