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
            const accountStatus = params.get('account_status');
            
            if (accountStatus === 'pending_deletion') {
                // If pending deletion, redirect to login with reactivation state
                const deletionInfo = {
                    deletion_scheduled_at: params.get('deletion_scheduled_at'),
                    permanent_deletion_at: params.get('permanent_deletion_at'),
                    days_remaining: parseInt(params.get('days_remaining') || '0'),
                    username: params.get('username'),
                    user_id: params.get('user_id')
                };

                // We still save the token so reactivation can happen
                localStorage.setItem('token', token);
                setToken(token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                navigate('/login', { 
                    replace: true,
                    state: { 
                        pendingDeletion: true,
                        deletionInfo: deletionInfo
                    }
                });
                return;
            }

            // Normal login flow
            localStorage.setItem('token', token);
            setToken(token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            navigate(lastPath || '/home', { replace: true });
        } else {
            console.error('No token found in callback URL');
            navigate('/login', { replace: true });
        }
    }, [location, navigate, setToken, lastPath]);

    return <LoadingScreen text="Finalizing authentication..." />;
};

export default AuthCallback;
