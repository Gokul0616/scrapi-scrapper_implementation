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
            await selectRole(selectedRole);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to set role. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-aws-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
                <div className="flex justify-center">
                    <img src="/logo.png" alt="Scrapi Logo" className="h-16 w-auto" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-aws-text">
                    Choose Your Role
                </h2>
                <p className="mt-2 text-center text-sm text-aws-text-secondary">
                    Select your access level for the Admin Console
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Owner Role Card */}
                    <div
                        onClick={() => handleRoleSelect('owner')}
                        className={`bg-white p-8 rounded-lg shadow-md cursor-pointer transition-all border-4 ${
                            selectedRole === 'owner'
                                ? 'border-aws-orange shadow-xl scale-105'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                        }`}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                                    selectedRole === 'owner'
                                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                                        : 'bg-gradient-to-br from-gray-100 to-gray-200'
                                }`}
                            >
                                <Crown
                                    className={`h-10 w-10 ${
                                        selectedRole === 'owner' ? 'text-white' : 'text-gray-500'
                                    }`}
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-aws-text mb-2">Owner</h3>
                            <p className="text-sm text-aws-text-secondary mb-4">
                                Full system control and management
                            </p>
                            <div className="space-y-2 text-left w-full">
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">Complete access to all features</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">User management capabilities</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">System configuration access</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">Billing and subscription control</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">Audit logs and analytics</p>
                                </div>
                            </div>
                            {selectedRole === 'owner' && (
                                <div className="mt-4 w-full">
                                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                        <p className="text-xs text-orange-800 font-medium">
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
                        className={`bg-white p-8 rounded-lg shadow-md cursor-pointer transition-all border-4 ${
                            selectedRole === 'admin'
                                ? 'border-aws-orange shadow-xl scale-105'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                        }`}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                                    selectedRole === 'admin'
                                        ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                                        : 'bg-gradient-to-br from-gray-100 to-gray-200'
                                }`}
                            >
                                <Shield
                                    className={`h-10 w-10 ${
                                        selectedRole === 'admin' ? 'text-white' : 'text-gray-500'
                                    }`}
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-aws-text mb-2">Admin</h3>
                            <p className="text-sm text-aws-text-secondary mb-4">
                                Standard administrative access
                            </p>
                            <div className="space-y-2 text-left w-full">
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">Manage scrapers and actors</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">View and manage runs</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">Access to datasets and exports</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-green-500 mr-2">✓</div>
                                    <p className="text-sm text-aws-text">Monitor system health</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="text-red-500 mr-2">✗</div>
                                    <p className="text-sm text-gray-400">Limited user management</p>
                                </div>
                            </div>
                            {selectedRole === 'admin' && (
                                <div className="mt-4 w-full">
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                        <p className="text-xs text-blue-800 font-medium">
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
                        className="flex items-center px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-aws-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aws-orange disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
