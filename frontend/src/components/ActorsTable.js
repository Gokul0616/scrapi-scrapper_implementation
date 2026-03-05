import React from 'react';
import { Star, StarOff, Play, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from './ui/DataTable';
import Checkbox from './ui/CustomCheckbox';

const ActorsTable = ({
    actors,
    loading,
    selectedActors,
    toggleActorSelection,
    toggleAllActorsSelection,
    toggleStar,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
}) => {
    const navigate = useNavigate();

    const formatDate = (dateString) => {
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
        if (seconds < 60) return `${seconds} s`;
        return `${Math.floor(seconds / 60)} m ${seconds % 60} s`;
    };

    const getStatusBadge = (status) => {
        const s = status?.toLowerCase() || '';
        const statusConfig = {
            succeeded: { bg: 'bg-green-50 dark:bg-green-900/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-900/30', icon: '✓' },
            running: { bg: 'bg-blue-50 dark:bg-blue-900/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/30', icon: '↻' },
            failed: { bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900/30', icon: '✗' },
            queued: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', icon: '⋯' },
            aborted: { bg: 'bg-orange-50 dark:bg-orange-900/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-900/30', icon: '!' }
        };

        const config = statusConfig[s] || statusConfig.queued;
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-medium border ${config.bg} ${config.text} ${config.border}`}>
                <span className="mr-1">{config.icon}</span>
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
            </span>
        );
    };

    const columns = [
        {
            id: 'selection',
            header: (
                <Checkbox
                    checked={actors.length > 0 && selectedActors.length === actors.length}
                    onChange={toggleAllActorsSelection}
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedActors.includes(row.id)}
                    onChange={() => toggleActorSelection(row.id)}
                />
            ),
            className: "w-[50px]",
        },
        {
            header: "Actor",
            accessorKey: "name",
            className: "min-w-[300px]",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center shrink-0 text-2xl shadow-sm">
                        {row.icon}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-[13px] text-foreground leading-snug truncate">
                                {row.name}
                            </span>
                            {row.type === 'prebuilt' && (
                                <span className="text-[10px] text-blue-500 font-bold" title="Verified Prebuilt Actor">✓</span>
                            )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate leading-snug font-normal">
                            {row.category || 'Utility/Crawler'}
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(row.id, row.is_starred);
                        }}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Star
                            className={`w-4 h-4 ${row.is_starred
                                ? 'fill-yellow-400 text-yellow-400 opacity-100'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        />
                    </button>
                    {row.is_starred && (
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-100 block group-hover:hidden" />
                    )}
                </div>
            )
        },
        {
            header: "Total Runs",
            accessorKey: "total_runs",
            className: "text-center",
            cellClassName: "text-center",
            cell: ({ row }) => (
                <span className="text-[13px] font-medium text-foreground">
                    {row.total_runs || 0}
                </span>
            )
        },
        {
            header: "Pricing Model",
            accessorKey: "pricing_model",
            cell: ({ row }) => (
                <span className="text-[13px] text-muted-foreground">
                    {row.pricing_model === 'pay_per_event' ? 'Pay per event' : 'Free'}
                </span>
            )
        },
        {
            header: "Last Run Started",
            accessorKey: "last_run_started",
            className: "min-w-[160px]",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-[13px] text-foreground font-medium">
                        {row.last_run_started ? new Date(row.last_run_started).toISOString().split('T')[0] : '-'}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                        {row.last_run_started ? new Date(row.last_run_started).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                </div>
            )
        },
        {
            header: "Last Run Status",
            accessorKey: "last_run_status",
            className: "text-center",
            cellClassName: "text-center",
            cell: ({ row }) => getStatusBadge(row.last_run_status)
        },
        {
            header: "Last Run Duration",
            accessorKey: "last_run_duration",
            className: "text-right",
            cellClassName: "text-right",
            cell: ({ row }) => (
                <span className="text-[13px] text-muted-foreground">
                    {formatDuration(row.last_run_duration)}
                </span>
            )
        }
    ];

    const emptyState = (
        <div className="flex flex-col items-center justify-center space-y-2">
            <MapPin className="w-10 h-10 text-muted-foreground/30" />
            <div className="text-sm font-medium">No actors found</div>
            <div className="text-xs text-muted-foreground">Go to Marketplace or Store to add actors.</div>
        </div>
    );

    return (
        <DataTable
            columns={columns}
            data={actors}
            loading={loading}
            onRowClick={(row) => navigate(`/actor/${row.id}`)}
            emptyState={emptyState}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={onItemsPerPageChange}
            totalItems={totalItems}
        />
    );
};

export default ActorsTable;
