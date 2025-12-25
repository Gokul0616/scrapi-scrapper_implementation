import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';
import AlertModal from './AlertModal';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AccountDeletionPending = ({ deletionInfo, onReactivate }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isReactivating, setIsReactivating] = React.useState(false);
  const [showAlert, setShowAlert] = React.useState(false);
  const [alertConfig, setAlertConfig] = React.useState({
    title: '',
    message: '',
    type: 'info'
  });

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/settings/account/reactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (onReactivate) {
        onReactivate();
      }
      
      // Redirect to home after reactivation
      navigate('/home');
    } catch (error) {
      console.error('Failed to reactivate account:', error);
      alert('Failed to reactivate account. Please try again.');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === 'dark' ? 'bg-black/80' : 'bg-black/50'}`}>
      <div className={`max-w-2xl w-full mx-4 p-8 rounded-lg shadow-2xl ${
        theme === 'dark' ? 'bg-[#1e1e1e] border-2 border-orange-500' : 'bg-white border-2 border-orange-500'
      }`}>
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <AlertCircle className="w-12 h-12 text-orange-500" />
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Account Deletion Pending
            </h2>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Your account has been requested for deletion on{' '}
              <span className="font-semibold text-orange-500">
                {formatDate(deletionInfo.deletion_scheduled_at)}
              </span>
            </p>
          </div>
        </div>

        <div className={`p-6 rounded-lg mb-6 ${
          theme === 'dark' ? 'bg-orange-900/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="text-center">
            <p className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
              {deletionInfo.days_remaining} {deletionInfo.days_remaining === 1 ? 'day' : 'days'} remaining
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Permanent deletion on: {formatDate(deletionInfo.permanent_deletion_at)}
            </p>
          </div>
        </div>

        <div className={`p-6 rounded-lg mb-6 ${
          theme === 'dark' ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
        }`}>
          <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
            What happens if you don't reactivate?
          </h3>
          <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            <li>• All your actors and actor tasks will be permanently deleted</li>
            <li>• All schedules and run history will be removed</li>
            <li>• All datasets and saved tasks will be deleted</li>
            <li>• All API keys and integrations will be revoked</li>
            <li>• Your account cannot be recovered after permanent deletion</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleReactivate}
            disabled={isReactivating}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg"
            data-testid="reactivate-account-btn"
          >
            {isReactivating ? 'Reactivating...' : '✓ Reactivate My Account'}
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`px-6 ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300'}`}
            data-testid="logout-btn"
          >
            Logout
          </Button>
        </div>

        <p className={`text-center text-sm mt-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
          Changed your mind? Reactivating will restore full access to your account.
        </p>
      </div>
    </div>
  );
};

export default AccountDeletionPending;
