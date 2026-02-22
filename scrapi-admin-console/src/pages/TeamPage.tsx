import React, { useState, useEffect } from 'react';
import { Terminal, ChevronLeft, ChevronRight } from 'lucide-react';
import type { User } from '../types';
import { useAlert } from '../context/AlertContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Table Skeleton Component
const TableSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center mb-4">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
        </div>

        <div className="bg-card shadow-sm rounded border border-border overflow-hidden">
            {/* Table Header */}
            <div className="bg-muted/30 px-6 py-3 border-b border-border flex gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-4 bg-muted rounded flex-1"></div>
                ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-6 py-4 flex gap-4 items-center">
                        <div className="h-8 w-8 bg-muted rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 bg-muted rounded"></div>
                            <div className="h-3 w-48 bg-muted/50 rounded"></div>
                        </div>
                        <div className="h-6 w-20 bg-muted rounded-full"></div>
                        <div className="h-6 w-24 bg-muted rounded-full"></div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const TeamPage: React.FC = () => {
    const { showAlert } = useAlert();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalMembers, setTotalMembers] = useState(0);
    const limit = 20;

    useEffect(() => {
        fetchTeam();
    }, [page]);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            const response = await fetch(`${BACKEND_URL}/api/admin/team?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch team');

            const data = await response.json();

            // Handle new paginated response format
            if (data.members) {
                setTeamMembers(data.members);
                setTotalPages(data.total_pages || 1);
                setTotalMembers(data.total || data.members.length);
            } else {
                // Fallback for old format
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

            let newPermissions;
            if (hasAccess) {
                newPermissions = currentPermissions.filter(p => p !== 'terminal_access');
            } else {
                newPermissions = [...currentPermissions, 'terminal_access'];
            }

            const token = localStorage.getItem('scrapi_admin_token');
            const response = await fetch(`${BACKEND_URL}/api/admin/team/${member.id}/permissions`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ permissions: newPermissions })
            });

            if (!response.ok) throw new Error('Failed to update permissions');

            // Optimistic update
            setTeamMembers(members => members.map(m =>
                m.id === member.id ? { ...m, permissions: newPermissions } : m
            ));

            showAlert(`Terminal access ${hasAccess ? 'revoked' : 'granted'}`, 'success');
        } catch (error) {
            console.error(error);
            showAlert('Failed to update permissions', 'error');
        }
    };

    if (loading && teamMembers.length === 0) return <TableSkeleton />;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Team Management</h1>

            <div className="bg-card shadow-sm rounded border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border table-fixed">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">User</th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">Terminal Access</th>
                                <th className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {teamMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs ring-1 ring-border shadow-sm mr-3">
                                                {member.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-foreground">{member.username}</div>
                                                <div className="text-[13px] text-muted-foreground">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full ${member.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                            }`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {member.role === 'owner' ? (
                                            <span className="text-[13px] text-muted-foreground/50">Full Access</span>
                                        ) : (
                                            <button
                                                onClick={() => toggleTerminalAccess(member)}
                                                className={`flex items-center space-x-1 px-3 py-1 rounded text-[13px] font-medium transition-colors ${(member.permissions || []).includes('terminal_access')
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                    }`}
                                            >
                                                <Terminal size={14} />
                                                <span>{(member.permissions || []).includes('terminal_access') ? 'Enabled' : 'Disabled'}</span>
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {member.is_active ? (
                                            <span className="px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Active</span>
                                        ) : (
                                            <span className="px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Suspended</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {teamMembers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-muted-foreground">
                                        No team members found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="bg-card px-4 py-3 border-t border-border sm:px-6">
                        <div className="flex items-center justify-between">
                            <div className="text-[13px] text-muted-foreground">
                                Showing <span className="font-medium text-foreground">{(page - 1) * limit + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * limit, totalMembers)}</span> of <span className="font-medium text-foreground">{totalMembers}</span> results
                            </div>
                            <div className="flex-1 flex justify-end space-x-3">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className={`relative inline-flex items-center px-4 py-1.5 border border-border text-[13px] font-medium rounded-sm bg-card 
                                        ${page === 1 ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'text-foreground hover:bg-muted/50 transition-colors'}`}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className={`relative inline-flex items-center px-4 py-1.5 border border-border text-[13px] font-medium rounded-sm bg-card
                                        ${page === totalPages ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'text-foreground hover:bg-muted/50 transition-colors'}`}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
