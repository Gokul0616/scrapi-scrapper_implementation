import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

const AuthCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setToken, setUser, lastPath } = useAuth();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            // Save token
            localStorage.setItem('token', token);

            // This will trigger the useEffect in AuthProvider
            setToken(token);

            // Set axios header immediately just in case
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Navigation will trigger the ProtectedRoute check 
            // The AuthProvider should now be in 'loading' state
            navigate(lastPath || '/home', { replace: true });
        } else {
            console.error('No token found in callback URL');
            navigate('/login', { replace: true });
        }
    }, [location, navigate, setToken, lastPath]);

    return <LoadingScreen text="Finalizing authentication..." />;
};

export default AuthCallback;
