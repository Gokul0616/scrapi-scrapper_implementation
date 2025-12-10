import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ needs_role_selection: boolean }>;
    logout: () => void;
    selectRole: (role: 'owner' | 'admin') => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
    pendingRoleSelection: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [pendingRoleSelection, setPendingRoleSelection] = useState(false);

    useEffect(() => {
        // Check local storage for persisted session
        const storedUser = localStorage.getItem('scrapi_admin_user');
        const storedToken = localStorage.getItem('scrapi_admin_token');
        const isPendingRole = localStorage.getItem('scrapi_pending_role_selection') === 'true';

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
        }
        setPendingRoleSelection(isPendingRole);
        setLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<{ needs_role_selection: boolean }> => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: email,
                    password: password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            // Check if role selection is needed
            if (data.needs_role_selection) {
                // Store token for authentication (needed to access role selection page)
                if (data.access_token) {
                    localStorage.setItem('scrapi_admin_token', data.access_token);
                }
                if (data.user) {
                    localStorage.setItem('scrapi_admin_user', JSON.stringify(data.user));
                    setUser(data.user);
                }
                // Also store in sessionStorage for role selection flow
                sessionStorage.setItem('temp_registration_data', JSON.stringify(data));

                // Set pending role selection flag
                localStorage.setItem('scrapi_pending_role_selection', 'true');
                setPendingRoleSelection(true);
            } else {
                // Store permanently and set user
                if (data.access_token) {
                    localStorage.setItem('scrapi_admin_token', data.access_token);
                }
                if (data.user) {
                    localStorage.setItem('scrapi_admin_user', JSON.stringify(data.user));
                    setUser(data.user);
                }

                // Clear pending role selection flag
                localStorage.removeItem('scrapi_pending_role_selection');
                setPendingRoleSelection(false);
            }

            return { needs_role_selection: data.needs_role_selection || false };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const selectRole = async (role: 'owner' | 'admin'): Promise<void> => {
        const token = localStorage.getItem('scrapi_admin_token');

        if (!token) {
            throw new Error('No authentication token found');
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/select-role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ role }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to set role');
            }

            // Update token and user data
            if (data.access_token) {
                localStorage.setItem('scrapi_admin_token', data.access_token);
            }
            if (data.user) {
                localStorage.setItem('scrapi_admin_user', JSON.stringify(data.user));
                setUser(data.user);
            }

            // Clear pending role selection flag
            localStorage.removeItem('scrapi_pending_role_selection');
            setPendingRoleSelection(false);
        } catch (error) {
            console.error('Select role error:', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setPendingRoleSelection(false);
        localStorage.removeItem('scrapi_admin_user');
        localStorage.removeItem('scrapi_admin_token');
        localStorage.removeItem('scrapi_pending_role_selection');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, selectRole, isAuthenticated: !!user, loading, pendingRoleSelection }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
