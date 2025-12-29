import React from 'react';
import {
    Clock,
    CheckCircle,
    XSquare,
    Loader,
    StopCircle,
    MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RunsTable = ({
    runs,
    loading,
    selectedRuns,
    toggleRunSelection,
    toggleAllRunsSelection,
    abortRun,
    abortingRuns,
    handleAbortClick // Optional if we want to pass a handler wrapper
}) => {
    const navigate = useNavigate();

    // --- Helpers ---
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        // Returns date part: "12/29/2025"
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
        }).split('/').join('-').replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$1-$2');
    };

    const formatDateISO = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
            return dateString;
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getStatusContent = (status) => {
        const s = status?.toLowerCase() || '';

        // Config for different statuses
        if (s === 'failed') {
            return {
                icon: <XSquare className="w-5 h-5 text-red-500 rounded-[4px]" />,
                title: 'The Actor process failed.',
                subtext: 'Check logs for details.',
                textColor: 'text-foreground'
            };
        }
        if (s === 'aborted') {
            return {
                icon: <div className="w-5 h-5 border-[1.5px] border-orange-500 rounded-[4px] flex items-center justify-center"><div className="w-2 h-2 bg-orange-500 rounded-[1px]" /></div>,
                title: 'The Actor process was aborted.',
                subtext: 'You requested the abort.',
                textColor: 'text-foreground'
            };
        }
        if (s === 'succeeded' || s === 'completed') {
            return {
                icon: <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"><CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 stroke-[3]" /></div>,
                title: 'Scraping finished.',
                subtext: 'You can view all results in the dataset.',
                textColor: 'text-foreground'
            };
        }

        // Running / Queued
        return {
            icon: <Loader className="w-5 h-5 text-blue-500 animate-spin" />,
            title: 'Scraper is running...',
            subtext: 'Please wait for results.',
            textColor: 'text-foreground'
        };
    };

    const formatTaskDescription = (run) => {
        const actorName = run.actor_name || '';
        const input = run.input_data || {};

        if (actorName.toLowerCase().includes('amazon')) {
            const keywords = input.search_keywords?.join(', ') || 'N/A';
            return `Products: ${keywords}` + (input.max_results ? ` (max ${input.max_results})` : '');
        }

        if (actorName.toLowerCase().includes('seo') || input.url) {
            return `Analyze: ${input.url || 'N/A'}`;
        }

        const searchTerms = input.search_terms?.join(', ') || input.search_queries?.join(', ') || input.keywords?.join(', ');
        if (searchTerms) {
            return `${searchTerms}` + (input.location ? ` in ${input.location}` : '');
        }

        // Fallback
        const keys = Object.keys(input).filter(k => !['max_results', 'limit', 'proxy', 'extract_reviews', 'extract_images'].includes(k));
        if (keys.length > 0) {
            const val = input[keys[0]];
            return `${keys[0]}: ${Array.isArray(val) ? val.join(', ') : String(val)}`;
        }
        return '-';
    };

    const selectableRuns = runs.filter(r => r.status === 'running' || r.status === 'queued');
    const isAllSelected = selectableRuns.length > 0 && selectableRuns.every(r => selectedRuns.includes(r.id));

    return (
        <div className="relative border border-border rounded-lg bg-card overflow-hidden flex flex-col h-full shadow-sm">
            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 7px;
          background-color: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background-color: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
          transition: background-color 0.2s;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3f3f46;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #CBD5E1;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
           background-color: #52525b;
        }
      `}</style>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-max border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/10 text-left h-[44px]">
                            <th className="px-4 py-2 w-[50px]">
                                {selectableRuns.length > 0 ? (
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={toggleAllRunsSelection}
                                        className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500 bg-background cursor-pointer"
                                    />
                                ) : (
                                    <div className="w-4 h-4 rounded border border-input bg-background opacity-50" />
                                )}
                            </th>
                            {/* Status with Filter Icon */}
                            <th className="px-4 py-2 min-w-[300px]">
                                <div className="flex items-center gap-1.5 cursor-pointer group">
                                    <span className="text-[13px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Status</span>
                                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                </div>
                            </th>

                            <th className="px-4 py-2 min-w-[280px] text-[13px] font-medium text-muted-foreground">Actor</th>
                            <th className="px-4 py-2 min-w-[200px] text-[13px] font-medium text-muted-foreground">Task</th>
                            <th className="px-4 py-2 text-[13px] font-medium text-muted-foreground text-center">Results</th>
                            <th className="px-4 py-2 text-[13px] font-medium text-muted-foreground text-center">Usage</th>

                            <th className="px-4 py-2 min-w-[120px]">
                                <div className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                                    Started
                                    <span className="text-[10px] text-blue-500">↓</span>
                                </div>
                            </th>

                            <th className="px-4 py-2 min-w-[120px] text-[13px] font-medium text-muted-foreground">Finished</th>

                            {/* Extra Columns */}
                            <th className="px-4 py-2 min-w-[100px] text-[13px] font-medium text-muted-foreground">Duration</th>
                            <th className="px-4 py-2 min-w-[80px] text-[13px] font-medium text-muted-foreground">Build</th>
                            <th className="px-4 py-2 min-w-[80px] text-[13px] font-medium text-muted-foreground">Origin</th>
                            <th className="px-4 py-2 min-w-[80px] text-[13px] font-medium text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <tr key={idx}><td colSpan={12} className="px-4 py-6 border-b border-border"><div className="h-6 bg-muted rounded w-full animate-pulse"></div></td></tr>
                            ))
                        ) : runs.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-16 text-center text-muted-foreground text-sm">
                                    No runs found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            runs.map((run) => {
                                const statusData = getStatusContent(run.status);
                                const isSelected = selectedRuns.includes(run.id);
                                // Allow navigation for succeeded/completed runs
                                const isRowClickable = ['succeeded', 'completed'].includes(run.status?.toLowerCase());

                                return (
                                    <tr
                                        key={run.id}
                                        className={`group transition-colors h-[62px] hover:bg-muted/40 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} ${isRowClickable ? 'cursor-pointer' : ''}`}
                                        onClick={() => {
                                            if (isRowClickable) {
                                                navigate(`/dataset/${run.id}`);
                                            }
                                        }}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                                            <div className="pt-1.5">
                                                {(run.status === 'running' || run.status === 'queued') ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleRunSelection(run.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500 bg-background cursor-pointer"
                                                    />
                                                ) : (
                                                    <div className="w-4 h-4 rounded border border-border bg-muted/20" />
                                                )}
                                            </div>
                                        </td>

                                        {/* Status Message */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex gap-3">
                                                <div className="shrink-0 pt-0.5">
                                                    {statusData.icon}
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <span className="text-[13px] font-medium text-foreground leading-snug">
                                                        {statusData.title}
                                                    </span>
                                                    <span className="text-[12px] text-muted-foreground leading-snug truncate">
                                                        {statusData.subtext}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Actor */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex gap-3">
                                                <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0 text-xl shadow-sm">
                                                    {run.actor_icon || '📍'}
                                                </div>
                                                <div className="min-w-0 flex flex-col justify-center">
                                                    <div className="font-semibold text-[13px] text-foreground leading-snug">
                                                        {run.actor_name || 'Unknown Actor'}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground truncate leading-snug font-normal">
                                                        comp...places <span className="text-muted-foreground/60">@</span> Pay per event
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Task */}
                                        <td className="px-4 py-3 align-top">
                                            <span className="text-[13px] text-muted-foreground leading-snug line-clamp-2">
                                                {formatTaskDescription(run)}
                                            </span>
                                        </td>

                                        {/* Results */}
                                        <td className="px-4 py-3 align-top text-center pt-4">
                                            <span className={`text-[13.5px] font-medium ${isRowClickable && run.results_count > 0 ? 'text-blue-600 dark:text-blue-400 hover:underline' : 'text-muted-foreground'}`}>
                                                {run.results_count || 0}
                                            </span>
                                        </td>

                                        {/* Usage */}
                                        <td className="px-4 py-3 align-top text-center pt-4">
                                            <span className="text-[13.5px] font-medium text-foreground">
                                                {run.cost ? `$${run.cost.toFixed(2)}` : '$0.00'}
                                            </span>
                                        </td>

                                        {/* Started */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="text-[13px] text-foreground font-medium leading-tight">
                                                {formatDateISO(run.started_at)}
                                            </div>
                                            <div className="text-[12px] text-muted-foreground leading-tight mt-0.5">
                                                {formatTime(run.started_at)}
                                            </div>
                                        </td>

                                        {/* Finished */}
                                        <td className="px-4 py-3 align-top">
                                            <div className="text-[13px] text-foreground font-medium leading-tight">
                                                {formatDateISO(run.finished_at)}
                                            </div>
                                            <div className="text-[12px] text-muted-foreground leading-tight mt-0.5">
                                                {formatTime(run.finished_at)}
                                            </div>
                                        </td>

                                        {/* Duration */}
                                        <td className="px-4 py-3 align-top pt-4">
                                            <span className="text-[13px] text-muted-foreground">
                                                {run.duration_seconds ? `${run.duration_seconds}s` : '-'}
                                            </span>
                                        </td>

                                        {/* Build */}
                                        <td className="px-4 py-3 align-top pt-4">
                                            <span className="text-[13px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-normal">
                                                {run.build_number || '-'}
                                            </span>
                                        </td>

                                        {/* Origin */}
                                        <td className="px-4 py-3 align-top pt-4">
                                            <span className="text-[13px] text-muted-foreground">
                                                {run.origin || 'Web'}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 align-top text-right pt-3" onClick={(e) => e.stopPropagation()}>
                                            {(run.status === 'running' || run.status === 'queued') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (abortRun) abortRun(run.id);
                                                    }}
                                                    disabled={abortingRuns?.has(run.id)}
                                                    className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30 transition-colors inline-flex items-center gap-1"
                                                    title="Abort Run"
                                                >
                                                    {abortingRuns?.has(run.id) ? (
                                                        <>
                                                            <Clock className="w-3 h-3 animate-spin" />
                                                            Aborting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <StopCircle className="w-3 h-3" />
                                                            Abort
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RunsTable;
