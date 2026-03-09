import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import type { AuditLog } from '../types';
import { useTheme } from '../context/ThemeContext';
import { clsx } from 'clsx';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const AuditLogs: React.FC = () => {
    const { theme } = useTheme();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(20);

    const fetchLogs = async (pageNum: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const response = await fetch(`${BACKEND_URL}/api/admin/audit-logs?page=${pageNum}&limit=${limit}`, {
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

    useEffect(() => { fetchLogs(1); }, [limit]);

    const columns: Column<AuditLog>[] = [
        {
            header: 'Time',
            accessorKey: 'created_at',
            cell: ({ row }) => <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>,
        },
        {
            header: 'Admin',
            accessorKey: 'admin_username',
            cell: ({ row }) => <span className="font-medium text-foreground">{row.admin_username}</span>,
        },
        {
            header: 'Action',
            accessorKey: 'action',
            cell: ({ row }) => (
                <span className={clsx(
                    "px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full border",
                    theme === 'dark'
                        ? "bg-blue-900/30 text-blue-400 border-blue-800/50"
                        : "bg-blue-100/50 text-blue-700 border-blue-200/50"
                )}>
                    {row.action}
                </span>
            ),
        },
        {
            header: 'Target',
            id: 'target',
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{row.target_type}</span>: {row.target_name || row.target_id}
                </span>
            ),
        },
        {
            header: 'Details',
            accessorKey: 'details',
            cellClassName: 'max-w-xs truncate',
            cell: ({ row }) => <span title={row.details || ''}>{row.details || '-'}</span>,
        },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText /> Audit Logs
            </h1>

            <DataTable
                columns={columns}
                data={logs}
                loading={loading}
                emptyState="No audit logs found."
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => fetchLogs(p)}
                itemsPerPage={limit}
                onItemsPerPageChange={(n) => { setLimit(n); setPage(1); }}
                totalItems={totalPages * limit}
            />
        </div>
    );
};
