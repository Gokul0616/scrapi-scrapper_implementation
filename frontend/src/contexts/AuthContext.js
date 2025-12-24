import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Use real authentication
const USE_MOCK = false;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [lastPath, setLastPath] = useState(null);

  useEffect(() => {
    if (USE_MOCK) {
      // Mock authentication check
      const mockToken = localStorage.getItem('token');
      if (mockToken === 'mock-token') {
        setUser({
          ...mockUser,
          email: localStorage.getItem('userEmail') || mockUser.username
        });
      }
      setLoading(false);
    } else if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
      fetchLastPath();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      
      // Load theme from backend if available
      if (response.data.theme_preference) {
        // Dispatch custom event to notify ThemeContext
        window.dispatchEvent(new CustomEvent('backendThemeLoaded', { 
          detail: { theme: response.data.theme_preference } 
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchLastPath = async () => {
    try {
      const response = await axios.get(`${API}/auth/last-path`);
      setLastPath(response.data.last_path || '/home');
    } catch (error) {
      console.error('Failed to fetch last path:', error);
      setLastPath('/home');
    }
  };

  const updateLastPath = async (path) => {
    try {
      await axios.patch(`${API}/auth/last-path`, { last_path: path });
      setLastPath(path);
    } catch (error) {
      console.error('Failed to update last path:', error);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Fetch last path after successful login
      let redirectPath = '/home';
      try {
        const pathResponse = await axios.get(`${API}/auth/last-path`);
        redirectPath = pathResponse.data.last_path || '/home';
        setLastPath(redirectPath);
      } catch (error) {
        setLastPath('/home');
      }
      
      return { success: true, redirectPath };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (username, email, password, organizationName) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        username,
        email,
        password,
        organization_name: organizationName
      });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setLastPath(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, lastPath, updateLastPath, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
