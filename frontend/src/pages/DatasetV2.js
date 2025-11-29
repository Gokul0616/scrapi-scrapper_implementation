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

// Custom Video Player Component with Controls
const CustomVideoPlayer = ({ videoUrl, isHLS }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const controlsTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize video (HLS or standard)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isHLS) {
      console.log('[HLS PLAYER] Initializing HLS for:', videoUrl);
      
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[HLS PLAYER] Manifest parsed successfully');
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[HLS PLAYER] Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('[HLS PLAYER] Fatal network error, trying to recover');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('[HLS PLAYER] Fatal media error, trying to recover');
                hls.recoverMediaError();
                break;
              default:
                console.log('[HLS PLAYER] Cannot recover from error, destroying HLS');
                hls.destroy();
                break;
            }
          }
        });
        
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[HLS PLAYER] Using native HLS support');
        video.src = videoUrl;
      }
    } else {
      video.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, isHLS]);

  // Update time and buffer progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(0) / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('progress', handleProgress);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
        style={{ maxHeight: isFullscreen ? '100vh' : '250px' }}
      >
        {!isHLS && (
          <>
            <source src={videoUrl} type="video/mp4" />
            <source src={videoUrl} type="video/webm" />
            <source src={videoUrl} type="video/ogg" />
          </>
        )}
      </video>

      {/* Custom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-3">
          <div 
            className="relative h-1 bg-gray-600 rounded-full cursor-pointer hover:h-2 transition-all"
            onClick={handleSeek}
          >
            {/* Buffered */}
            <div 
              className="absolute h-full bg-gray-500 rounded-full"
              style={{ width: `${buffered}%` }}
            />
            {/* Current Progress */}
            <div 
              className="absolute h-full bg-red-600 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-3 text-white">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="hover:text-red-500 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Time */}
          <div className="text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={toggleMute} className="hover:text-red-500 transition-colors">
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`
              }}
            />
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="hover:text-red-500 transition-colors"
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [visibleColumns, setVisibleColumns] = useState({});
  const [allColumns, setAllColumns] = useState([]);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // Detect all available columns from data
  useEffect(() => {
    if (items.length > 0) {
      const detectedColumns = new Set();
      
      // Scan first 10 items to detect all possible fields
      items.slice(0, 10).forEach(item => {
        if (item.data) {
          Object.keys(item.data).forEach(key => {
            detectedColumns.add(key);
          });
        }
      });
      
      const columnsArray = Array.from(detectedColumns).sort();
      setAllColumns(columnsArray);
      
      // Initialize visible columns (all visible by default)
      if (Object.keys(visibleColumns).length === 0) {
        const initialVisibility = { number: true, actions: true };
        columnsArray.forEach(col => {
          initialVisibility[col] = true;
        });
        setVisibleColumns(initialVisibility);
      }
    }
  }, [items]);

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

  // Get social media icon component
  const getSocialIcon = (platform) => {
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('facebook')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    } else if (platformLower.includes('instagram')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    } else if (platformLower.includes('twitter') || platformLower.includes('x.com')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    } else if (platformLower.includes('linkedin')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    } else if (platformLower.includes('youtube')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    } else if (platformLower.includes('tiktok')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      );
    } else {
      return <ExternalLink className="w-4 h-4" />;
    }
  };

  // Render social media icons
  const renderSocialMediaIcons = (socialMedia, item, event) => {
    const links = getSocialMediaLinks(socialMedia);
    if (links.length === 0) return '-';
    
    const maxVisible = 6;
    const visibleLinks = links.slice(0, maxVisible);
    const hasMore = links.length > maxVisible;
    
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {visibleLinks.map((link, idx) => {
          const platformColors = {
            facebook: 'text-blue-600 hover:text-blue-700',
            instagram: 'text-pink-600 hover:text-pink-700',
            twitter: 'text-sky-600 hover:text-sky-700',
            x: 'text-black hover:text-gray-800',
            linkedin: 'text-blue-700 hover:text-blue-800',
            youtube: 'text-red-600 hover:text-red-700',
            tiktok: 'text-black hover:text-gray-800'
          };
          
          const platformLower = link.platform.toLowerCase();
          let colorClass = 'text-gray-600 hover:text-gray-800';
          
          Object.keys(platformColors).forEach(key => {
            if (platformLower.includes(key)) {
              colorClass = platformColors[key];
            }
          });
          
          return (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${colorClass} transition-colors p-1 rounded hover:bg-gray-100`}
              title={link.platform}
              onClick={(e) => e.stopPropagation()}
            >
              {getSocialIcon(link.platform)}
            </a>
          );
        })}
        {hasMore && (
          <button
            onClick={(e) => openLinksModal(item, e)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <MoreHorizontal className="w-3 h-3" />
            <span>+{links.length - maxVisible}</span>
          </button>
        )}
      </div>
    );
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on search
  };

  // Helper function to detect if this is an Amazon scraper run
  const isAmazonScraper = () => {
    return runDetails?.actor_name?.toLowerCase().includes('amazon') || false;
  };
  
  // Helper function to format column names
  const formatColumnName = (key) => {
    // Convert camelCase or snake_case to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };
  
  // Helper function to render cell value dynamically
  const renderCellValue = (value, key, item) => {
    // Handle null or undefined
    if (value === null || value === undefined) return '-';
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';
      if (key === 'images' && value.length > 0) {
        return (
          <div className="flex gap-1">
            {value.slice(0, 3).map((img, idx) => (
              <img key={idx} src={img} alt="" className="w-8 h-8 rounded object-cover" />
            ))}
            {value.length > 3 && <span className="text-xs text-gray-500">+{value.length - 3}</span>}
          </div>
        );
      }
      return value.join(', ');
    }
    
    // Handle objects (like socialMedia)
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) return '-';
      if (key === 'socialMedia') {
        // Don't render here, will be handled by special case in table
        return null;
      }
      return JSON.stringify(value);
    }
    
    // Handle URLs
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" 
           className="text-blue-600 hover:text-blue-800 truncate max-w-xs block">
          {value.length > 50 ? value.substring(0, 50) + '...' : value}
        </a>
      );
    }
    
    // Handle boolean
    if (typeof value === 'boolean') {
      return value ? <span className="text-green-600">✓</span> : <span className="text-gray-400">✗</span>;
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    // Handle strings
    if (typeof value === 'string') {
      // If it's too long, truncate
      if (value.length > 100) {
        return (
          <span title={value}>
            {value.substring(0, 100)}...
          </span>
        );
      }
      return value;
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white min-h-screen">
        <div className="text-center">
          <img src="/logo.png" alt="Scrapi Logo" className="w-16 h-16 mx-auto mb-4" />
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

  // Get filtered columns based on active tab
  const getVisibleColumnsByTab = () => {
    if (isAmazonScraper()) return allColumns;
    
    switch(activeTab) {
      case 'contact':
        return ['title', 'address', 'city', 'state', 'countryCode', 'phone', 'email', 'website'];
      case 'social':
        return ['title', 'socialMedia', 'website'];
      case 'rating':
        return ['title', 'rating', 'reviewsCount', 'totalScore'];
      case 'reviews':
        return ['title', 'rating', 'reviewsCount', 'reviews'];
      case 'enrichment':
        return ['title', 'email', 'emailVerified', 'phone', 'phoneVerified', 'website'];
      case 'all':
        return allColumns;
      case 'overview':
      default:
        return allColumns;
    }
  };

  // Define standard column order for Google Maps data
  const getOrderedColumns = () => {
    if (isAmazonScraper()) return allColumns;
    
    const standardOrder = [
      'title',
      'address', 
      'city',
      'state',
      'countryCode',
      'phone',
      'phoneVerified',
      'email',
      'emailVerified',
      'website',
      'rating',
      'reviewsCount',
      'totalScore',
      'category',
      'url',
      'socialMedia',
      'reviews',
      'location',
      'placeId',
      'cid'
    ];
    
    const visibleCols = getVisibleColumnsByTab();
    const ordered = [];
    
    // Add columns in standard order if they exist and are visible
    standardOrder.forEach(col => {
      if (allColumns.includes(col) && visibleCols.includes(col)) {
        ordered.push(col);
      }
    });
    
    // Add any remaining columns not in standard order
    allColumns.forEach(col => {
      if (!ordered.includes(col) && visibleCols.includes(col)) {
        ordered.push(col);
      }
    });
    
    return ordered;
  };

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
            // Dynamic Table - Auto-detects all columns from data with proper ordering
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide sticky left-0 bg-white z-10">#</th>
                    {getOrderedColumns().map(colKey => (
                      <th key={colKey} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {formatColumnName(colKey)}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide sticky right-0 bg-white z-10">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {items.map((item, index) => {
                    const orderedCols = getOrderedColumns();
                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium sticky left-0 bg-white">
                          {(page - 1) * limit + index + 1}
                        </td>
                        {orderedCols.map(colKey => {
                          const value = item.data[colKey];
                          
                          // Special rendering for social media
                          if (colKey === 'socialMedia' && value && typeof value === 'object') {
                            return (
                              <td key={colKey} className="px-6 py-4 text-sm text-gray-700">
                                {renderSocialMediaIcons(value, item)}
                              </td>
                            );
                          }
                          
                          // Special rendering for title (primary column - bold)
                          if (colKey === 'title') {
                            return (
                              <td key={colKey} className="px-6 py-4 text-sm">
                                <div className="font-semibold text-gray-900 max-w-xs">
                                  {value || '-'}
                                </div>
                              </td>
                            );
                          }
                          
                          // Special rendering for phone with icon
                          if (colKey === 'phone' && value) {
                            return (
                              <td key={colKey} className="px-6 py-4 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  <span>{value}</span>
                                  {item.data.phoneVerified && (
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                              </td>
                            );
                          }
                          
                          // Special rendering for email with icon
                          if (colKey === 'email' && value) {
                            return (
                              <td key={colKey} className="px-6 py-4 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3 h-3 text-gray-400" />
                                  <span>{value}</span>
                                  {item.data.emailVerified && (
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                              </td>
                            );
                          }
                          
                          // Special rendering for website with icon
                          if (colKey === 'website' && value) {
                            return (
                              <td key={colKey} className="px-6 py-4 text-sm">
                                <a 
                                  href={value} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="truncate max-w-[150px]">
                                    {value.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                  </span>
                                </a>
                              </td>
                            );
                          }
                          
                          // Special rendering for Google Maps URL with map icon
                          if (colKey === 'url' && value) {
                            return (
                              <td key={colKey} className="px-6 py-4 text-sm">
                                <a 
                                  href={value} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                >
                                  <MapPin className="w-3 h-3" />
                                  <span>Maps</span>
                                </a>
                              </td>
                            );
                          }
                          
                          // Special rendering for rating with stars
                          if (colKey === 'rating' && value) {
                            return (
                              <td key={colKey} className="px-6 py-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <span className="text-yellow-500">⭐</span>
                                  <span className="font-medium text-gray-900">{value}</span>
                                </div>
                              </td>
                            );
                          }
                          
                          // Default rendering for other columns
                          return (
                            <td key={colKey} className="px-6 py-4 text-sm text-gray-700">
                              <div className="max-w-xs">
                                {renderCellValue(value, colKey, item)}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 sticky right-0 bg-white">
                          <Button
                            size="sm"
                            onClick={() => openChat(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs whitespace-nowrap"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            AI Chat
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
                {selectedLinksItem.data.socialMedia && Object.entries(selectedLinksItem.data.socialMedia).map(([platform, url]) => {
                  const platformLower = platform.toLowerCase();
                  let bgClass = 'bg-gray-50 group-hover:bg-gray-100';
                  let iconColorClass = 'text-gray-600';
                  
                  if (platformLower.includes('facebook')) {
                    bgClass = 'bg-blue-50 group-hover:bg-blue-100';
                    iconColorClass = 'text-blue-600';
                  } else if (platformLower.includes('instagram')) {
                    bgClass = 'bg-pink-50 group-hover:bg-pink-100';
                    iconColorClass = 'text-pink-600';
                  } else if (platformLower.includes('twitter') || platformLower.includes('x.com')) {
                    bgClass = 'bg-sky-50 group-hover:bg-sky-100';
                    iconColorClass = 'text-sky-600';
                  } else if (platformLower.includes('linkedin')) {
                    bgClass = 'bg-blue-50 group-hover:bg-blue-100';
                    iconColorClass = 'text-blue-700';
                  } else if (platformLower.includes('youtube')) {
                    bgClass = 'bg-red-50 group-hover:bg-red-100';
                    iconColorClass = 'text-red-600';
                  } else if (platformLower.includes('tiktok')) {
                    bgClass = 'bg-gray-100 group-hover:bg-gray-200';
                    iconColorClass = 'text-gray-900';
                  }
                  
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-2 hover:bg-gray-100 transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 flex-shrink-0 ${bgClass}`}>
                        <div className={iconColorClass}>
                          {getSocialIcon(platform)}
                        </div>
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
                  );
                })}
                
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
                      <CustomVideoPlayer 
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

              {/* Media Type Indicator - Removed */}
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
                        <div className="w-full h-full relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900">
                          {/* Video thumbnail - try to show first frame */}
                          {!media.url.includes('.m3u8') ? (
                            <video
                              className="w-full h-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                              src={`${media.url}#t=0.1`}
                              onLoadedData={(e) => {
                                e.target.currentTime = 0.5;
                              }}
                              style={{ backgroundColor: '#000' }}
                            />
                          ) : (
                            // HLS videos - show gradient background
                            <div className="w-full h-full bg-gradient-to-br from-red-900 via-red-800 to-red-900" />
                          )}
                          {/* Play icon overlay - always visible for videos */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black bg-opacity-50 rounded-full p-1.5">
                              <Play className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Regular image - no play icon
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
                {/* Fixed columns */}
                <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.number}
                    onChange={(e) => setVisibleColumns(prev => ({ ...prev, number: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 font-medium">#</span>
                </label>
                
                {/* Dynamic columns from data */}
                {allColumns.map(colKey => (
                  <label key={colKey} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[colKey]}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [colKey]: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{formatColumnName(colKey)}</span>
                  </label>
                ))}
                
                {/* Actions column */}
                <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.actions}
                    onChange={(e) => setVisibleColumns(prev => ({ ...prev, actions: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 font-medium">Actions</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  // Reset all columns to visible
                  const resetColumns = { number: true, actions: true };
                  allColumns.forEach(col => {
                    resetColumns[col] = true;
                  });
                  setVisibleColumns(resetColumns);
                }}
              >
                Show All
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
