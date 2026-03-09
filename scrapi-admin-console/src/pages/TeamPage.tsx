import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import type { User } from '../types';
import { useAlert } from '../context/AlertContext';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const TeamPage: React.FC = () => {
    const { showAlert } = useAlert();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalMembers, setTotalMembers] = useState(0);
    const [limit, setLimit] = useState(20);

    useEffect(() => { fetchTeam(); }, [page, limit]);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
            const response = await fetch(`${BACKEND_URL}/api/admin/team?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch team');
            const data = await response.json();
            if (data.members) {
                setTeamMembers(data.members);
                setTotalPages(data.total_pages || 1);
                setTotalMembers(data.total || data.members.length);
            } else {
                setTeamMembers(Array.isArray(data) ? data : []);
                setTotalMembers(Array.isArray(data) ? data.length : 0);
                setTotalPages(1);
            }
        } catch (error) {
            console.error(error);
            showAlert('Failed to load team members', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleTerminalAccess = async (member: User) => {
        try {
            const currentPermissions = member.permissions || [];
            const hasAccess = currentPermissions.includes('terminal_access');
            const newPermissions = hasAccess
                ? currentPermissions.filter(p => p !== 'terminal_access')
                : [...currentPermissions, 'terminal_access'];

            const token = localStorage.getItem('scrapi_admin_token');
            const response = await fetch(`${BACKEND_URL}/api/admin/team/${member.id}/permissions`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions: newPermissions })
            });
            if (!response.ok) throw new Error('Failed to update permissions');
            setTeamMembers(members => members.map(m => m.id === member.id ? { ...m, permissions: newPermissions } : m));
            showAlert(`Terminal access ${hasAccess ? 'revoked' : 'granted'}`, 'success');
        } catch (error) {
            console.error(error);
            showAlert('Failed to update permissions', 'error');
        }
    };

    const columns: Column<User>[] = [
        {
            header: 'User',
            id: 'user',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs ring-1 ring-border shadow-sm shrink-0">
                        {row.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-foreground">{row.username}</div>
                        <div className="text-[13px] text-muted-foreground">{row.email}</div>
                    </div>
                </div>
            ),
        },
        {
            header: 'Role',
            accessorKey: 'role',
            cell: ({ row }) => (
                <span className={`px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full ${row.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                    {row.role}
                </span>
            ),
        },
        {
            header: 'Terminal Access',
            id: 'terminal',
            cell: ({ row }) => row.role === 'owner' ? (
                <span className="text-[13px] text-muted-foreground/50">Full Access</span>
            ) : (
                <button
                    onClick={(e) => { e.stopPropagation(); toggleTerminalAccess(row); }}
                    className={`flex items-center space-x-1 px-3 py-1 rounded text-[13px] font-medium transition-colors ${(row.permissions || []).includes('terminal_access') ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                    <Terminal size={14} />
                    <span>{(row.permissions || []).includes('terminal_access') ? 'Enabled' : 'Disabled'}</span>
                </button>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'is_active',
            cell: ({ row }) => row.is_active ? (
                <span className="px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Active</span>
            ) : (
                <span className="px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Suspended</span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Team Management</h1>

            <DataTable
                columns={columns}
                data={teamMembers}
                loading={loading}
                emptyState="No team members found."
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                itemsPerPage={limit}
                onItemsPerPageChange={(n) => { setLimit(n); setPage(1); }}
                totalItems={totalMembers}
            />
        </div>
    );
};
