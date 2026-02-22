import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RoleSelection: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<'owner' | 'admin' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [tempData, setTempData] = useState<any>(null);
    const navigate = useNavigate();
    const { selectRole } = useAuth();

    useEffect(() => {
        // Check for temporary registration data
        const tempRegistrationData = sessionStorage.getItem('temp_registration_data');
        if (tempRegistrationData) {
            setTempData(JSON.parse(tempRegistrationData));
        }
    }, []);

    const handleRoleSelect = (role: 'owner' | 'admin') => {
        setSelectedRole(role);
        setError('');
    };

    const handleSubmit = async () => {
        if (!selectedRole) {
            setError('Please select a role to continue');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (tempData) {
                // New registration - store temp token first to make API call
                const tempToken = tempData.access_token;

                // Call select role API with temp token
                const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
                const response = await fetch(`${BACKEND_URL}/api/auth/admin/select-role`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${tempToken}`
                    },
                    body: JSON.stringify({ role: selectedRole }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || 'Failed to set role');
                }

                // Now store the updated token and user to localStorage
                if (data.access_token) {
                    localStorage.setItem('scrapi_admin_token', data.access_token);
                }
                if (data.user) {
                    localStorage.setItem('scrapi_admin_user', JSON.stringify(data.user));
                }

                // Clear pending role selection flag
                localStorage.removeItem('scrapi_pending_role_selection');

                // Clear temp data
                sessionStorage.removeItem('temp_registration_data');

                // Reload to update auth context
                window.location.href = '/dashboard';
            } else {
                // Existing user changing role
                await selectRole(selectedRole);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to set role. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
                <div className="flex justify-center">
                    <img src="/logo.png" alt="Scrapi Logo" className="h-16 w-auto" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                    Choose Your Role
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Select your access level for the Admin Console
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
                {error && (
                    <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg relative text-sm">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Owner Role Card */}
                    <div
                        onClick={() => handleRoleSelect('owner')}
                        className={`bg-card p-8 rounded-2xl shadow-lg cursor-pointer transition-all border-4 ${selectedRole === 'owner'
                            ? 'border-aws-orange shadow-2xl scale-105 bg-aws-orange/5'
                            : 'border-border hover:border-aws-orange/30 hover:shadow-xl'
                            }`}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${selectedRole === 'owner'
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/30'
                                    : 'bg-muted'
                                    }`}
                            >
                                <Crown
                                    className={`h-10 w-10 ${selectedRole === 'owner' ? 'text-white' : 'text-foreground/50'
                                        }`}
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">Owner</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Full system control and management
                            </p>
                            <div className="space-y-2 text-left w-full">
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">Complete access to all features</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">User management capabilities</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">System configuration access</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">Billing and subscription control</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">Audit logs and analytics</p>
                                </div>
                            </div>
                            {selectedRole === 'owner' && (
                                <div className="mt-4 w-full">
                                    <div className="bg-aws-orange/10 border border-aws-orange/20 rounded-lg p-3">
                                        <p className="text-xs text-aws-orange font-medium">
                                            ⚠️ Only one owner can exist per system
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Admin Role Card */}
                    <div
                        onClick={() => handleRoleSelect('admin')}
                        className={`bg-card p-8 rounded-2xl shadow-lg cursor-pointer transition-all border-4 ${selectedRole === 'admin'
                            ? 'border-aws-orange shadow-2xl scale-105 bg-aws-orange/5'
                            : 'border-border hover:border-aws-orange/30 hover:shadow-xl'
                            }`}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${selectedRole === 'admin'
                                    ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30'
                                    : 'bg-muted'
                                    }`}
                            >
                                <Shield
                                    className={`h-10 w-10 ${selectedRole === 'admin' ? 'text-white' : 'text-foreground/50'
                                        }`}
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">Admin</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Standard administrative access
                            </p>
                            <div className="space-y-2 text-left w-full">
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">Manage scrapers and actors</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">View and manage runs</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">Access to datasets and exports</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-foreground">Monitor system health</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-red-500 mr-2">✗</div>
                                    <p className="text-sm text-muted-foreground">Limited user management</p>
                                </div>
                            </div>
                            {selectedRole === 'admin' && (
                                <div className="mt-4 w-full">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                        <p className="text-xs text-blue-500 font-medium">
                                            ℹ️ Can be upgraded to owner later
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedRole || isLoading}
                        className="flex items-center px-8 py-3 border border-transparent rounded-md shadow-lg text-base font-medium text-white bg-aws-orange hover:bg-aws-orange/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aws-orange disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Setting Role...
                            </span>
                        ) : (
                            <>
                                Continue to Dashboard
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
