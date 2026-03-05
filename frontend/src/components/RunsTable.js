import React from 'react';
import {
    Clock,
    CheckCircle,
    XSquare,
    Loader,
    StopCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from './ui/DataTable';
import Checkbox from './ui/CustomCheckbox';

const RunsTable = ({
    runs,
    loading,
    selectedRuns,
    toggleRunSelection,
    toggleAllRunsSelection,
    abortRun,
    abortingRuns,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
}) => {
    const navigate = useNavigate();

    // --- Helpers ---
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

        if (s === 'failed') {
            return {
                icon: <XSquare className="w-5 h-5 text-red-500 rounded-[4px]" />,
                title: 'The Actor process failed.',
                subtext: 'Check logs for details.',
            };
        }
        if (s === 'aborted') {
            return {
                icon: <div className="w-5 h-5 border-[1.5px] border-orange-500 rounded-[4px] flex items-center justify-center"><div className="w-2 h-2 bg-orange-500 rounded-[1px]" /></div>,
                title: 'The Actor process was aborted.',
                subtext: 'You requested the abort.',
            };
        }
        if (s === 'succeeded' || s === 'completed') {
            return {
                icon: <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"><CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 stroke-[3]" /></div>,
                title: 'Scraping finished.',
                subtext: 'You can view all results in the dataset.',
            };
        }

        return {
            icon: <Loader className="w-5 h-5 text-blue-500 animate-spin" />,
            title: 'Scraper is running...',
            subtext: 'Please wait for results.',
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

        const keys = Object.keys(input).filter(k => !['max_results', 'limit', 'proxy', 'extract_reviews', 'extract_images'].includes(k));
        if (keys.length > 0) {
            const val = input[keys[0]];
            return `${keys[0]}: ${Array.isArray(val) ? val.join(', ') : String(val)}`;
        }
        return '-';
    };

    const selectableRuns = runs.filter(r => r.status === 'running' || r.status === 'queued');
    const isAllSelected = selectableRuns.length > 0 && selectableRuns.every(r => selectedRuns.includes(r.id));

    const columns = [
        {
            id: 'selection',
            header: (
                <div className="flex items-center justify-center w-full">
                    {selectableRuns.length > 0 ? (
                        <Checkbox
                            checked={isAllSelected}
                            onChange={toggleAllRunsSelection}
                        />
                    ) : (
                        <div className="w-[18px] h-[18px] rounded-[4px] border border-input bg-background opacity-50" />
                    )}
                </div>
            ),
            className: "w-[50px] px-2",
            cell: ({ row }) => (
                <div className="flex items-center justify-center w-full" onClick={(e) => e.stopPropagation()}>
                    {(row.status === 'running' || row.status === 'queued') ? (
                        <Checkbox
                            checked={selectedRuns.includes(row.id)}
                            onChange={() => toggleRunSelection(row.id)}
                        />
                    ) : (
                        <div className="w-[18px] h-[18px] rounded-[4px] border border-border bg-muted/20" />
                    )}
                </div>
            )
        },
        {
            header: "Status",
            className: "min-w-[300px]",
            cell: ({ row }) => {
                const statusData = getStatusContent(row.status);
                return (
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
                );
            }
        },
        {
            header: "Actor",
            className: "min-w-[280px]",
            cell: ({ row }) => (
                <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0 text-xl shadow-sm">
                        {row.actor_icon || '📍'}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <div className="font-semibold text-[13px] text-foreground leading-snug">
                            {row.actor_name || 'Unknown Actor'}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate leading-snug font-normal">
                            comp...places <span className="text-muted-foreground/60">@</span> Pay per event
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: "Task",
            className: "min-w-[200px]",
            cell: ({ row }) => (
                <span className="text-[13px] text-muted-foreground leading-snug line-clamp-2">
                    {formatTaskDescription(row)}
                </span>
            )
        },
        {
            header: "Results",
            className: "text-center",
            cellClassName: "text-center",
            cell: ({ row }) => {
                const isNavigable = ['succeeded', 'completed'].includes(row.status?.toLowerCase());
                return (
                    <span className={`text-[13.5px] font-medium ${isNavigable && row.results_count > 0 ? 'text-blue-600 dark:text-blue-400 hover:underline' : 'text-muted-foreground'}`}>
                        {row.results_count || 0}
                    </span>
                );
            }
        },
        {
            header: "Usage",
            className: "text-center",
            cellClassName: "text-center",
            cell: ({ row }) => (
                <span className="text-[13.5px] font-medium text-foreground">
                    {row.cost ? `$${row.cost.toFixed(2)}` : '$0.00'}
                </span>
            )
        },
        {
            header: "Started",
            className: "min-w-[120px]",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <div className="text-[13px] text-foreground font-medium leading-tight">
                        {formatDateISO(row.started_at)}
                    </div>
                    <div className="text-[12px] text-muted-foreground leading-tight mt-0.5">
                        {formatTime(row.started_at)}
                    </div>
                </div>
            )
        },
        {
            header: "Finished",
            className: "min-w-[120px]",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <div className="text-[13px] text-foreground font-medium leading-tight">
                        {formatDateISO(row.finished_at)}
                    </div>
                    <div className="text-[12px] text-muted-foreground leading-tight mt-0.5">
                        {formatTime(row.finished_at)}
                    </div>
                </div>
            )
        },
        {
            header: "Duration",
            className: "min-w-[100px]",
            cell: ({ row }) => (
                <span className="text-[13px] text-muted-foreground">
                    {row.duration_seconds ? `${row.duration_seconds}s` : '-'}
                </span>
            )
        },
        {
            header: "Build",
            className: "min-w-[80px]",
            cell: ({ row }) => (
                <span className="text-[13px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-normal">
                    {row.build_number || '-'}
                </span>
            )
        },
        {
            header: "Origin",
            className: "min-w-[80px]",
            cell: ({ row }) => (
                <span className="text-[13px] text-muted-foreground">
                    {row.origin || 'Web'}
                </span>
            )
        },
        {
            header: "Actions",
            className: "min-w-[80px] text-right px-4",
            cellClassName: "text-right",
            cell: ({ row }) => {
                if (row.status !== 'running' && row.status !== 'queued') return null;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => abortRun && abortRun(row.id)}
                            disabled={abortingRuns?.has(row.id)}
                            className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30 transition-colors inline-flex items-center gap-1"
                            title="Abort Run"
                        >
                            {abortingRuns?.has(row.id) ? (
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
                    </div>
                );
            }
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={runs}
            loading={loading}
            onRowClick={(row) => {
                if (['succeeded', 'completed'].includes(row.status?.toLowerCase())) {
                    navigate(`/dataset/${row.id}`);
                }
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={onItemsPerPageChange}
            totalItems={totalItems}
        />
    );
};

export default RunsTable;
