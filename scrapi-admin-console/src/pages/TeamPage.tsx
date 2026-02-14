import React, { useState, useEffect } from 'react';
import { Shield, ShieldOff, Terminal } from 'lucide-react';
import type { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const TeamPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { showAlert } = useAlert();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const response = await fetch(`${BACKEND_URL}/api/admin/team`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch team');

            const data = await response.json();
            setTeamMembers(data);
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

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-aws-text">Team Management</h1>

            <div className="bg-white shadow-sm rounded border border-aws-border overflow-hidden">
                <table className="min-w-full divide-y divide-aws-border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase">Terminal Access</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-aws-border">
                        {teamMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-blue-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-aws-nav flex items-center justify-center text-white font-bold text-xs mr-3">
                                            {member.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-aws-text">{member.username}</div>
                                            <div className="text-xs text-gray-500">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.role === 'owner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {member.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {member.role === 'owner' ? (
                                        <span className="text-xs text-gray-400">Full Access</span>
                                    ) : (
                                        <button
                                            onClick={() => toggleTerminalAccess(member)}
                                            className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium transition-colors ${(member.permissions || []).includes('terminal_access')
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            <Terminal size={14} />
                                            <span>{(member.permissions || []).includes('terminal_access') ? 'Enabled' : 'Disabled'}</span>
                                        </button>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {member.is_active ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Suspended</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
