import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import AlertModal from '../components/AlertModal';
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  StopCircle,
  AlertCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RunsV3 = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [goToPageInput, setGoToPageInput] = useState('');
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [abortingRuns, setAbortingRuns] = useState(new Set());
  const [showAbortModal, setShowAbortModal] = useState(false);
  const [abortModalData, setAbortModalData] = useState(null);
  
  // Alert modal states
  const [alertModal, setAlertModal] = useState({ show: false, type: 'info', title: '', message: '', details: [] });
  const [confirmModal, setConfirmModal] = useState({ show: false, type: 'warning', title: '', message: '', onConfirm: null, details: [] });

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [page, limit, sortBy, sortOrder, searchQuery]);

  const fetchRuns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/runs`, {
        params: {
          page,
          limit,
          search: searchQuery || undefined,
          sort_by: sortBy,
          sort_order: sortOrder
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRuns(response.data.runs || []);
      setTotalCount(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const abortRun = async (runId) => {
    try {
      setAbortingRuns(prev => new Set([...prev, runId]));
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/runs/${runId}/abort`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the runs list
      await fetchRuns();
    } catch (error) {
      console.error('Failed to abort run:', error);
      setAlertModal({
        show: true,
        type: 'error',
        title: 'Abort Failed',
        message: error.response?.data?.detail || 'Failed to abort run'
      });
    } finally {
      setAbortingRuns(prev => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  };

  const abortMultipleRuns = async (runIds) => {
    try {
      runIds.forEach(id => setAbortingRuns(prev => new Set([...prev, id])));
      const token = localStorage.getItem('token');
      await axios.post(`${API}/runs/abort-multiple`, runIds, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the runs list
      await fetchRuns();
      setSelectedRuns([]);
    } catch (error) {
      console.error('Failed to abort runs:', error);
      setAlertModal({
        show: true,
        type: 'error',
        title: 'Abort Failed',
        message: error.response?.data?.detail || 'Failed to abort runs'
      });
    } finally {
      runIds.forEach(id => {
        setAbortingRuns(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    }
  };

  const abortAllRunningRuns = async () => {
    const runningAndQueuedRuns = runs.filter(run => 
      run.status === 'running' || run.status === 'queued'
    );
    
    if (runningAndQueuedRuns.length === 0) {
      setAlertModal({
        show: true,
        type: 'info',
        title: 'No Runs to Abort',
        message: 'No running or queued runs to abort'
      });
      return;
    }

    // Show confirmation modal
    setConfirmModal({
      show: true,
      type: 'warning',
      title: 'Abort All Runs',
      message: `Are you sure you want to abort ${runningAndQueuedRuns.length} running/queued run(s)?`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.post(`${API}/runs/abort-all`, null, {
            params: { status_filter: 'all' },
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Refresh the runs list
          await fetchRuns();
        } catch (error) {
          console.error('Failed to abort all runs:', error);
          setAlertModal({
            show: true,
            type: 'error',
            title: 'Abort Failed',
            message: error.response?.data?.detail || 'Failed to abort all runs'
          });
        }
      }
    });
  };

  const handleAbortClick = (run, event) => {
    event.stopPropagation();
    setAbortModalData(run);
    setShowAbortModal(true);
  };

  const confirmAbort = async () => {
    if (abortModalData) {
      await abortRun(abortModalData.id);
      setShowAbortModal(false);
      setAbortModalData(null);
    }
  };

  const toggleRunSelection = (runId) => {
    setSelectedRuns(prev => {
      if (prev.includes(runId)) {
        return prev.filter(id => id !== runId);
      } else {
        return [...prev, runId];
      }
    });
  };

  const toggleSelectAll = () => {
    const abortableRuns = runs.filter(run => 
      run.status === 'running' || run.status === 'queued'
    );
    
    if (selectedRuns.length === abortableRuns.length) {
      setSelectedRuns([]);
    } else {
      setSelectedRuns(abortableRuns.map(run => run.id));
    }
  };

  const abortSelectedRuns = async () => {
    if (selectedRuns.length === 0) {
      setAlertModal({
        show: true,
        type: 'info',
        title: 'No Selection',
        message: 'No runs selected'
      });
      return;
    }

    // Show confirmation modal
    setConfirmModal({
      show: true,
      type: 'warning',
      title: 'Abort Selected Runs',
      message: `Are you sure you want to abort ${selectedRuns.length} selected run(s)?`,
      onConfirm: async () => {
        await abortMultipleRuns(selectedRuns);
      }
    });
  };

  const getStatusDisplay = (status) => {
    const statusConfig = {
      succeeded: {
        icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
        text: 'Succeeded',
        color: 'text-green-700'
      },
      failed: {
        icon: <XCircle className="w-4 h-4 text-red-600" />,
        text: 'Failed',
        color: 'text-red-700'
      },
      running: {
        icon: <Clock className="w-4 h-4 text-blue-600 animate-pulse" />,
        text: 'Running',
        color: 'text-blue-700'
      },
      queued: {
        icon: <Clock className="w-4 h-4 text-gray-400" />,
        text: 'Queued',
        color: 'text-gray-600'
      },
      aborted: {
        icon: <StopCircle className="w-4 h-4 text-orange-600" />,
        text: 'Aborted',
        color: 'text-orange-700'
      }
    };

    const config = statusConfig[status] || statusConfig.queued;
    
    return (
      <div className="flex items-center gap-2">
        {config.icon}
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      </div>
    );
  };

  const formatDateTime = (dateString) => {
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

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    return `${seconds} s`;
  };

  const formatUsage = (cost) => {
    if (!cost || cost === 0) return '-';
    return `$${cost.toFixed(2)}`;
  };

  const formatTaskDescription = (run) => {
    // Detect scraper type and format accordingly
    const actorName = run.actor_name || '';
    const isAmazonScraper = actorName.toLowerCase().includes('amazon');
    const isIndeedScraper = actorName.toLowerCase().includes('indeed');
    
    if (isAmazonScraper) {
      // Amazon Product Scraper: Show product keywords
      const keywords = run.input_data?.search_keywords?.join(', ') || 'N/A';
      const maxResults = run.input_data?.max_results || '';
      
      let taskDescription = `Products: ${keywords}`;
      if (maxResults) {
        taskDescription += ` (max ${maxResults})`;
      }
      return taskDescription;
    } else if (isIndeedScraper) {
      // Indeed Jobs Scraper: Show keyword + location
      const keyword = run.input_data?.keyword || 'N/A';
      const location = run.input_data?.location || '';
      const maxPages = run.input_data?.max_pages || '';
      
      let taskDescription = `Jobs: ${keyword}`;
      
      if (location) {
        taskDescription += ` in ${location}`;
      }
      
      if (maxPages) {
        taskDescription += ` (${maxPages} pages)`;
      }
      
      return taskDescription;
    } else {
      // Google Maps Scraper: Show search terms + location
      const searchTerms = run.input_data?.search_terms?.join(', ') || 'N/A';
      const location = run.input_data?.location || '';
      const maxResults = run.input_data?.max_results || '';
      
      let taskDescription = searchTerms;
      
      if (location) {
        taskDescription += ` in ${location}`;
      }
      
      if (maxResults) {
        taskDescription += ` (max ${maxResults})`;
      }
      
      return taskDescription;
    }
  };

  const formatTaskWithWrapping = (text) => {
    // Split text into chunks of max 50 characters, breaking at spaces if possible
    const maxLength = 50;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        // If a single word is longer than maxLength, break it
        if (word.length > maxLength) {
          let remainingWord = word;
          while (remainingWord.length > maxLength) {
            lines.push(remainingWord.substring(0, maxLength));
            remainingWord = remainingWord.substring(maxLength);
          }
          currentLine = remainingWord;
        } else {
          currentLine = word;
        }
      }
    });
    
    if (currentLine) lines.push(currentLine);
    
    return lines;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on search
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-gray-600">Loading runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-normal text-gray-900">
              Runs <span className="text-gray-400">({totalCount})</span>
            </h1>
            <div className="flex items-center gap-2">
              {selectedRuns.length > 0 && (
                <Button
                  onClick={abortSelectedRuns}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-orange-300 text-orange-700 text-sm hover:bg-orange-50"
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Abort Selected ({selectedRuns.length})
                </Button>
              )}
              {runs.filter(r => r.status === 'running' || r.status === 'queued').length > 0 && (
                <Button
                  onClick={abortAllRunningRuns}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-red-300 text-red-700 text-sm hover:bg-red-50"
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Abort All
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                API
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by run ID"
                value={searchQuery}
                onChange={handleSearch}
                className="pl-9 h-9 border-gray-300 text-sm focus:border-gray-400 focus:ring-0"
              />
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            {totalCount} recent runs
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {runs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-base">No runs found</p>
            <p className="text-sm text-gray-400 mt-2">
              {searchQuery ? 'Try a different search term' : 'Start a new scraping run to see it here'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedRuns.length > 0 && selectedRuns.length === runs.filter(r => r.status === 'running' || r.status === 'queued').length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-32">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-64">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[200px] max-w-[500px]">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-24">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-24">
                  Usage
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 w-36"
                  onClick={() => handleSort('started_at')}
                >
                  <div className="flex items-center gap-1">
                    Started
                    {sortBy === 'started_at' && (
                      <ChevronDown className={`w-3 h-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-36">
                  Finished
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-24">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-24">
                  Build
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 w-24"
                  onClick={() => handleSort('origin')}
                >
                  <div className="flex items-center gap-1">
                    Origin
                    {sortBy === 'origin' && (
                      <ChevronDown className={`w-3 h-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {runs.map((run, index) => (
                <tr 
                  key={run.id} 
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    run.status === 'succeeded' && run.results_count > 0 ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => run.status === 'succeeded' && run.results_count > 0 && navigate(`/dataset/${run.id}`)}
                >
                  {/* Checkbox - Only for running/queued runs */}
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    {(run.status === 'running' || run.status === 'queued') && (
                      <input
                        type="checkbox"
                        checked={selectedRuns.includes(run.id)}
                        onChange={() => toggleRunSelection(run.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    )}
                  </td>

                  {/* Status - Icon + Text */}
                  <td className="px-6 py-4">
                    {getStatusDisplay(run.status)}
                  </td>

                  {/* Actor - Icon + Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-base flex-shrink-0">
                        📍
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {run.actor_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          comp...places @ Pay per event
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Task - Keywords + Location + Max Results, wrapped */}
                  <td className="px-6 py-4 min-w-[200px] max-w-[500px]">
                    <div className="text-sm text-gray-700 break-words">
                      {formatTaskWithWrapping(formatTaskDescription(run)).map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </td>

                  {/* Results - Blue number */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-blue-600">
                      {run.results_count}
                    </span>
                  </td>

                  {/* Usage - Dollar amount or dash */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {formatUsage(run.cost)}
                    </span>
                  </td>

                  {/* Started - Date on top, time below */}
                  <td className="px-6 py-4">
                    {run.started_at ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatDateTime(run.started_at).split(' ')[0]}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(run.started_at).split(' ')[1]}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>

                  {/* Finished - Date on top, time below */}
                  <td className="px-6 py-4">
                    {run.finished_at ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatDateTime(run.finished_at).split(' ')[0]}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(run.finished_at).split(' ')[1]}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>

                  {/* Duration - "X s" format */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {formatDuration(run.duration_seconds)}
                    </span>
                  </td>

                  {/* Build - Blue link style or dash */}
                  <td className="px-6 py-4">
                    {run.build_number ? (
                      <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                        {run.build_number}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>

                  {/* Origin - Web */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {run.origin || 'Web'}
                    </span>
                  </td>

                  {/* Actions - Abort button */}
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {(run.status === 'running' || run.status === 'queued') && (
                      <Button
                        onClick={(e) => handleAbortClick(run, e)}
                        disabled={abortingRuns.has(run.id)}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 border-orange-300 text-orange-700 hover:bg-orange-50 text-xs"
                      >
                        {abortingRuns.has(run.id) ? (
                          <>
                            <Clock className="w-3 h-3 mr-1 animate-spin" />
                            Aborting...
                          </>
                        ) : (
                          <>
                            <StopCircle className="w-3 h-3 mr-1" />
                            Abort
                          </>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="border-t border-gray-200 bg-white px-6 py-4">
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
                  onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                  className="w-16 h-8 text-sm border-gray-300 text-center focus:border-gray-400 focus:ring-0"
                  placeholder={page.toString()}
                />
                <Button
                  size="sm"
                  onClick={handleGoToPage}
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

      {/* Alert Modal (for info/error messages) */}
      <AlertModal
        show={alertModal.show}
        onClose={() => setAlertModal({ ...alertModal, show: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        details={alertModal.details}
        confirmText="OK"
      />

      {/* Confirmation Modal (for confirmations) */}
      <AlertModal
        show={confirmModal.show}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        showCancel={true}
        confirmText="Confirm"
        cancelText="Cancel"
      />

      {/* Abort Confirmation Modal (Custom with details) */}
      {showAbortModal && abortModalData && (
        <AlertModal
          show={showAbortModal}
          onClose={() => setShowAbortModal(false)}
          onConfirm={confirmAbort}
          type="warning"
          title="Abort Run?"
          message="Are you sure you want to abort this scraping run? This action cannot be undone."
          details={[
            { label: 'Run ID', value: abortModalData.id },
            { label: 'Task', value: formatTaskDescription(abortModalData) }
          ]}
          showCancel={true}
          confirmText="Abort Run"
          cancelText="Cancel"
          confirmButtonClass="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
        />
      )}
    </div>
  );
};

export default RunsV3;

