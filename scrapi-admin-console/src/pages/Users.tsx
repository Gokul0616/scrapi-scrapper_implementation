import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Shield, ShieldOff } from 'lucide-react';
import type { User } from '../types';

const MOCK_USERS: User[] = [
    { id: '1', username: 'john_doe', email: 'john@example.com', role: 'user', plan: 'Free', is_active: true, created_at: '2023-01-15T10:00:00Z', organization_name: 'Acme Inc' },
    { id: '2', username: 'jane_smith', email: 'jane@example.com', role: 'admin', plan: 'Enterprise', is_active: true, created_at: '2023-02-20T14:30:00Z', organization_name: 'TechCorp' },
    { id: '3', username: 'bob_wilson', email: 'bob@example.com', role: 'user', plan: 'Premium', is_active: false, created_at: '2023-03-10T09:15:00Z' },
    { id: '4', username: 'alice_jones', email: 'alice@example.com', role: 'user', plan: 'Free', is_active: true, created_at: '2023-04-05T16:45:00Z' },
    { id: '5', username: 'mike_brown', email: 'mike@example.com', role: 'user', plan: 'Premium', is_active: true, created_at: '2023-05-12T11:20:00Z', organization_name: 'DataSystems' },
];

export const UsersPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>(MOCK_USERS);

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleStatus = (userId: string) => {
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-aws-text">User Management</h1>
                <button className="bg-aws-orange hover:bg-orange-600 text-white px-4 py-2 rounded-sm text-sm font-medium shadow-sm">
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
                            className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-aws-blue focus:border-aws-blue sm:text-sm"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center space-x-2 text-aws-text hover:text-aws-blue px-3 py-1.5 border border-gray-300 rounded-sm text-sm font-medium bg-white">
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
                            {filteredUsers.map((user) => (
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
                                                onClick={() => toggleStatus(user.id)}
                                                className={`text-gray-400 hover:${user.is_active ? 'text-red-600' : 'text-green-600'}`}
                                                title={user.is_active ? "Suspend User" : "Activate User"}
                                            >
                                                {user.is_active ? <ShieldOff size={16} /> : <Shield size={16} />}
                                            </button>
                                            <button className="text-gray-400 hover:text-aws-text">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-white px-4 py-3 border-t border-aws-border sm:px-6">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-aws-text-secondary">
                            Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{users.length}</span> results
                        </div>
                        <div className="flex-1 flex justify-end">
                            <button className="relative inline-flex items-center px-4 py-1.5 border border-gray-300 text-sm font-medium rounded-sm text-aws-text bg-white hover:bg-gray-50">
                                Previous
                            </button>
                            <button className="ml-3 relative inline-flex items-center px-4 py-1.5 border border-gray-300 text-sm font-medium rounded-sm text-aws-text bg-white hover:bg-gray-50">
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
