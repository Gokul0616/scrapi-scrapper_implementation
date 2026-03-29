import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Play,
  MapPin,
  CheckCircle,
  XSquare,
  Loader,
  Users,
  Star,
  Info,
  Building2
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { getProfileColor, getUserInitials, getUserDisplayName } from '../utils/userUtils';
import { useTheme } from '../contexts/ThemeContext';
import ActorCard from '../components/ActorCard';
import DataTable from '../components/ui/DataTable';
import LoadingScreen from '../components/LoadingScreen';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState('recent');
  const [recentActors, setRecentActors] = useState([]);
  const [suggestedActors, setSuggestedActors] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [billingData, setBillingData] = useState(null);

  // Loading states
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);

  const userInitials = getUserInitials(user);
  const userDisplayName = getUserDisplayName(user);

  const profileColor = getProfileColor(user?.profile_color, theme);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');

      // Fetch recently viewed actors
      try {
        setLoadingRecent(true);
        const recentViewsRes = await axios.get(`${BACKEND_URL}/api/actors/recently-viewed?limit=4`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const recentViewsData = Array.isArray(recentViewsRes.data?.actors)
          ? recentViewsRes.data.actors
          : (Array.isArray(recentViewsRes.data) ? recentViewsRes.data : []);

        setRecentActors(recentViewsData);
      } catch (error) {
        console.error("Failed to fetch recent actors:", error);
        setRecentActors([]);
      } finally {
        setLoadingRecent(false);
      }

      // Fetch suggested actors
      try {
        setLoadingSuggested(true);
        const suggestedRes = await axios.get(`${BACKEND_URL}/api/actors/suggested?limit=6`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const suggestedData = Array.isArray(suggestedRes.data)
          ? suggestedRes.data
          : [];

        setSuggestedActors(suggestedData);
      } catch (error) {
        console.error("Failed to fetch suggested actors:", error);
        setSuggestedActors([]);
      } finally {
        setLoadingSuggested(false);
      }

      // Fetch recent runs
      try {
        setLoadingRuns(true);
        const runsRes = await axios.get(`${BACKEND_URL}/api/runs?page=1&limit=5&sort_by=created_at&sort_order=desc`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const runsData = Array.isArray(runsRes.data?.runs)
          ? runsRes.data.runs
          : (Array.isArray(runsRes.data) ? runsRes.data : []);

        setRecentRuns(runsData);
      } catch (error) {
        console.error("Failed to fetch runs:", error);
        setRecentRuns([]);
      } finally {
        setLoadingRuns(false);
      }

      // Fetch billing summary for plan name
      try {
        const billingRes = await axios.get(`${BACKEND_URL}/api/billing/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBillingData(billingRes.data);
      } catch (error) {
        console.error("Failed to fetch billing proxy data:", error);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return dateString.replace('T', ' ').substring(0, 19);
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '-';
    return `${seconds} s`;
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'failed' || s === 'aborted') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
          <XSquare className="w-3.5 h-3.5" />
          {status || 'Aborted'}
        </span>
      );
    }
    if (s === 'succeeded' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30">
          <div className="bg-green-600 rounded-full p-[1px]">
            <CheckCircle className="w-2.5 h-2.5 text-white stroke-[3]" />
          </div>
          Succeeded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30">
        <Loader className="w-3.5 h-3.5 animate-spin" />
        {status || 'Running'}
      </span>
    );
  };

  const columns = [
    {
      header: "Status",
      id: "status",
      className: "w-[120px]",
      cell: ({ row }) => getStatusBadge(row.status)
    },
    {
      header: "Actor",
      accessorKey: "actor_name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border rounded-[4px] flex items-center justify-center shrink-0 bg-card border-border">
            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"></div>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13px] text-foreground">{row.actor_name || 'Unknown Actor'}</div>
            <div className="text-[12px] text-muted-foreground font-mono truncate">{row.actor_id}</div>
          </div>
        </div>
      )
    },
    {
      header: "Results",
      accessorKey: "results_count",
      className: "w-[100px]",
      cellClassName: "text-center",
      cell: ({ row }) => (
        <span className="text-[13px] font-medium text-blue-600 hover:underline dark:text-blue-400">
          {row.results_count || 0}
        </span>
      )
    },
    {
      header: "Started",
      accessorKey: "started_at",
      className: "w-[160px]",
      cell: ({ row }) => (
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
          {formatDate(row.started_at)}
        </span>
      )
    },
    {
      header: "Duration",
      accessorKey: "duration_seconds",
      className: "w-[100px] text-right",
      cellClassName: "text-right",
      cell: ({ row }) => (
        <span className="text-[13px] text-muted-foreground">
          {formatDuration(row.duration_seconds)}
        </span>
      )
    }
  ];

  return (
    <div className="min-h-screen p-8 font-sans transition-colors bg-background text-foreground">
      <div className="max-w-[1240px] mx-auto grid grid-cols-4 gap-8">


        <div className="col-span-3 space-y-8">

          <div className="flex gap-4 items-center">
            <div
              className={`w-[45px] h-[45px] rounded-full flex items-center justify-center text-white text-[18px] font-medium shrink-0 overflow-hidden shadow-sm ${currentWorkspace?.workspace_type === 'organization' ? 'bg-blue-600' : ''
                }`}
              style={{ background: currentWorkspace?.workspace_type === 'organization' ? undefined : user?.profile_color }}
            >
              {currentWorkspace?.workspace_type === 'organization' ? (
                <Building2 className="w-6 h-6" />
              ) : user?.profile_picture ? (
                <img src={user?.profile_picture} alt="" />
              ) : (
                userInitials || ''
              )}
            </div>
            <div className="pt-0.5">
              <div className="flex items-center gap-2.5 mb-0.5">
                <h1 className="text-[18px] font-bold tracking-tight text-foreground">
                  {currentWorkspace?.workspace_type === 'organization'
                    ? currentWorkspace.workspace_name
                    : (user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'User')}
                </h1>
                <span className="px-1.5 py-[1px] bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wide rounded-sm border border-orange-200 dark:border-orange-900/30">
                  {billingData?.plan ? `${billingData.plan} plan` : 'Free plan'}
                </span>
              </div>
              <div className="text-[14px] flex items-center gap-2 text-muted-foreground">
                <span className="font-mono px-1.5 py-0.5 rounded text-[13px] bg-muted text-muted-foreground">
                  {currentWorkspace?.workspace_type === 'organization'
                    ? (currentWorkspace.role || 'Member')
                    : (user?.username || 'username')}
                </span>
                {currentWorkspace?.workspace_type !== 'organization' && (
                  <>
                    <span>·</span>
                    <span className="font-normal">{user?.email || 'user@example.com'}</span>
                  </>
                )}
              </div>
            </div>
          </div>


          <div className="space-y-3">
            <h2 className="text-[17px] font-bold text-foreground">Recently viewed</h2>
            {loadingRecent ? (
              <LoadingScreen className="h-[68px]" />
            ) : recentActors.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {recentActors.slice(0, 4).map((actor, idx) => (
                  <ActorCard key={actor.id} actor={actor} recent={true} />
                ))}
              </div>
            ) : (
              <div className="text-sm italic py-4 text-muted-foreground">
                No recently viewed actors found.
              </div>
            )}
          </div>


          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold flex items-center gap-2 text-foreground">
                Suggested Actors for you
                <Info className="w-4 h-4 text-muted-foreground" />
              </h2>
              <div className="flex gap-4">
                <button onClick={() => navigate('/store')} className="text-[13px] font-medium hover:text-foreground text-muted-foreground">View all</button>
                <button className="text-[13px] font-medium hover:text-foreground text-muted-foreground">Hide</button>
              </div>
            </div>

            {loadingSuggested ? (
              <LoadingScreen className="min-h-[200px]" />
            ) : suggestedActors.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 p-2 -m-2">
                {suggestedActors.map((actor, idx) => (
                  <ActorCard key={actor.id} actor={actor} />
                ))}

                {suggestedActors.length === 2 && <div></div>}
              </div>
            ) : (
              <div className="text-sm italic py-8 text-center text-muted-foreground">
                No suggested actors available right now.
              </div>
            )}
          </div>


          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-foreground">Actor runs</h2>
              <span
                onClick={() => navigate('/runs')}
                className="text-[13px] font-medium cursor-pointer hover:underline text-muted-foreground hover:text-foreground"
              >
                View all runs
              </span>
            </div>

            <div className="flex gap-6 border-b border-border">
              <button
                onClick={() => setActiveTab('recent')}
                className={`pb-3 text-[14px] font-medium border-b-[2px] transition-colors ${activeTab === 'recent'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                Recent
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`pb-3 text-[14px] font-medium border-b-[2px] transition-colors ${activeTab === 'scheduled'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                Scheduled
              </button>
            </div>

            {activeTab === 'recent' && (
              <DataTable
                columns={columns}
                data={recentRuns}
                loading={loadingRuns}
                onRowClick={(row) => {
                  if (row?.results_count > 0) {
                    navigate(`/dataset/${row.id}`);
                  }
                }}
                emptyState="No recent runs found."
                className="max-h-[500px]"
              />
            )}
          </div>
        </div>


        <div className="col-span-1">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[16px] text-foreground">My issues</h3>
              <button className="text-sm font-medium border rounded px-3 py-1 transition-colors shadow-sm bg-card text-card-foreground border-border hover:bg-muted">
                View all
              </button>
            </div>
            <div className="text-sm text-muted-foreground">
              No active issues
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;

