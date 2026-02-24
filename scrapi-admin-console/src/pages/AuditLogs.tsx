import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import type { AuditLog } from '../types';
import { useTheme } from '../context/ThemeContext';
import { clsx } from 'clsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Table Skeleton
const TableSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 bg-muted rounded"></div>
            <div className="h-8 w-48 bg-muted rounded"></div>
        </div>

        <div className="bg-card shadow-sm rounded border border-border overflow-hidden">
            {/* Table Header */}
            <div className="bg-muted/30 px-6 py-3 border-b border-border flex gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-4 bg-muted rounded flex-1"></div>
                ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="px-6 py-4 flex gap-4 items-center">
                        <div className="h-4 w-32 bg-muted rounded"></div>
                        <div className="h-4 w-32 bg-muted rounded"></div>
                        <div className="h-6 w-20 bg-muted rounded-full"></div>
                        <div className="h-4 w-48 bg-muted rounded"></div>
                        <div className="h-4 w-full bg-muted/50 rounded"></div>
                    </div>
                ))}
            </div>
            <div className="bg-card px-4 py-3 border-t border-border flex justify-between items-center sm:px-6">
                <div className="h-8 w-24 bg-muted rounded"></div>
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-8 w-24 bg-muted rounded"></div>
            </div>
        </div>
    </div>
);

export const AuditLogs: React.FC = () => {
    const { theme } = useTheme();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = async (pageNum: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const response = await fetch(`${BACKEND_URL}/api/admin/audit-logs?page=${pageNum}&limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs);
                setTotalPages(data.total_pages);
                setPage(data.page);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
    }, []);

    if (loading && logs.length === 0) return <div className="space-y-6"><TableSkeleton /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText /> Audit Logs
            </h1>

            <div className="bg-card shadow-sm rounded border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border table-fixed">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">Time</th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">Admin</th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">Action</th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">Target</th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] text-muted-foreground">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                        {log.admin_username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                        <span className={clsx(
                                            "px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full border",
                                            theme === 'dark'
                                                ? "bg-blue-900/30 text-blue-400 border-blue-800/50"
                                                : "bg-blue-100/50 text-blue-700 border-blue-200/50"
                                        )}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] text-muted-foreground">
                                        <span className="font-medium text-foreground">{log.target_type}</span>: {log.target_name || log.target_id}
                                    </td>
                                    <td className="px-6 py-4 text-[13px] text-muted-foreground/80 max-w-xs truncate" title={log.details}>
                                        {log.details || '-'}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                                        No audit logs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-card px-4 py-3 border-t border-border flex items-center justify-between sm:px-6">
                    <div className="flex-1 flex justify-between">
                        <button
                            onClick={() => fetchLogs(page - 1)}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-border text-[13px] font-medium rounded-md text-foreground bg-card hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-[13px] text-muted-foreground self-center">
                            Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => fetchLogs(page + 1)}
                            disabled={page === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-[13px] font-medium rounded-md text-foreground bg-card hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
