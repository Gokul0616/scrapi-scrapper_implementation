import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Shield, ShieldOff, ChevronLeft, ChevronRight } from 'lucide-react';
import type { User } from '../types';
import { useAlert } from '../context/AlertContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

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
    const limit = 20;

    useEffect(() => {
        fetchUsers();
    }, [page, searchTerm]); // Refetch when page or search changes

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

    const toggleStatus = async (user: User) => {
        try {
            const action = user.is_active ? 'suspend' : 'activate';
            if (!window.confirm(`Are you sure you want to ${action} ${user.username}?`)) return;

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
        } catch (err: any) {
            console.error(err);
            // Show backend error message in custom alert
            showAlert(err.message || "Failed to update user status", 'error');
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to page 1 on search
    };

    if (loading && users.length === 0) return <div className="p-6">Loading users...</div>;
    if (error && users.length === 0) return <div className="p-6 text-red-600">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-aws-text">User Management</h1>
                <button className="bg-aws-orange hover:bg-orange-600 text-white px-4 py-2 rounded-sm text-sm font-medium shadow-sm transition-colors">
                    Add User
                </button>
            </div>

            <div className="bg-white shadow-sm rounded border border-aws-border overflow-hidden">
                <div className="p-4 border-b border-aws-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-aws-blue focus:border-aws-blue sm:text-sm transition-shadow"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <button className="flex items-center space-x-2 text-aws-text hover:text-aws-blue px-3 py-1.5 border border-gray-300 rounded-sm text-sm font-medium bg-white transition-colors">
                        <Filter className="h-4 w-4" />
                        <span>Filters</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-aws-border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                                    User
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                                    Role
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                                    Plan
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                                    Joined
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-aws-border">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8">
                                                <div className="h-8 w-8 rounded-full bg-aws-nav flex items-center justify-center text-white font-bold text-xs">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-aws-blue hover:underline cursor-pointer">{user.username}</div>
                                                <div className="text-sm text-aws-text-secondary">{user.email}</div>
                                                {user.organization_name && (
                                                    <div className="text-xs text-gray-400">{user.organization_name}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                                user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-aws-text">
                                        {user.plan}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.is_active ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-aws-text-secondary">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-3">
                                            <button
                                                onClick={() => toggleStatus(user)}
                                                className={`text-gray-400 hover:${user.is_active ? 'text-red-600' : 'text-green-600'} transition-colors`}
                                                title={user.is_active ? "Suspend User" : "Activate User"}
                                            >
                                                {user.is_active ? <ShieldOff size={16} /> : <Shield size={16} />}
                                            </button>
                                            <button className="text-gray-400 hover:text-aws-text transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="bg-white px-4 py-3 border-t border-aws-border sm:px-6">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-aws-text-secondary">
                            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, totalUsers)}</span> of <span className="font-medium">{totalUsers}</span> results
                        </div>
                        <div className="flex-1 flex justify-end space-x-3">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className={`relative inline-flex items-center px-4 py-1.5 border border-gray-300 text-sm font-medium rounded-sm bg-white 
                                    ${page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-aws-text hover:bg-gray-50 transition-colors'}`}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </button>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className={`relative inline-flex items-center px-4 py-1.5 border border-gray-300 text-sm font-medium rounded-sm bg-white
                                    ${(page === totalPages || totalPages === 0) ? 'text-gray-300 cursor-not-allowed' : 'text-aws-text hover:bg-gray-50 transition-colors'}`}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
