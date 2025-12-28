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
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProfileColor, getUserInitials, getUserDisplayName } from '../utils/userUtils';
import { useTheme } from '../contexts/ThemeContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState('recent');
  const [recentActors, setRecentActors] = useState([]);
  const [suggestedActors, setSuggestedActors] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);

  const userInitials = getUserInitials(user);
  const userDisplayName = getUserDisplayName(user);

  const profileColor = getProfileColor(user?.profile_color, theme);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Fetch recently viewed actors
        const recentViewsRes = await axios.get(`${BACKEND_URL}/api/actors/recently-viewed?limit=4`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const recentViewsData = Array.isArray(recentViewsRes.data)
          ? recentViewsRes.data
          : [];

        setRecentActors(recentViewsData);

        // Fetch suggested actors (smart suggestions based on recent views)
        const suggestedRes = await axios.get(`${BACKEND_URL}/api/actors/suggested?limit=6`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const suggestedData = Array.isArray(suggestedRes.data)
          ? suggestedRes.data
          : [];

        setSuggestedActors(suggestedData);

        // Fetch recent runs
        const runsRes = await axios.get(`${BACKEND_URL}/api/runs`);

        const runsData = Array.isArray(runsRes.data?.runs)
          ? runsRes.data.runs
          : (Array.isArray(runsRes.data) ? runsRes.data : []);

        setRecentRuns(runsData);

      } catch (error) {
        console.error("Failed to fetch home data:", error);

        setRecentActors([]);
        setSuggestedActors([]);
        setRecentRuns([]);
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

  return (
    <div className="min-h-screen p-8 font-sans transition-colors bg-background text-foreground">
      <div className="max-w-[1240px] mx-auto grid grid-cols-4 gap-8">


        <div className="col-span-3 space-y-8">

          <div className="flex gap-4 items-center">
            <div
              className="w-[45px] h-[45px] rounded-full flex items-center justify-center text-white text-[18px] font-medium shrink-0 shadow-sm"
              style={{ background: user?.profile_color }}
            >
              {userInitials || 'G'}
            </div>
            <div className="pt-0.5">
              <div className="flex items-center gap-2.5 mb-0.5">
                <h1 className="text-[18px] font-bold tracking-tight text-foreground">
                  {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'User'}
                </h1>
                <span className="px-1.5 py-[1px] bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wide rounded-sm border border-orange-200 dark:border-orange-900/30">
                  Free plan
                </span>
              </div>
              <div className="text-[14px] flex items-center gap-2 text-muted-foreground">
                <span className="font-mono px-1.5 py-0.5 rounded text-[13px] bg-muted text-muted-foreground">
                  {user?.username || 'username'}
                </span>
                <span>·</span>
                <span className="font-normal">{user?.email || 'user@example.com'}</span>
              </div>
            </div>
          </div>


          <div className="space-y-3">
            <h2 className="text-[17px] font-bold text-foreground">Recently viewed</h2>
            {recentActors.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {recentActors.slice(0, 4).map((actor, idx) => (
                  <div
                    key={actor.id}
                    onClick={() => navigate(`/actor/${actor.id}`)}
                    className="group border rounded-lg p-3 transition-all cursor-pointer flex items-start gap-3 h-[68px] hover:shadow-md hover:-translate-y-0.5 bg-card border-border hover:border-muted-foreground/30"
                  >
                    <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 border bg-card border-border">
                      {actor.icon || <Play className="w-4 h-4 text-blue-500 fill-blue-500" />}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center h-full">
                      <h3 className="font-semibold text-[13px] truncate leading-tight mb-0.5 text-card-foreground">
                        {actor.name}
                      </h3>
                      <p className="text-[11px] truncate leading-tight text-muted-foreground">
                        Last viewed {formatDate(actor.last_viewed_at || actor.last_run_at || new Date().toISOString())}
                      </p>
                    </div>
                  </div>
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

            {suggestedActors.length > 0 ? (
              <div className="grid grid-cols-3 gap-6">
                {suggestedActors.map((actor, idx) => (
                  <div
                    key={actor.id}
                    className="border rounded-xl p-5 transition-all cursor-pointer flex flex-col h-full hover:shadow-lg hover:-translate-y-1 bg-card border-border hover:border-muted-foreground/30"
                    onClick={() => navigate(`/actor/${actor.id}`)}
                  >

                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-[40px] h-[40px] border rounded-lg flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden bg-card border-border">
                        {actor?.icon || <MapPin className="w-7 h-7 text-red-500" />}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h3 className="font-bold text-[15px] leading-tight mb-1 text-card-foreground">{actor.name}</h3>
                        <div className="flex items-center text-[12px] gap-0.5 text-muted-foreground">
                          <span className="font-medium text-foreground">{actor.author_name || 'unknown'}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="truncate">{actor.category || 'general'}</span>
                        </div>
                      </div>
                    </div>


                    <p className="text-[13.5px] leading-5 mb-5 line-clamp-3 text-muted-foreground">
                      {actor.description}
                    </p>


                    <div className="mt-auto pt-4 border-t flex items-center gap-5 text-[12px] font-medium border-border text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{actor.runs_count || '0'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-foreground">{actor.rating || '0.0'}</span>
                        <span className="text-muted-foreground font-normal">({actor.reviews_count || '0'})</span>
                      </div>
                    </div>
                  </div>
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
              <div className="border rounded-lg overflow-hidden border-border bg-card">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="w-[50px] px-4 py-2 text-left text-[12px] font-semibold text-muted-foreground">Status</th>
                      <th className="w-[45%] px-4 py-2 text-left text-[12px] font-semibold text-muted-foreground">Actor</th>
                      <th className="w-[10%] px-4 py-2 text-left text-[12px] font-semibold text-muted-foreground">Results</th>
                      <th className="w-[15%] px-4 py-2 text-left text-[12px] font-semibold text-muted-foreground">Started</th>
                      <th className="w-[10%] px-4 py-2 text-left text-[12px] font-semibold text-muted-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentRuns.length > 0 ? (
                      recentRuns.map((run) => (
                        <tr
                          key={run.id}
                          className="group cursor-pointer hover:bg-muted/50"
                        >
                          <td className="px-4 py-2">
                            {getStatusBadge(run.status)}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 border rounded-[4px] flex items-center justify-center shrink-0 bg-card border-border">
                                {/* Mimic icons */}
                                <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"></div>
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[13px] text-foreground">{run.actor_name || 'Unknown Actor'}</div>
                                <div className="text-[12px] text-muted-foreground font-mono truncate">{run.actor_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[13px] font-medium text-blue-600 hover:underline dark:text-blue-400">
                              {run.results_count || 0}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-[13px] text-muted-foreground">
                            {formatDate(run.started_at)}
                          </td>
                          <td className="px-4 py-2 text-[13px] text-muted-foreground">
                            {formatDuration(run.duration_seconds)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No recent runs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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

