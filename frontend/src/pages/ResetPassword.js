import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Eye, EyeOff, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { useMessage } from '../contexts/MessageContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showMessage } = useMessage();
  
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Extract token from URL
    const queryParams = new URLSearchParams(location.search);
    const tokenParam = queryParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid or missing reset token.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token: token,
        new_password: password
      });

      if (response.status === 200) {
        setIsSuccess(true);
        showMessage('Password reset successfully!', 'success');
        // Wait a bit then redirect to login
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to reset password. The link may have expired.';
      setError(msg);
      showMessage(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0F1014]">
      {/* Left Column - Marketing (matching Login/Register) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#eff6ff] p-12 flex-col justify-between">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="SCRAPI Logo" className="w-9 h-9" />
          <span className="text-xl font-semibold text-gray-900">SCRAPI</span>
        </div>

        <div className="flex items-center justify-center flex-1">
          <div className="max-w-md">
            <h1 className="text-[28px] leading-[34px] font-semibold text-gray-900 mb-7">
              Secure your account
            </h1>
            <div className="space-y-5">
              <div className="flex items-start space-x-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  <Check className="w-[18px] h-[18px] text-green-600 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-[15px] leading-[22px] text-gray-900 font-medium mb-0.5">Enhanced Security</p>
                  <p className="text-[13px] leading-[19px] text-gray-600">
                    Setting a strong password helps protect your actors and datasets from unauthorized access.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  <Check className="w-[18px] h-[18px] text-green-600 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-[15px] leading-[22px] text-gray-900 font-medium mb-0.5">Session Revocation</p>
                  <p className="text-[13px] leading-[19px] text-gray-600">
                    Changing your password automatically logs you out of all other devices for your safety.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[11px] leading-[16px] text-gray-500">
          © 2024 SCRAPI. All rights reserved.
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[360px]">
          <Link to="/login" className="flex items-center text-gray-600 hover:text-gray-900 mb-6 text-[13px]">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to login
          </Link>

          <h2 className="text-[24px] font-bold text-gray-900 dark:text-white mb-2">
            Reset Password
          </h2>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-8">
            Please enter your new password below.
          </p>

          {isSuccess ? (
            <div className="bg-green-50 border border-green-100 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-[16px] font-bold text-green-900 mb-2">Success!</h3>
              <p className="text-[14px] text-green-700">
                Your password has been reset. Redirecting you to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-[40px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm Password
                </label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-[40px]"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-red-600 text-[13px]">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !token}
                className="w-full h-[42px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all"
              >
                {isLoading ? 'Updating...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
