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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for persisted session
        const storedUser = localStorage.getItem('scrapi_admin_user');
        const storedToken = localStorage.getItem('scrapi_admin_token');
        
        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<{ needs_role_selection: boolean }> => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
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
                localStorage.setItem('scrapi_admin_token', data.access_token);
                localStorage.setItem('scrapi_admin_user', JSON.stringify(data.user));
                setUser(data.user);
                // Also store in sessionStorage for role selection flow
                sessionStorage.setItem('temp_registration_data', JSON.stringify(data));
            } else {
                // Store permanently and set user
                localStorage.setItem('scrapi_admin_token', data.access_token);
                localStorage.setItem('scrapi_admin_user', JSON.stringify(data.user));
                setUser(data.user);
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
            localStorage.setItem('scrapi_admin_token', data.access_token);
            localStorage.setItem('scrapi_admin_user', JSON.stringify(data.user));
            setUser(data.user);
        } catch (error) {
            console.error('Select role error:', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('scrapi_admin_user');
        localStorage.removeItem('scrapi_admin_token');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, selectRole, isAuthenticated: !!user, loading }}>
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
