import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter } from 'lucide-react';
import type { AuditLog } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const AuditLogs: React.FC = () => {
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

    if (loading && logs.length === 0) return <div className="p-6">Loading audit logs...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-aws-text flex items-center gap-2">
                <FileText /> Audit Logs
            </h1>

            <div className="bg-white shadow-sm rounded border border-aws-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-aws-border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">Admin</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">Target</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-aws-border">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-aws-text-secondary">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-aws-text">
                                        {log.admin_username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-aws-text">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-aws-text">
                                        {log.target_type}: {log.target_name || log.target_id}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.details}>
                                        {log.details || '-'}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        No audit logs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 <div className="bg-white px-4 py-3 border-t border-aws-border flex items-center justify-between sm:px-6">
                    <div className="flex-1 flex justify-between">
                        <button 
                            onClick={() => fetchLogs(page - 1)}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700 self-center">
                            Page {page} of {totalPages}
                        </span>
                        <button 
                            onClick={() => fetchLogs(page + 1)}
                            disabled={page === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
