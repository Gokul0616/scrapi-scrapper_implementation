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
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]">
          <XSquare className="w-3.5 h-3.5" />
          {status || 'Aborted'}
        </span>
      );
    }
    if (s === 'succeeded' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
          <div className="bg-green-600 rounded-full p-[1px]">
            <CheckCircle className="w-2.5 h-2.5 text-white stroke-[3]" />
          </div>
          Succeeded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <Loader className="w-3.5 h-3.5 animate-spin" />
        {status || 'Running'}
      </span>
    );
  };

  return (
    <div className={`min-h-screen p-8 font-sans transition-colors ${theme === 'dark' ? 'bg-[#1A1B1E] text-white' : 'bg-white text-[#111827]'}`}>
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
                <h1 className={`text-[18px] font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>
                  {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'User'}
                </h1>
                <span className="px-1.5 py-[1px] bg-[#FFEDD5] text-[#C2410C] text-[10px] font-bold uppercase tracking-wide rounded-sm border border-[#FED7AA]">
                  Free plan
                </span>
              </div>
              <div className={`text-[14px] flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                <span className={`font-mono px-1.5 py-0.5 rounded text-[13px] ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  {user?.username || 'username'}
                </span>
                <span>·</span>
                <span className="font-normal">{user?.email || 'user@example.com'}</span>
              </div>
            </div>
          </div>


          <div className="space-y-3">
            <h2 className={`text-[17px] font-bold ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>Recently viewed</h2>
            {recentActors.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {recentActors.slice(0, 4).map((actor, idx) => (
                  <div
                    key={actor.id}
                    onClick={() => navigate(`/actor/${actor.id}`)}
                    className={`group border rounded-lg p-3 transition-all cursor-pointer flex items-start gap-3 h-[68px] hover:shadow-md hover:-translate-y-0.5 ${theme === 'dark'
                      ? 'bg-[#1A1B1E] border-gray-800 hover:border-gray-700'
                      : 'bg-white border-[#E5E7EB] hover:border-gray-300'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 border ${theme === 'dark' ? 'bg-[#1A1B1E] border-gray-800' : 'bg-white border-[#E5E7EB]'
                      }`}>
                      {actor.icon || <Play className="w-4 h-4 text-[#3B82F6] fill-[#3B82F6]" />}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center h-full">
                      <h3 className={`font-semibold text-[13px] truncate leading-tight mb-0.5 ${theme === 'dark' ? 'text-gray-200' : 'text-[#111827]'}`}>
                        {actor.name}
                      </h3>
                      <p className={`text-[11px] truncate leading-tight ${theme === 'dark' ? 'text-gray-500' : 'text-[#6B7280]'}`}>
                        Last viewed {formatDate(actor.last_viewed_at || actor.last_run_at || new Date().toISOString())}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-sm italic py-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                No recently viewed actors found.
              </div>
            )}
          </div>


          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={`text-[17px] font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>
                Suggested Actors for you
                <Info className="w-4 h-4 text-[#9CA3AF]" />
              </h2>
              <div className="flex gap-4">
                <button onClick={() => navigate('/store')} className={`text-[13px] font-medium hover:text-[#111827] ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-[#4B5563]'}`}>View all</button>
                <button className={`text-[13px] font-medium hover:text-[#111827] ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-[#4B5563]'}`}>Hide</button>
              </div>
            </div>

            {suggestedActors.length > 0 ? (
              <div className="grid grid-cols-3 gap-6">
                {suggestedActors.map((actor, idx) => (
                  <div
                    key={actor.id}
                    className={`border rounded-xl p-5 transition-all cursor-pointer flex flex-col h-full hover:shadow-lg hover:-translate-y-1 ${theme === 'dark'
                      ? 'bg-[#1A1B1E] border-gray-800 hover:border-gray-700'
                      : 'bg-white border-[#E5E7EB] hover:border-gray-300'
                      }`}
                    onClick={() => navigate(`/actor/${actor.id}`)}
                  >

                    <div className="flex items-start gap-4 mb-3">
                      <div className={`w-[40px] h-[40px] border rounded-lg flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden ${theme === 'dark' ? 'bg-[#1A1B1E] border-gray-800' : 'bg-white border-[#E5E7EB]'
                        }`}>
                        {actor?.icon || <MapPin className="w-7 h-7 text-red-500" />}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h3 className={`font-bold text-[15px] leading-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>{actor.name}</h3>
                        <div className={`flex items-center text-[12px] gap-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                          <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-[#4B5563]'}`}>{actor.author_name || 'unknown'}</span>
                          <span className="text-gray-300">/</span>
                          <span className="truncate">{actor.category || 'general'}</span>
                        </div>
                      </div>
                    </div>


                    <p className={`text-[13.5px] leading-5 mb-5 line-clamp-3 ${theme === 'dark' ? 'text-gray-400' : 'text-[#4B5563]'}`}>
                      {actor.description}
                    </p>


                    <div className={`mt-auto pt-4 border-t flex items-center gap-5 text-[12px] font-medium ${theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-[#F3F4F6] text-[#4B5563]'
                      }`}>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#9CA3AF]" />
                        <span>{actor.runs_count || '0'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-[#EAB308] fill-[#EAB308]" />
                        <span className={theme === 'dark' ? 'text-gray-200' : 'text-[#111827]'}>{actor.rating || '0.0'}</span>
                        <span className="text-[#9CA3AF] font-normal">({actor.reviews_count || '0'})</span>
                      </div>
                    </div>
                  </div>
                ))}

                {suggestedActors.length === 2 && <div></div>}
              </div>
            ) : (
              <div className={`text-sm italic py-8 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                No suggested actors available right now.
              </div>
            )}
          </div>


          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={`text-[17px] font-bold ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>Actor runs</h2>
              <span
                onClick={() => navigate('/runs')}
                className={`text-[13px] font-medium cursor-pointer hover:underline ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-[#4B5563] hover:text-[#111827]'}`}
              >
                View all runs
              </span>
            </div>

            <div className={`flex gap-6 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-[#E5E7EB]'}`}>
              <button
                onClick={() => setActiveTab('recent')}
                className={`pb-3 text-[14px] font-medium border-b-[2px] transition-colors ${activeTab === 'recent'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : `border-transparent ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-[#6B7280] hover:text-[#374151]'}`
                  }`}
              >
                Recent
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`pb-3 text-[14px] font-medium border-b-[2px] transition-colors ${activeTab === 'scheduled'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : `border-transparent ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-[#6B7280] hover:text-[#374151]'}`
                  }`}
              >
                Scheduled
              </button>
            </div>

            {activeTab === 'recent' && (
              <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-gray-800 bg-[#1A1B1E]' : 'border-[#E5E7EB] bg-white'}`}>
                <table className="w-full table-fixed">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-800 bg-[#1A1B1E]' : 'border-[#E5E7EB] bg-white'}`}>
                      <th className={`w-[50px] px-4 py-2 text-left text-[12px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>Status</th>
                      <th className={`w-[45%] px-4 py-2 text-left text-[12px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>Actor</th>
                      <th className={`w-[10%] px-4 py-2 text-left text-[12px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>Results</th>
                      <th className={`w-[15%] px-4 py-2 text-left text-[12px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>Started</th>
                      <th className={`w-[10%] px-4 py-2 text-left text-[12px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>Duration</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-[#E5E7EB]'}`}>
                    {recentRuns.length > 0 ? (
                      recentRuns.map((run) => (
                        <tr
                          key={run.id}
                          className={`group cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-[#F9FAFB]'}`}
                        >
                          <td className="px-4 py-2">
                            {getStatusBadge(run.status)}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 border rounded-[4px] flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                                }`}>
                                {/* Mimic icons */}
                                <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"></div>
                              </div>
                              <div className="min-w-0">
                                <div className={`font-semibold text-[13px] ${theme === 'dark' ? 'text-gray-200' : 'text-[#111827]'}`}>{run.actor_name || 'Unknown Actor'}</div>
                                <div className="text-[12px] text-[#9CA3AF] font-mono truncate">{run.actor_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[13px] font-medium text-[#2563EB] hover:underline">
                              {run.results_count || 0}
                            </span>
                          </td>
                          <td className={`px-4 py-2 text-[13px] ${theme === 'dark' ? 'text-gray-400' : 'text-[#4B5563]'}`}>
                            {formatDate(run.started_at)}
                          </td>
                          <td className={`px-4 py-2 text-[13px] ${theme === 'dark' ? 'text-gray-400' : 'text-[#4B5563]'}`}>
                            {formatDuration(run.duration_seconds)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className={`px-4 py-8 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
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
              <h3 className={`font-bold text-[16px] ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>My issues</h3>
              <button className={`text-sm font-medium border rounded px-3 py-1 transition-colors shadow-sm ${theme === 'dark'
                ? 'text-gray-300 border-gray-600 bg-gray-800 hover:bg-gray-700'
                : 'text-[#374151] border-[#D1D5DB] bg-white hover:bg-gray-50'
                }`}>
                View all
              </button>
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-[#6B7280]'}`}>
              No active issues
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;

