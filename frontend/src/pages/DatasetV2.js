import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Hls from 'hls.js';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import LoadingScreen from '../components/LoadingScreen'; // Added this import
import { Search, Download, ArrowLeft, MessageSquare, X, Send, Mail, Phone, CheckCircle2, Check, FileText, MapPin, ExternalLink, Settings, Eye, Table as TableIcon, MoreHorizontal, Star, ChevronLeft, ChevronRight, Play, Clock, ChevronDown } from 'lucide-react';
import ErrorDisplay, { showError } from '../components/ErrorDisplay';
import Checkbox from '../components/ui/CustomCheckbox';
import DataTable from '../components/ui/DataTable';
import { useTheme } from '../contexts/ThemeContext';
// TooltipProvider removed as CustomTooltip uses a portal
import { cn } from '../lib/utils';
import CustomTooltip from '../components/CustomTooltip';
import { Play as PlayIcon, Columns } from 'lucide-react';

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
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });

        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[HLS PLAYER] Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
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
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent ${isFullscreen ? 'p-6' : 'p-2.5'} transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
          }`}
      >
        {/* Progress Bar */}
        <div className={`${isFullscreen ? 'mb-4' : 'mb-2'} px-0.5`}>
          <div
            className={`relative ${isFullscreen ? 'h-1.5' : 'h-1'} bg-gray-600/50 rounded-full cursor-pointer hover:${isFullscreen ? 'h-2' : 'h-1.5'} transition-all`}
            onClick={handleSeek}
          >
            {/* Buffered */}
            <div
              className="absolute h-full bg-gray-500/50 rounded-full"
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
        <div className={`flex items-center ${isFullscreen ? 'gap-4' : 'gap-2'} text-white`}>
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="hover:text-red-500 transition-colors"
          >
            {isPlaying ? (
              <svg className={`${isFullscreen ? 'w-8 h-8' : 'w-5 h-5 shadow-sm'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className={`${isFullscreen ? 'w-8 h-8' : 'w-5 h-5 shadow-sm'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Time */}
          <div className={`${isFullscreen ? 'text-sm' : 'text-[11px]'} font-mono font-bold tracking-tight opacity-90`}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Volume */}
          <div className={`flex items-center ${isFullscreen ? 'gap-2.5' : 'gap-1.5'} ml-auto`}>
            <button onClick={toggleMute} className="hover:text-red-500 transition-colors">
              {isMuted || volume === 0 ? (
                <svg className={`${isFullscreen ? 'w-6 h-6' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className={`${isFullscreen ? 'w-6 h-6' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
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
              className={`${isFullscreen ? 'w-24' : 'w-12'} h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer`}
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
              <svg className={`${isFullscreen ? 'w-6 h-6' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              </svg>
            ) : (
              <svg className={`${isFullscreen ? 'w-6 h-6' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Component for JSON Preview
const JsonPreview = ({ data, label, color = "blue" }) => {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20",
    green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/20",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/20",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/20",
    gray: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/10 border-gray-100 dark:border-gray-500/20 hover:bg-gray-100 dark:hover:bg-gray-500/20",
  };

  return (
    <CustomTooltip
      content={
        <div className="p-0 overflow-hidden">
          <div className="bg-muted/50 px-3 py-1.5 border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between">
            <span>{label || 'JSON Preview'}</span>
            <span className="font-mono opacity-50">.json</span>
          </div>
          <div className="p-2 max-h-80 overflow-auto scrollbar-thin scrollbar-thumb-zinc-500">
            <pre className="text-[10px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      }
    >
      <div className={cn("flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border  transition-all shadow-sm max-w-full",
        colorClasses[color] || colorClasses.blue)}>
        <span className="font-mono text-[9px] opacity-60 flex-shrink-0">{'{ }'}</span>
        <span className="truncate max-w-[150px] font-bold tracking-tight">{label || 'View Data'}</span>
      </div>
    </CustomTooltip>
  );
};

// Recursive JSON Tree Node for Browser Console-like expansion
const JsonTreeNode = ({ data, label, isLast = true, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const isObject = typeof data === 'object' && data !== null;
  const isArray = Array.isArray(data);
  const isCollapsible = isObject || isArray;

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const renderValue = (val) => {
    if (typeof val === 'string') {
      const isUrl = val.startsWith('http') || val.includes('www.');
      return (
        <span className={cn("text-[#a31515] dark:text-[#ce9178] break-all", isUrl && "underline hover:text-red-800 cursor-pointer")}>
          "{val}"
        </span>
      );
    }
    if (typeof val === 'number') return <span className="text-[#098658] dark:text-[#b5cea8]">{val}</span>;
    if (typeof val === 'boolean') return <span className="text-[#0000ff] dark:text-[#569cd6] font-bold">{String(val)}</span>;
    if (val === null) return <span className="text-[#0000ff] dark:text-[#569cd6] font-bold">null</span>;
    return <span className="text-foreground">{String(val)}</span>;
  };

  if (!isCollapsible) {
    return (
      <div className="pl-4 group/json-line hover:bg-blue-50/30 dark:hover:bg-blue-900/5 rounded transition-colors select-text">
        {label && (
          <>
            <span className="text-[#0000ff] dark:text-[#9cdcfe]">"{label}"</span>
            <span className="text-foreground">: </span>
          </>
        )}
        {renderValue(data)}
        {!isLast && <span className="text-foreground">,</span>}
      </div>
    );
  }

  const keys = isArray ? data : Object.keys(data);
  const openBrace = isArray ? '[' : '{';
  const closeBrace = isArray ? ']' : '}';

  return (
    <div className="pl-4">
      <div
        className="flex items-center cursor-pointer group/json-header select-none hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded -ml-4 pl-1"
        onClick={toggleExpand}
      >
        <span className={cn(
          "w-4 flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-[10px] transition-transform duration-150",
          isExpanded ? 'rotate-90' : 'rotate-0'
        )}>
          ▶
        </span>
        {label && (
          <div className="mr-1">
            <span className="text-[#0000ff] dark:text-[#9cdcfe]">"{label}"</span>
            <span className="text-foreground">: </span>
          </div>
        )}
        <span className="text-[#008080] dark:text-[#4ec9b0] font-bold">{openBrace}</span>
        {!isExpanded && (
          <>
            <span className="text-muted-foreground/50 text-[11px] px-1 font-sans font-bold">
              {isArray ? ` ... ${data.length} items ` : ` ... ${keys.length} props `}
            </span>
            <span className="text-[#008080] dark:text-[#4ec9b0] font-bold">{closeBrace}</span>
            {!isLast && <span className="text-foreground">,</span>}
          </>
        )}
      </div>

      {isExpanded && (
        <div className="border-l border-zinc-200 dark:border-zinc-800 ml-[7px] transition-all">
          {isArray ? (
            data.map((item, idx) => (
              <JsonTreeNode key={idx} data={item} isLast={idx === data.length - 1} depth={depth + 1} />
            ))
          ) : (
            Object.entries(data).map(([key, val], idx, arr) => (
              <JsonTreeNode key={key} data={val} label={key} isLast={idx === arr.length - 1} depth={depth + 1} />
            ))
          )}
          <div className="flex items-center -ml-[7px]">
            <span className="w-4" />
            <span className="text-[#008080] dark:text-[#4ec9b0] font-bold">{closeBrace}</span>
            {!isLast && <span className="text-foreground">,</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const DatasetV2 = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
  const [imageModalPosition, setImageModalPosition] = useState({ x: 0, y: 0 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [videoThumbnails, setVideoThumbnails] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({});
  const [allColumns, setAllColumns] = useState([]);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState('output');
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'json'
  const [logLines, setLogLines] = useState([]);
  const [copied, setCopied] = useState(false);
  const copyLogs = () => {
    const text = logLines.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [isLogStreaming, setIsLogStreaming] = useState(false);
  const logContainerRef = useRef(null);

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

      // If run not found (404), navigate to not-found page
      if (error.response && error.response.status === 404) {
        navigate('/not-found');
      }
    }
  };

  // Phase 6: Server-Sent Events (SSE) Log Stream
  useEffect(() => {
    if (activeTopTab !== 'log' || !runId) return;

    const token = localStorage.getItem('token');
    const eventSource = new EventSource(`${API}/runs/${runId}/logs/stream?token=${token}`);

    setIsLogStreaming(true);

    eventSource.onmessage = (event) => {
      setLogLines(prev => [...prev, event.data]);
    };

    eventSource.addEventListener('end', (event) => {
      setIsLogStreaming(false);
      eventSource.close();
    });

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsLogStreaming(false);
      eventSource.close();
    };

    return () => {
      setIsLogStreaming(false);
      eventSource.close();
    };
  }, [activeTopTab, runId]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logLines]);

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

      // If dataset not found (404), navigate to not-found page
      if (error.response && error.response.status === 404) {
        navigate('/not-found');
        return;
      }

      showError('Failed to load dataset', { type: 'error', title: 'Error' });
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

      showError(`Dataset exported as ${format.toUpperCase()}`, { type: 'success', title: 'Export successful' });
    } catch (error) {
      console.error('Failed to export dataset:', error);
      showError('Failed to export dataset', { type: 'error', title: 'Export failed' });
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
    } finally {
      setChatLoading(false);
    }
  };

  const openLinksModal = (item, event) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();

    // Estimate popup dimensions
    const popupWidth = 280;
    const popupHeight = 300; // max height

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position with smart placement
    let x = buttonRect.left;
    let y = buttonRect.bottom + 5;

    // Check if popup goes off bottom - if yes, open above button
    if (y + popupHeight > viewportHeight - 20) {
      y = buttonRect.top - popupHeight - 5;
    }

    // Final boundary checks
    if (y < 10) y = 10;
    if (y + popupHeight > viewportHeight - 10) y = 10;

    // Check if popup goes off right edge
    if (x + popupWidth > viewportWidth - 10) {
      x = viewportWidth - popupWidth - 10;
    }
    if (x < 10) x = 10;

    setLinksModalPosition({ x, y });
    setSelectedLinksItem(item);
    setShowLinksModal(true);
  };

  const closeLinksModal = () => {
    setShowLinksModal(false);
    setSelectedLinksItem(null);
  };

  const openImageModal = (product, event) => {
    if (event) {
      event.stopPropagation();
      const buttonRect = event.currentTarget.getBoundingClientRect();

      // Estimate popup dimensions
      const popupWidth = 310;
      const popupHeight = 460; // More realistic estimate with thumbnails and footer

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate position with smart placement
      let x = buttonRect.left;
      let y = buttonRect.bottom + 5;

      // Check if popup goes off bottom - if yes, open above button
      if (y + popupHeight > viewportHeight - 20) {
        y = buttonRect.top - popupHeight - 5;
      }

      // Final boundary checks to ensure it's always visible within the 10px viewport margin
      if (y < 10) y = 10;
      if (y + popupHeight > viewportHeight - 10) {
        // If still too tall, let it be at the top and it will scroll due to maxHeight: 85vh
        y = 10;
      }

      // Check if popup goes off right edge
      if (x + popupWidth > viewportWidth - 10) {
        x = viewportWidth - popupWidth - 10;
      }
      if (x < 10) x = 10;

      setImageModalPosition({ x, y });
    } else {
      // Fallback to center if no event (though shouldn't happen)
      setImageModalPosition({ x: window.innerWidth / 2 - 190, y: window.innerHeight / 2 - 225 });
    }

    setSelectedProduct(product);
    setCurrentImageIndex(0);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedProduct(null);
    setCurrentImageIndex(0);
  };

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showImageModal) {
          closeImageModal();
        } else if (showLinksModal) {
          closeLinksModal();
        }
      }
    };

    if (showLinksModal || showImageModal) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showLinksModal, showImageModal]);

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
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    } else if (platformLower.includes('instagram')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    } else if (platformLower.includes('twitter') || platformLower.includes('x.com')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    } else if (platformLower.includes('linkedin')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    } else if (platformLower.includes('youtube')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    } else if (platformLower.includes('tiktok')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
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

  // Helper function to detect if this is an SEO scraper run
  const isSeoScraper = () => {
    return runDetails?.actor_name?.toLowerCase().includes('seo') || false;
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

    // 1. Handle Special Keys (Priority over type checks)

    // SEO Scraper: JSON-LD (Can be array or object)
    if (key === 'json_ld') {
      const schemas = Array.isArray(value) ? value : [value];
      if (schemas.length === 0) return <span className="text-gray-400">None</span>;

      // Extract types
      const types = schemas.map(s => {
        if (typeof s === 'string') return 'Schema'; // Handle string JSON-LD
        return s['@type'] || 'Schema';
      }).filter(Boolean).join(', ');

      return (
        <div className="text-xs">
          <div className="font-semibold text-green-600">{schemas.length} Schemas</div>
          <div className="text-gray-500 truncate max-w-[200px] mb-1" title={types}>{types}</div>
          <JsonPreview data={value} label="View JSON-LD" color="green" />
        </div>
      );
    }

    // SEO Scraper: Headings
    if (key === 'headings' && typeof value === 'object') {
      const h1 = value.h1 ? value.h1.length : 0;
      const h2 = value.h2 ? value.h2.length : 0;
      const h3 = value.h3 ? value.h3.length : 0;
      const total = Object.values(value).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
      return (
        <div className="text-xs">
          <div className="font-semibold">{total} Headings</div>
          <div className="text-gray-500 mb-1">H1: {h1}, H2: {h2}, H3: {h3}</div>
          <JsonPreview data={value} label="View Headings" color="purple" />
        </div>
      );
    }

    // SEO Scraper: Images (Object with stats)
    if (key === 'images' && !Array.isArray(value) && typeof value === 'object') {
      return (
        <div className="text-xs">
          <div className="font-semibold">{value.total_images || 0} Images</div>
          <div className="text-gray-500 mb-1">{value.images_with_alt || 0} with alt</div>
          {value.sample_images && value.sample_images.length > 0 && (
            <div className="flex gap-1 mb-2">
              {value.sample_images.slice(0, 3).map((img, idx) => (
                <img
                  key={idx}
                  src={img.src}
                  alt={img.alt}
                  title={img.title || img.alt}
                  className="w-6 h-6 rounded object-cover border border-gray-200"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ))}
            </div>
          )}
          <JsonPreview data={value} label="Details" color="blue" />
        </div>
      );
    }

    // Generic Images Array (Amazon/Maps)
    if (key === 'images' && Array.isArray(value)) {
      if (value.length === 0) return '-';

      // Only render as image gallery if items are strings (URLs)
      if (typeof value[0] === 'string') {
        return (
          <div className="flex gap-1">
            {value.slice(0, 3).map((img, idx) => (
              <img key={idx} src={img} alt="" className="w-8 h-8 rounded object-cover" />
            ))}
            {value.length > 3 && <span className="text-xs text-gray-500">+{value.length - 3}</span>}
          </div>
        );
      }
      // If images are objects but not SEO-formatted (fall through to generic array handler)
    }

    // SEO Scraper: Links
    if (key === 'links' && typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div className="text-xs">
          <div className="font-semibold">{value.total_links || 0} Links</div>
          <div className="text-gray-500 mb-1">
            <span className="text-blue-600">{value.internal_links} Int</span> /
            <span className="text-orange-600"> {value.external_links} Ext</span>
          </div>
          <JsonPreview data={value} label="View Links" color="orange" />
        </div>
      );
    }

    // SEO Scraper: Open Graph & Twitter Card
    if ((key === 'open_graph' || key === 'twitter_card') && typeof value === 'object') {
      const count = Object.keys(value).length;
      if (count === 0) return <span className="text-gray-400">None</span>;

      return (
        <div className="text-xs">
          <div className="font-semibold text-blue-600">{count} Tags</div>
          <div className="mb-1">
            <JsonPreview data={value} label={`View ${key === 'open_graph' ? 'OG' : 'Twitter'} Tags`} color="blue" />
          </div>
        </div>
      );
    }

    // SEO Scraper: Icons
    if (key === 'icons' && typeof value === 'object') {
      return (
        <div className="flex items-center gap-2">
          {value.favicon ? (
            <img src={value.favicon} className="w-6 h-6 rounded border bg-gray-50" alt="Favicon" onError={(e) => e.target.style.display = 'none'} />
          ) : <span className="text-xs text-gray-400">No favicon</span>}
          <JsonPreview data={value} label="All Icons" color="gray" />
        </div>
      );
    }

    // 2. Handle Arrays (Generic)
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';

      // Check if array contains objects - This fixes the [object Object] issue
      const hasObjects = value.some(v => typeof v === 'object' && v !== null);
      if (hasObjects) {
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">{value.length} items</span>
            <JsonPreview data={value} label="View List" color="gray" />
          </div>
        );
      }

      return (
        <div className="max-w-xs truncate text-xs" title={value.join(', ')}>
          {value.join(', ')}
        </div>
      );
    }

    // 3. Handle Objects (Generic)
    if (typeof value === 'object') {
      if (key === 'socialMedia') return null; // Handled specially in table

      // Use JsonPreview for any other object
      return <JsonPreview data={value} label={formatColumnName(key)} color="gray" />;
    }

    // 4. Handle URLs
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      if (value.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        return (
          <a href={value} target="_blank" rel="noreferrer">
            <img src={value} className="h-8 w-8 object-cover rounded border" alt="Preview" />
          </a>
        );
      }
      return (
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 truncate block max-w-[200px] text-xs" title={value}>
          {value}
        </a>
      );
    }

    // 5. Handle boolean
    if (typeof value === 'boolean') {
      return value ? <span className="text-green-600 font-medium text-xs">Yes</span> : <span className="text-gray-400 text-xs">No</span>;
    }

    // 6. Handle numbers
    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    // 7. Handle strings (Generic)
    if (typeof value === 'string') {
      if (value.length > 50) {
        // Check if it looks like a long text block (has spaces)
        if (value.includes(' ')) {
          return (
            <CustomTooltip content={
              <p className="text-xs whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed p-1">
                {value}
              </p>
            }>
              <div className=" transition-colors hover:text-foreground">
                <div className="line-clamp-2 text-xs text-muted-foreground leading-relaxed italic">{value}</div>
              </div>
            </CustomTooltip>
          );
        }
        // Long single word (like a hash or id)
        return (
          <div className="truncate max-w-[200px] text-xs" title={value}>{value}</div>
        );
      }
      return value;
    }

    return String(value);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-white min-h-screen">
        <LoadingScreen text="Loading dataset..." />
      </div>
    );
  }

  // Tab definitions removed to avoid redundancy with inline definitions

  // Get filtered columns based on active tab
  const getVisibleColumnsByTab = () => {
    if (isAmazonScraper() || isSeoScraper()) return allColumns;

    switch (activeTab) {
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

    if (isSeoScraper()) {
      const seoOrder = [
        'url', 'title', 'meta_description', 'status_code', 'icons',
        'open_graph', 'twitter_card', 'json_ld', 'headings', 'images', 'links',
        'meta_keywords', 'canonical', 'meta_robots', 'viewport', 'charset', 'language',
        'robots_txt', 'sitemap_xml'
      ];

      const visibleCols = getVisibleColumnsByTab();
      const ordered = [];

      // Add columns in SEO order
      seoOrder.forEach(col => {
        if (allColumns.includes(col) && visibleCols.includes(col)) {
          ordered.push(col);
        }
      });

      // Add remaining
      allColumns.forEach(col => {
        if (!ordered.includes(col) && visibleCols.includes(col)) {
          ordered.push(col);
        }
      });

      return ordered;
    }

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


  const tableConfig = [
    {
      id: 'number',
      header: '#',
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {(page - 1) * limit + items.indexOf(row) + 1}
        </span>
      )
    },
    ...getOrderedColumns().map(colKey => ({
      id: colKey,
      accessorKey: colKey,
      header: formatColumnName(colKey),
      cell: ({ row }) => {
        const value = row.data[colKey];

        if (colKey === 'socialMedia' && value && typeof value === 'object') {
          return renderSocialMediaIcons(value, row);
        }

        if (colKey === 'title') {
          return (
            <div className="font-semibold text-foreground max-w-xs">
              {value || '-'}
            </div>
          );
        }

        if (colKey === 'phone' && value) {
          return (
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <span>{value}</span>
              {row.data.phoneVerified && (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              )}
            </div>
          );
        }

        if (colKey === 'email' && value) {
          return (
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <span>{value}</span>
              {row.data.emailVerified && (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              )}
            </div>
          );
        }

        if (colKey === 'website' && value) {
          return (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="truncate max-w-[150px]">
                {value.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </span>
            </a>
          );
        }

        if (colKey === 'url' && value) {
          return (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-red-500 hover:text-red-600"
            >
              <MapPin className="w-3 h-3" />
              <span>Maps</span>
            </a>
          );
        }

        if (colKey === 'rating' && value) {
          return (
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">⭐</span>
              <span className="font-medium">{value}</span>
            </div>
          );
        }

        // Amazon specific rendering if in this general table
        if (isAmazonScraper()) {
          if (colKey === 'images' && Array.isArray(value) && value.length > 0) {
            return (
              <div className="relative group/img cursor-pointer" onClick={(e) => openImageModal(row.data, e)}>
                <img
                  src={value[0]}
                  alt=""
                  className="w-12 h-12 object-cover rounded border border-border group-hover/img:border-primary transition-all"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/64?text=No+Image';
                  }}
                />
                {value.length > 1 && (
                  <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1 rounded-tl">
                    +{value.length - 1}
                  </div>
                )}
              </div>
            );
          }
          if (colKey === 'asin') {
            return <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{value || '-'}</code>;
          }
          if (colKey === 'price') {
            return value ? <span className="font-semibold">${value.toFixed(2)}</span> : '-';
          }
        }

        return (
          <div className="max-w-xs">
            {renderCellValue(value, colKey, row)}
          </div>
        );
      }
    })),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          onClick={() => openChat(row)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs whitespace-nowrap"
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          AI Chat
        </Button>
      )
    }
  ]

  return (
    <>
      <div className={cn("flex-1 min-h-screen flex flex-col font-sans transition-colors duration-300", isDark ? "bg-background text-foreground" : "bg-white")}>
        {/* Header Section from Image */}
        <div className="border-b border-border bg-card">
          {/* Main Title Bar */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/runs')} className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium">Run</span>
                <span className="text-muted-foreground/30">•</span>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-base">{runDetails?.actor_name || 'Google Maps Scraper'}</span>
                  <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase tracking-wider">Actor</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-2">
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <Button variant="outline" size="sm" className="h-9 px-4 font-medium border-border hover:bg-muted transition-colors">
                Actions <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-4 font-medium border-border hover:bg-muted transition-colors">API</Button>
              <Button variant="outline" size="sm" className="h-9 px-4 font-medium border-border hover:bg-muted transition-colors flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Share
              </Button>
              <Button size="sm" className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">Export</Button>
            </div>
          </div>

          {/* Status Banner - PIXEL PERFECT REPLICA */}
          <div className="px-3 py-1.5 bg-card border-b border-border flex items-center justify-between text-[12.5px] min-h-[44px]">
            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border shadow-sm transition-all",
                runDetails?.status?.toLowerCase() === 'succeeded' || runDetails?.status?.toLowerCase() === 'finished'
                  ? (isDark ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-green-50 text-green-700 border-green-200")
                  : (isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")
              )}>
                {runDetails?.status?.toLowerCase() === 'succeeded' || runDetails?.status?.toLowerCase() === 'finished'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                  : <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                }
                <span className="capitalize">{runDetails?.status || 'Succeeded'}</span>
              </div>
              <span className="text-muted-foreground font-medium px-1">Actor {runDetails?.status?.toLowerCase() || 'succeeded'} with {totalCount || 50} results in the dataset</span>
            </div>

            <div className="flex items-center divide-x divide-border overflow-hidden pr-2">
              <div className="px-4 text-[12.5px] font-bold text-foreground">
                ${(runDetails?.cost ?? runDetails?.compute_units ?? 0.177).toFixed(3)}
              </div>
              <div className="px-4 text-[12.5px] font-medium text-muted-foreground/80">
                {runDetails?.created_at
                  ? new Date(runDetails.created_at).toISOString().split('T')[0] + ' ' + new Date(runDetails.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                  : '2026-03-09 07:36'
                }
              </div>
              <div className="px-4 text-[12.5px] font-medium text-muted-foreground/80">
                {(() => {
                  const drm = runDetails?.duration_seconds ?? runDetails?.duration ?? (runDetails?.finished_at && runDetails?.started_at ? (new Date(runDetails.finished_at) - new Date(runDetails.started_at)) / 1000 : 56);
                  return drm ? `${Math.round(drm)} s` : '56 s';
                })()}
              </div>
              <button className="px-4 text-[13px] text-foreground hover:text-blue-500 transition-colors flex items-center gap-1 font-bold">
                More details <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            </div>
          </div>

          {/* Entity Tabs System */}
          <div className="px-3 border-b border-border flex items-center gap-1">
            {[
              { id: 'output', label: 'Output', icon: TableIcon, count: totalCount },
              { id: 'log', label: 'Log', icon: FileText },
              { id: 'input', label: 'Input', icon: Settings },
              { id: 'storage', label: 'Storage', icon: MapPin },
              { id: 'live', label: 'Live view', icon: PlayIcon, disabled: true },
              { id: 'integrations', label: 'Triggered integrations', icon: CheckCircle2, count: 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTopTab(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center gap-1.5 px-3 py-3 text-[14px] font-bold border-b-2 transition-all relative group ${activeTopTab === tab.id
                  ? 'border-blue-600 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {tab.icon && <tab.icon className={cn("w-[18px] h-[18px] opacity-70", activeTopTab === tab.id ? "text-blue-600 dark:text-blue-400 opacity-100" : "text-muted-foreground")} />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                    activeTopTab === tab.id ? "bg-blue-600 text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]" : "bg-muted text-muted-foreground border border-border/50"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area - Only active when "Output" tab is selected */}
        {activeTopTab === 'output' && (
          <div className="flex-1 flex flex-col bg-muted/10">
            {/* Output Subheader (Overview, All fields, Table/JSON switch) */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-border/60 bg-white dark:bg-zinc-950">
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-border p-0.5 rounded-md">
                <button
                  onClick={() => setActiveSubTab('overview')}
                  className={cn("px-4 py-1 text-[13px] font-bold rounded transition-all",
                    activeSubTab === 'overview' ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveSubTab('all')}
                  className={cn("px-4 py-1 text-[13px] font-bold rounded transition-all",
                    activeSubTab === 'all' ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All fields
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button className="text-[13px] text-muted-foreground hover:text-foreground font-bold transition-colors flex items-center gap-1.5 px-2">
                  Preview in new tab <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </button>

                {/* Mode Switcher PIXEL PERFECT */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md border border-border">
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn("px-4 py-1 text-[13px] font-bold rounded transition-all",
                      viewMode === 'table' ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={cn("px-4 py-1 text-[13px] font-bold rounded transition-all",
                      viewMode === 'json' ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    JSON
                  </button>
                </div>

                <button className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-gray-400 transition-all bg-card shadow-sm">
                  <Columns className="w-4 h-4" />
                </button>

                <button className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-gray-400 transition-all bg-card shadow-sm">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content View Area */}
            {viewMode === 'table' ? (
              <div className="px-3 py-5 flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
                <DataTable
                  columns={tableConfig.map(col => {
                    if (col.id === 'number' || col.id === 'actions') return col;

                    // Calculate dynamic coverage based on non-null values in current items
                    const nonNullCount = items.filter(item => item.data && item.data[col.id] !== null && item.data[col.id] !== undefined && item.data[col.id] !== '').length;
                    const coverage = items.length > 0 ? Math.round((nonNullCount / items.length) * 100) : 100;

                    // Enhance headers with Scrapi-style Name + Props + Coverage
                    return {
                      ...col,
                      header: (
                        <div className="flex flex-col gap-0.5 py-0.5 group/header  min-w-[100px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-[14.5px] text-foreground leading-none tracking-tight group-hover/header:text-blue-600 transition-colors truncate">
                              {formatColumnName(col.id)}
                            </span>
                            <CustomTooltip content={<div className="font-bold p-1 text-[11px]">Data coverage for <span className="text-blue-500">{col.id}</span>: {coverage}%</div>}>
                              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded leading-none tabular-nums border border-border/40 shadow-sm flex-shrink-0",
                                coverage === 100 ? "bg-zinc-100 dark:bg-zinc-800 text-foreground/80 dark:text-zinc-200" : "bg-zinc-100/50 dark:bg-zinc-800/40 text-muted-foreground/60 dark:text-zinc-500"
                              )}>
                                {coverage}%
                              </span>
                            </CustomTooltip>
                          </div>
                          <div className="text-[11.5px] text-muted-foreground/50 font-bold leading-none mt-0.5 opacity-90 group-hover/header:text-muted-foreground/80 transition-colors overflow-hidden text-ellipsis">
                            {col.id}
                          </div>
                        </div>
                      )
                    };
                  })}
                  data={items}
                  loading={loading}
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  itemsPerPage={limit}
                  onItemsPerPageChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                  totalItems={totalCount}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="flex-1 overflow-auto bg-white dark:bg-[#1e1e1e] font-mono py-4 dt-custom-scrollbar border-t border-border/50">
                  <div className="flex min-w-full">
                    {/* Line Numbers */}
                    <div className="flex flex-col text-zinc-400 dark:text-zinc-500 text-right select-none px-4 border-r border-zinc-200 dark:border-zinc-800 min-w-[56px] text-[10px] leading-5 bg-zinc-50/50 dark:bg-zinc-900/30 h-fit">
                      {Array.from({ length: Math.min(items.length * 15, 1000) }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pl-1">
                      <pre className="text-[11px] leading-5 font-mono font-semibold overflow-visible select-text" style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace" }}>
                        <div className="pl-4">
                          <JsonTreeNode data={items.map(item => item.data)} isLast={true} depth={0} />
                        </div>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other tabs placeholders & Log Viewer */}
        {activeTopTab !== 'output' && activeTopTab !== 'log' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-20">
            <div className="bg-card p-10 rounded-2xl border border-border flex flex-col items-center max-w-md shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-500/5">
                {activeTopTab === 'input' && <Settings className="w-8 h-8" />}
                {activeTopTab === 'storage' && <MapPin className="w-8 h-8" />}
                {activeTopTab === 'integrations' && <CheckCircle2 className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {topEntityTabs.find(t => t.id === activeTopTab)?.label || 'View'}
              </h3>
              <p className="text-center text-muted-foreground leading-relaxed">
                This section is currently under development. In the full application, this would provide detailed {activeTopTab} information for the run.
              </p>
              <Button onClick={() => setActiveTopTab('output')} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 h-11 rounded-xl shadow-md transition-all active:scale-95">
                Back to Dataset Output
              </Button>
            </div>
          </div>
        )}

        {/* Phase 6: Log Streaming View */}
        {activeTopTab === 'log' && (
          <div className="flex-1 p-4 flex flex-col min-h-0 bg-background">
            <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0c] font-mono relative rounded-[10px] overflow-hidden border border-[#222]">
              {/* Header inside the terminal area */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  {/* Space for any left-side header content if needed */}
                </div>
                <div className="flex items-center gap-4 text-[#888] text-xs font-medium">
                  {/* <span className="hover:text-white cursor-pointer transition-colors">View full log</span> */}
                  <div className="flex items-center gap-3">
                    <button onClick={copyLogs} className="hover:text-white transition-colors" title="Copy to clipboard">
                      {copied ? (
                        <Check className="w-[14px] h-[14px] text-green-500" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                      )}
                    </button>
                    {/* <button className="hover:text-white transition-colors" title="Settings">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                    </button> */}
                  </div>
                </div>
              </div>
              <div
                ref={logContainerRef}
                className="flex-1 overflow-y-auto p-4 dt-custom-scrollbar"
              >
                {logLines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#444] space-y-4">
                    <FileText className="w-12 h-12 opacity-50" />
                    <p>Waiting for logs...</p>
                  </div>
                ) : (
                  <div className="space-y-0.5 font-mono">
                    {logLines.map((line, idx) => {
                      // Apify format: 2026-03-09T02:06:05.078Z LEVEL Message
                      // Our current format from orchestrator: 2026-03-09T...: message
                      let timestamp = "";
                      let content = line;
                      let level = "";

                      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/);
                      if (timestampMatch) {
                        timestamp = timestampMatch[1];
                        content = line.substring(timestamp.length).trim();
                        if (content.startsWith(":")) {
                          content = content.substring(1).trim();
                        }
                      }

                      // Extract level if present (e.g. "INFO", "WARN", "ERROR")
                      const levelMatch = content.match(/^(INFO|WARN|ERROR|DEBUG|ACTOR:)/i);
                      if (levelMatch) {
                        level = levelMatch[1].toUpperCase();
                        content = content.substring(level.length).trim();
                      }

                      return (
                        <div key={idx} className="flex gap-4 text-[12px] leading-[1.6]  transition-colors py-0">
                          {timestamp && (
                            <span className="text-[#666] shrink-0 select-none">
                              {timestamp}
                            </span>
                          )}
                          <div className="flex-1 flex gap-2">
                            {level && (
                              <span className={cn(
                                "shrink-0 font-bold",
                                level === "INFO" ? "text-green-500" :
                                  level === "ERROR" ? "text-red-500" :
                                    level === "WARN" ? "text-yellow-500" :
                                      level === "ACTOR:" ? "text-[#ccc]" : "text-blue-400"
                              )}>
                                {level}
                              </span>
                            )}
                            <span className="whitespace-pre-wrap break-all text-[#ccc]">
                              {content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                                if (part.match(/^https?:\/\//)) {
                                  return (
                                    <a
                                      key={i}
                                      href={part}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 underline underline-offset-2  transition-colors cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {part}
                                    </a>
                                  );
                                }
                                return (
                                  <span key={i} className={cn(
                                    content.includes('PlaywrightCrawler') ? "text-yellow-300" : ""
                                  )}>
                                    {part}
                                  </span>
                                );
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notion-style Contextual Links Popup */}
        {showLinksModal && selectedLinksItem && (
          <>
            {/* Transparent overlay to close on click outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={closeLinksModal}
            />

            {/* Contextual popup at click position - Theme Adaptable */}
            <div
              className={cn(
                "fixed z-50 rounded-lg shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                isDark ? "bg-zinc-900 border-zinc-800 shadow-black/50" : "bg-white border-zinc-200 shadow-zinc-200/50"
              )}
              style={{
                left: `${linksModalPosition.x}px`,
                top: `${linksModalPosition.y}px`,
                minWidth: '280px',
                maxWidth: '320px',
                maxHeight: '350px'
              }}
            >
              {/* Header with business name */}
              <div className={cn(
                "px-4 py-3 border-b",
                isDark ? "bg-zinc-800/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              )}>
                <div className={cn("font-bold text-sm truncate", isDark ? "text-zinc-100" : "text-zinc-900")}>
                  {selectedLinksItem.data.title}
                </div>
                <div className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-500")}>
                  All social links
                </div>
              </div>

              {/* Links list - scrollable */}
              <div className="overflow-y-auto max-h-[320px] dt-custom-scrollbar">
                <div className="py-1">
                  {/* Social Media Links */}
                  {selectedLinksItem.data.socialMedia && Object.entries(selectedLinksItem.data.socialMedia).map(([platform, url]) => {
                    const platformLower = platform.toLowerCase();
                    let bgClass = isDark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-zinc-50 group-hover:bg-zinc-100';
                    let iconColorClass = isDark ? 'text-zinc-300' : 'text-zinc-600';

                    if (platformLower.includes('facebook')) {
                      bgClass = isDark ? 'bg-blue-900/40 group-hover:bg-blue-900/60' : 'bg-blue-50 group-hover:bg-blue-100';
                      iconColorClass = isDark ? 'text-blue-400' : 'text-blue-600';
                    } else if (platformLower.includes('instagram')) {
                      bgClass = isDark ? 'bg-pink-900/40 group-hover:bg-pink-900/60' : 'bg-pink-50 group-hover:bg-pink-100';
                      iconColorClass = isDark ? 'text-pink-400' : 'text-pink-600';
                    } else if (platformLower.includes('twitter') || platformLower.includes('x.com')) {
                      bgClass = isDark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-sky-50 group-hover:bg-sky-100';
                      iconColorClass = isDark ? 'text-zinc-100' : 'text-sky-600';
                    } else if (platformLower.includes('linkedin')) {
                      bgClass = isDark ? 'bg-blue-900/40 group-hover:bg-blue-900/60' : 'bg-blue-50 group-hover:bg-blue-100';
                      iconColorClass = isDark ? 'text-blue-400' : 'text-blue-700';
                    } else if (platformLower.includes('youtube')) {
                      bgClass = isDark ? 'bg-red-900/40 group-hover:bg-red-900/60' : 'bg-red-50 group-hover:bg-red-100';
                      iconColorClass = isDark ? 'text-red-400' : 'text-red-600';
                    } else if (platformLower.includes('tiktok')) {
                      bgClass = isDark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-zinc-100 group-hover:bg-zinc-200';
                      iconColorClass = isDark ? 'text-zinc-100' : 'text-zinc-900';
                    }

                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center px-3 py-2 transition-colors group",
                          isDark ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"
                        )}
                      >
                        <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 flex-shrink-0 ${bgClass}`}>
                          <div className={iconColorClass}>
                            {getSocialIcon(platform)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-sm font-bold capitalize", isDark ? "text-zinc-200" : "text-zinc-900")}>
                            {platform}
                          </div>
                          <div className={cn("text-[11px] truncate", isDark ? "text-zinc-500" : "text-zinc-400")}>
                            {url.length > 40 ? url.substring(0, 40) + '...' : url}
                          </div>
                        </div>
                        <ExternalLink className={cn("w-3.5 h-3.5 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity", isDark ? "text-zinc-500" : "text-zinc-400")} />
                      </a>
                    );
                  })}

                  {/* Website Link */}
                  {selectedLinksItem.data.website && (
                    <a
                      href={selectedLinksItem.data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center px-3 py-2 transition-colors group",
                        isDark ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded flex items-center justify-center mr-3 flex-shrink-0", isDark ? "bg-zinc-800 group-hover:bg-zinc-700" : "bg-zinc-50 group-hover:bg-zinc-100")}>
                        <ExternalLink className={cn("w-3.5 h-3.5", isDark ? "text-zinc-400" : "text-zinc-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-sm font-bold", isDark ? "text-zinc-200" : "text-zinc-900")}>Website</div>
                        <div className={cn("text-[11px] truncate", isDark ? "text-zinc-500" : "text-zinc-400")}>
                          {selectedLinksItem.data.website.length > 40
                            ? selectedLinksItem.data.website.substring(0, 40) + '...'
                            : selectedLinksItem.data.website}
                        </div>
                      </div>
                      <ExternalLink className={cn("w-3.5 h-3.5 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity", isDark ? "text-zinc-500" : "text-zinc-400")} />
                    </a>
                  )}

                  {/* Google Maps Link */}
                  {selectedLinksItem.data.url && (
                    <a
                      href={selectedLinksItem.data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center px-3 py-2 transition-colors group",
                        isDark ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded flex items-center justify-center mr-3 flex-shrink-0", isDark ? "bg-red-900/40 group-hover:bg-red-900/60" : "bg-red-50 group-hover:bg-red-100")}>
                        <MapPin className={cn("w-3.5 h-3.5", isDark ? "text-red-400" : "text-red-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-sm font-bold", isDark ? "text-zinc-200" : "text-zinc-900")}>Google Maps</div>
                        <div className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-zinc-400")}>View on map</div>
                      </div>
                      <ExternalLink className={cn("w-3.5 h-3.5 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity", isDark ? "text-zinc-500" : "text-zinc-400")} />
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

            {/* Compact image popup - Position Aware & Theme Adaptable */}
            <div
              className={cn(
                "fixed z-50 rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                isDark ? "bg-zinc-900 border-zinc-800 shadow-black/50" : "bg-white border-zinc-200 shadow-zinc-200/50"
              )}
              style={{
                left: `${imageModalPosition.x}px`,
                top: `${imageModalPosition.y}px`,
                width: '310px',
                maxWidth: '90vw',
                maxHeight: '85vh'
              }}
            >
              {/* Header with product name */}
              <div className={cn(
                "px-3 py-2 border-b flex items-center justify-between",
                isDark ? "bg-zinc-800/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              )}>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-bold text-[13px] truncate", isDark ? "text-zinc-100" : "text-zinc-900")}>
                    {selectedProduct.title}
                  </div>
                  <div className={cn("text-[11px] mt-0.5 font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>
                    {currentImageIndex + 1} / {getAllMedia(selectedProduct).length}
                    {getAllMedia(selectedProduct)[currentImageIndex]?.type === 'video' && (
                      <span className="ml-1.5 text-red-500 font-bold tracking-tight">VIDEO</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeImageModal}
                  className={cn("ml-2 p-1 rounded-md transition-colors", isDark ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Media Display with Navigation */}
              <div className={cn("relative", isDark ? "bg-zinc-950" : "bg-zinc-50")}>
                <div className="flex items-center justify-center p-2" style={{ height: '210px' }}>
                  {(() => {
                    const allMedia = getAllMedia(selectedProduct);
                    const currentMedia = allMedia[currentImageIndex];

                    if (!currentMedia) {
                      return (
                        <div className="text-zinc-400 text-center">
                          <div className="text-3xl mb-2">📦</div>
                          <p className="text-xs">No media available</p>
                        </div>
                      );
                    }

                    if (currentMedia.type === 'video') {
                      const videoUrl = currentMedia.url;
                      const isHLS = videoUrl.includes('.m3u8');
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
                    className={cn(
                      "absolute left-2 top-1/2 transform -translate-y-1/2 rounded-full p-2 shadow-lg transition-all z-10",
                      isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700" : "bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Next Button */}
                {getAllMedia(selectedProduct).length > 1 && (
                  <button
                    onClick={nextImage}
                    className={cn(
                      "absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full p-2 shadow-lg transition-all z-10",
                      isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700" : "bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200"
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Thumbnail Gallery - Combined Images and Videos */}
              {getAllMedia(selectedProduct).length > 1 && (
                <div className={cn("px-2 py-1.5 border-t overflow-y-auto", isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white")} style={{ maxHeight: '90px' }}>
                  <div className="flex gap-1 flex-wrap">
                    {getAllMedia(selectedProduct).map((media, index) => (
                      <button
                        key={index}
                        onClick={() => selectThumbnail(index)}
                        className={cn(
                          "relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden border-2 transition-all",
                          index === currentImageIndex
                            ? (isDark ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500 ring-2 ring-blue-500/20")
                            : (isDark ? "border-zinc-800 hover:border-zinc-600" : "border-zinc-100 hover:border-zinc-300")
                        )}
                      >
                        {media.type === 'video' ? (
                          <div className={cn("w-full h-full relative", isDark ? "bg-zinc-850" : "bg-zinc-800")}>
                            {!media.url.includes('.m3u8') ? (
                              <video
                                className="w-full h-full object-cover opacity-60"
                                preload="metadata"
                                muted
                                playsInline
                                src={`${media.url}#t=0.1`}
                                onLoadedData={(e) => {
                                  e.target.currentTime = 1;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-red-950 via-red-900 to-red-950 opacity-60" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Play className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" />
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
              <div className={cn("px-2.5 py-1.5 border-t", isDark ? "border-zinc-800 bg-zinc-800/20" : "border-zinc-200 bg-zinc-50")}>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  {selectedProduct.brand && (
                    <span className={cn("truncate flex-1 mr-2 font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>
                      {selectedProduct.brand}
                    </span>
                  )}
                  {selectedProduct.price && (
                    <span className={cn("font-bold whitespace-nowrap", isDark ? "text-green-400" : "text-green-600 text-[13px]")}>
                      ${selectedProduct.price.toFixed(2)}
                    </span>
                  )}
                </div>
                {selectedProduct.rating && (
                  <div className="flex items-center gap-1 text-[11px] mb-2 font-semibold">
                    <span className="text-yellow-500">⭐</span>
                    <span className={isDark ? "text-zinc-200" : "text-zinc-700"}>{selectedProduct.rating}</span>
                    {selectedProduct.reviewCount && (
                      <span className={isDark ? "text-zinc-500" : "text-zinc-400"}>
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
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-[13px] font-bold transition-all active:scale-[0.98] shadow-sm"
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
                    <Checkbox
                      checked={visibleColumns.number}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, number: e.target.checked }))}
                    />
                    <span className="text-sm text-gray-900 font-medium">#</span>
                  </label>

                  {/* Dynamic columns from data */}
                  {allColumns.map(colKey => (
                    <label key={colKey} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <Checkbox
                        checked={visibleColumns[colKey]}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, [colKey]: e.target.checked }))}
                      />
                      <span className="text-sm text-gray-900">{formatColumnName(colKey)}</span>
                    </label>
                  ))}

                  {/* Actions column */}
                  <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <Checkbox
                      checked={visibleColumns.actions}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, actions: e.target.checked }))}
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
                  <p className="text-xs text-gray-400 mt-2">Try: &quot;How should I approach this business?&quot;</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === 'user'
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
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
    </>
  );
};

export default DatasetV2;
