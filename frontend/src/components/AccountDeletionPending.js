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
      setAlertConfig({
        title: 'Reactivation Failed',
        message: 'Failed to reactivate account. Please try again.',
        type: 'error'
      });
      setShowAlert(true);
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-black/80' : 'bg-black/50'}`}>
      <div className={`max-w-lg w-full p-6 rounded-lg shadow-lg ${
        theme === 'dark' ? 'bg-[#1e1e1e] border border-gray-700' : 'bg-white border border-gray-300'
      }`}>
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0">
            <AlertCircle className={`w-8 h-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`} />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Account Deletion Pending
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Deletion requested on{' '}
              <span className="font-medium">
                {formatDate(deletionInfo.deletion_scheduled_at)}
              </span>
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-lg mb-4 border ${
          theme === 'dark' ? 'bg-[#25262B] border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="text-center">
            <p className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {deletionInfo.days_remaining} {deletionInfo.days_remaining === 1 ? 'day' : 'days'}
            </p>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              Permanent deletion: {formatDate(deletionInfo.permanent_deletion_at)}
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-lg mb-5 border ${
          theme === 'dark' ? 'bg-[#25262B] border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            What will be deleted:
          </h3>
          <ul className={`space-y-1.5 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <li>• All actors and actor tasks</li>
            <li>• All schedules and run history</li>
            <li>• All datasets and saved tasks</li>
            <li>• All API keys and integrations</li>
            <li>• Account cannot be recovered after deletion</li>
          </ul>
        </div>

        <div className="flex gap-3 mb-3">
          <Button
            onClick={handleReactivate}
            disabled={isReactivating}
            className={`flex-1 font-semibold ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            data-testid="reactivate-account-btn"
          >
            {isReactivating ? 'Reactivating...' : 'Reactivate Account'}
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`px-5 ${theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
            data-testid="logout-btn"
          >
            Logout
          </Button>
        </div>

        <p className={`text-center text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
          Reactivating will restore full access to your account
        </p>
      </div>
      
      {/* Alert Modal */}
      <AlertModal
        show={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
};

export default AccountDeletionPending;
