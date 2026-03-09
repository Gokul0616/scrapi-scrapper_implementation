import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Shield, ShieldOff, X } from 'lucide-react';
import type { User } from '../types';
import { useAlert } from '../context/AlertContext';
import { Modal } from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Filter options
const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'pending_deletion', label: 'Scheduled for Deletion' },
    { value: 'deleted', label: 'Deleted' }
];

const ROLE_OPTIONS = [
    { value: 'all', label: 'All Roles' },
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
    { value: 'owner', label: 'Owner' }
];

const PLAN_OPTIONS = [
    { value: 'all', label: 'All Plans' },
    { value: 'Free', label: 'Free' },
    { value: 'Pro', label: 'Pro' },
    { value: 'Premium', label: 'Premium' },
    { value: 'Enterprise', label: 'Enterprise' }
];



export const UsersPage: React.FC = () => {
    const { showAlert } = useAlert();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [limit, setLimit] = useState(20);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        user: User | null;
        action: 'suspend' | 'activate' | null;
        isLoading: boolean;
    }>({
        isOpen: false,
        user: null,
        action: null,
        isLoading: false
    });

    useEffect(() => {
        fetchUsers();
    }, [page, searchTerm, statusFilter, roleFilter, planFilter, limit]); // Refetch when filters change

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            if (!token) throw new Error('No token found');

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }

            if (statusFilter && statusFilter !== 'all') {
                queryParams.append('status_filter', statusFilter);
            }

            if (roleFilter && roleFilter !== 'all') {
                queryParams.append('role_filter', roleFilter);
            }

            if (planFilter && planFilter !== 'all') {
                queryParams.append('plan_filter', planFilter);
            }

            const response = await fetch(`${BACKEND_URL}/api/admin/users?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            // Handle new response format
            if (data.users) {
                setUsers(data.users);
                setTotalPages(data.total_pages);
                setTotalUsers(data.total);
            } else {
                // Fallback for old format if API wasn't updated (safety)
                setUsers(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load users');
            showAlert('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const confirmToggleStatus = (user: User) => {
        const action = user.is_active ? 'suspend' : 'activate';
        setModalConfig({
            isOpen: true,
            user,
            action,
            isLoading: false
        });
    };

    const handleConfirmAction = async () => {
        const { user, action } = modalConfig;
        if (!user || !action) return;

        setModalConfig(prev => ({ ...prev, isLoading: true }));

        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const response = await fetch(`${BACKEND_URL}/api/admin/users/${user.id}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(user.is_active ? { reason: "Manual suspension" } : {})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Action failed');
            }

            // Update local state optimistic or refetch
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
            showAlert(`User ${action}ed successfully`, 'success');
            setModalConfig({ isOpen: false, user: null, action: null, isLoading: false });
        } catch (err: any) {
            console.error(err);
            // Show backend error message in custom alert
            showAlert(err.message || "Failed to update user status", 'error');
            setModalConfig(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to page 1 on search
    };

    const clearFilters = () => {
        setStatusFilter('all');
        setRoleFilter('all');
        setPlanFilter('all');
        setPage(1);
    };

    const hasActiveFilters = statusFilter !== 'all' || roleFilter !== 'all' || planFilter !== 'all';

    const getStatusBadge = (user: User) => {
        if (user.account_status === 'deleted') {
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Deleted</span>;
        }
        if (user.account_status === 'pending_deletion') {
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Deletion</span>;
        }
        if (!user.is_active) {
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Suspended</span>;
        }
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>;
    };

    if (error && users.length === 0) return <div className="p-6 text-red-600">{error}</div>;

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
                        {row.organization_name && <div className="text-[12px] text-muted-foreground/70">{row.organization_name}</div>}
                    </div>
                </div>
            ),
        },
        {
            header: 'Role',
            accessorKey: 'role',
            cell: ({ row }) => (
                <span className={`px-2 inline-flex text-[12px] leading-5 font-semibold rounded-full ${row.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                    : row.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-muted text-foreground'}`}>
                    {row.role}
                </span>
            ),
        },
        {
            header: 'Plan',
            accessorKey: 'plan',
        },
        {
            header: 'Status',
            id: 'status',
            cell: ({ row }) => getStatusBadge(row),
        },
        {
            header: 'Joined',
            accessorKey: 'created_at',
            cell: ({ row }) => <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
        },
        {
            header: '',
            id: 'actions',
            cellClassName: 'text-right',
            cell: ({ row }) => (
                <div className="flex items-center justify-end space-x-3">
                    {row.account_status !== 'deleted' && row.account_status !== 'pending_deletion' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); confirmToggleStatus(row); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title={row.is_active ? 'Suspend User' : 'Activate User'}
                            data-testid={`toggle-status-${row.id}`}
                        >
                            {row.is_active ? <ShieldOff size={16} /> : <Shield size={16} />}
                        </button>
                    )}
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <MoreVertical size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-sm font-medium shadow-sm transition-colors">
                    Add User
                </button>
            </div>

            <div className="bg-card shadow-sm rounded border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-1.5 border border-border rounded-sm leading-5 bg-card placeholder-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center space-x-2 px-3 py-1.5 border rounded-sm text-sm font-medium transition-colors ${hasActiveFilters
                            ? 'text-white bg-blue-600 border-blue-600'
                            : 'text-foreground hover:text-blue-500 border-border bg-card'
                            }`}
                    >
                        <Filter className="h-4 w-4" />
                        <span>Filters</span>
                        {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 text-xs bg-white text-blue-600 rounded-full">•</span>}
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="p-4 bg-muted/50 border-b border-border">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                    className="block w-full px-3 py-1.5 border border-border rounded-sm bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    data-testid="status-filter-select"
                                >
                                    {STATUS_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-foreground mb-1">Role</label>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                                    className="block w-full px-3 py-1.5 border border-border rounded-sm bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    data-testid="role-filter-select"
                                >
                                    {ROLE_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-foreground mb-1">Plan</label>
                                <select
                                    value={planFilter}
                                    onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                                    className="block w-full px-3 py-1.5 border border-border rounded-sm bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    data-testid="plan-filter-select"
                                >
                                    {PLAN_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-foreground hover:text-blue-500 bg-card border border-border rounded-sm transition-colors"
                                    data-testid="clear-filters-btn"
                                >
                                    <X className="h-4 w-4" />
                                    <span>Clear</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={users}
                    loading={loading && users.length === 0}
                    emptyState="No users found."
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    itemsPerPage={limit}
                    onItemsPerPageChange={(n) => { setLimit(n); setPage(1); }}
                    totalItems={totalUsers}
                />
            </div>

            <Modal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onConfirm={handleConfirmAction}
                title={modalConfig.action === 'suspend' ? 'Suspend User' : 'Activate User'}
                variant={modalConfig.action === 'suspend' ? 'danger' : 'primary'}
                confirmText={modalConfig.action === 'suspend' ? 'Suspend' : 'Activate'}
                isLoading={modalConfig.isLoading}
            >
                <div className="space-y-3">
                    <p>
                        Are you sure you want to <strong>{modalConfig.action}</strong> the user
                        <span className="font-bold"> {modalConfig.user?.username}</span>?
                    </p>
                    {modalConfig.action === 'suspend' && (
                        <p className="text-gray-500 text-xs mt-2">
                            Suspended users will not be able to log in or access the platform.
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
};
