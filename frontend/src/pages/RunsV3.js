import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  MoreHorizontal
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import AlertModal from '../components/AlertModal';
import RunsTable from '../components/RunsTable';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RunsV3 = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // State
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

  // Selection & Abort State
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [abortingRuns, setAbortingRuns] = useState(new Set());
  const [alertModal, setAlertModal] = useState({ show: false, type: 'info', title: '', message: '', details: [] });
  const [confirmModal, setConfirmModal] = useState({ show: false, type: 'warning', title: '', message: '', onConfirm: null, details: [] });

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [page, limit, sortBy, sortOrder, searchQuery]);

  const fetchRuns = async () => {
    try {
      const token = localStorage.getItem('token');
      // Construct query params
      const params = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get(`${API}/runs`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        hideErrorToast: true
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

  // --- Abort Logic ---

  const abortRun = async (runId) => {
    // Confirmation wrapper
    setConfirmModal({
      show: true,
      type: 'warning',
      title: 'Abort Run',
      message: `Are you sure you want to abort run ${runId}?`,
      onConfirm: async () => {
        try {
          setAbortingRuns(prev => new Set([...prev, runId]));
          const token = localStorage.getItem('token');
          await axios.delete(`${API}/runs/${runId}/abort`, {
            headers: { Authorization: `Bearer ${token}` }
          });
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
      }
    });
  };

  const abortMultipleRuns = async (runIds) => {
    try {
      runIds.forEach(id => setAbortingRuns(prev => new Set([...prev, id])));
      const token = localStorage.getItem('token');
      await axios.post(`${API}/runs/abort-multiple`, runIds, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  // --- Handlers ---

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setGoToPageInput('');
    }
  };

  const toggleRunSelection = (runId) => {
    setSelectedRuns(prev => {
      if (prev.includes(runId)) return prev.filter(id => id !== runId);
      return [...prev, runId];
    });
  };

  const toggleAllRunsSelection = () => {
    const runningAndQueuedRuns = runs.filter(run =>
      run.status === 'running' || run.status === 'queued'
    );

    if (runningAndQueuedRuns.length === 0) return;

    const allSelected = runningAndQueuedRuns.every(run => selectedRuns.includes(run.id));

    if (allSelected) {
      // Deselect all
      const idsToRemove = runningAndQueuedRuns.map(r => r.id);
      setSelectedRuns(prev => prev.filter(id => !idsToRemove.includes(id)));
    } else {
      // Select all
      const idsToAdd = runningAndQueuedRuns.map(r => r.id);
      setSelectedRuns(prev => {
        const unique = new Set([...prev, ...idsToAdd]);
        return Array.from(unique);
      });
    }
  };

  const abortSelectedRuns = async () => {
    if (selectedRuns.length === 0) return;
    setConfirmModal({
      show: true,
      type: 'warning',
      title: 'Abort Selected Runs',
      message: `Are you sure you want to abort ${selectedRuns.length} selected run(s)?`,
      onConfirm: async () => await abortMultipleRuns(selectedRuns)
    });
  };

  return (
    <div className="min-h-screen p-8 font-sans transition-colors bg-background text-foreground">
      {/* Header */}
      <div className="max-w-full mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-foreground">Runs</h1>
            <span className="text-[22px] text-muted-foreground font-normal">({totalCount})</span>
          </div>

          <div className="flex gap-3">
            {(selectedRuns.length > 0) && (
              <button
                onClick={abortSelectedRuns}
                className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 transition-colors flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                Abort Selected ({selectedRuns.length})
              </button>
            )}

            {(runs.some(r => r.status === 'running' || r.status === 'queued')) && (
              <button
                onClick={abortAllRunningRuns}
                className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 transition-colors flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                Abort All
              </button>
            )}

            <button className="px-3 py-1.5 text-sm font-medium text-foreground bg-card border border-border rounded hover:bg-muted transition-colors">
              API
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-[320px] mb-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-border rounded-md leading-5 bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="Search by run ID or actor..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <div className="text-sm text-muted-foreground font-medium mb-4">
          {totalCount} recent runs
        </div>

        {/* Global Table Component */}
        <RunsTable
          runs={runs}
          loading={loading}
          selectedRuns={selectedRuns}
          toggleRunSelection={toggleRunSelection}
          toggleAllRunsSelection={toggleAllRunsSelection}
          abortRun={abortRun}
          abortingRuns={abortingRuns}
        />

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-muted-foreground">Items per page:</span>
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="appearance-none bg-card border border-border text-foreground text-[13px] rounded px-3 py-1 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">Go to page:</span>
              <input
                type="text"
                value={goToPageInput}
                onChange={(e) => setGoToPageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                placeholder={page}
                className="w-[40px] px-2 py-1 text-[13px] text-center bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleGoToPage}
                className="px-3 py-1 text-[13px] bg-white dark:bg-zinc-800 border border-border rounded shadow-sm hover:bg-muted transition-colors font-medium text-foreground"
              >
                Go
              </button>
            </div>

            <div className="flex items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-2 text-[13px] font-medium text-foreground">{page}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      <AlertModal
        show={alertModal.show}
        onClose={() => setAlertModal({ ...alertModal, show: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        details={alertModal.details}
      />

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
    </div>
  );
};

export default RunsV3;
