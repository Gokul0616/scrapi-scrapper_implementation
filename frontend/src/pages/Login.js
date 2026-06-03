import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useMessage } from '../contexts/MessageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Check, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import OTPInput from '../components/OTPInput';
import CustomValidationTooltip from '../components/CustomValidationTooltip';
import SecureShield from '../components/auth/SecureShield';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setUser, setToken, lastPath, user, loading, logout, fetchUser } = useAuth();
  const { openModal } = useModal();
  const { showMessage } = useMessage();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    password: '',
    website_check: '', // Honeypot
    captcha_id: '',
    captcha_answer: '',
    shield_nonce: '',
    shield_solution: null,
    fingerprint: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usePasswordless, setUsePasswordless] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sendOtpError, setSendOtpError] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showValidationTooltip, setShowValidationTooltip] = useState(false);
  const [authProvider, setAuthProvider] = useState(null);
  const [isShieldSolved, setIsShieldSolved] = useState(false);
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (!loading && user && !redirected) {
      // If account is pending deletion, don't redirect to home/dashboard
      if (user.account_status === 'pending_deletion') {
        setDeletionInfo({
          deletion_scheduled_at: user.deletion_scheduled_at,
          permanent_deletion_at: user.permanent_deletion_at,
          days_remaining: user.days_remaining,
          username: user.username,
          user_id: user.id
        });
        setStep(6);
        return;
      }

      setRedirected(true);
      navigate(lastPath || '/home');
    }
  }, [user, loading, navigate, lastPath, redirected]);

  useEffect(() => {
    if (location.state?.pendingDeletion) {
      setDeletionInfo(location.state.deletionInfo);
      setStep(6);
      // Clear location state after consumption so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setShowValidationTooltip(false);

    if (!formData.email.trim()) {
      setShowValidationTooltip(true);
      return;
    }

    // Check if email exists
    setIsCheckingEmail(true);
    try {
      const response = await axios.get(`${API_URL}/api/users/check-email?email=${encodeURIComponent(formData.email)}`);

      if (!response.data.exists) {
        setEmailError('No account found with this email. Please sign up first.');
        setIsCheckingEmail(false);
        return;
      }

      setAuthProvider(response.data.auth_provider);
      // Move to Step 2 (Security Check)
      setStep(2);
    } catch (error) {
      // Check if error has a response with data
      if (error.response && error.response.data) {
        setEmailError(error.response.data.detail || error.response.data.message || 'Unable to verify email. Please try again.');
      } else {
        setEmailError('Unable to verify email. Please try again.');
      }
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    // If shield isn't solved yet, show loading and wait
    if (!isShieldSolved) {
      setIsLoading(true);
      // We'll let the SecureShield handle the completion
      return;
    }

    setIsLoading(true);

    const result = await login(formData.email, formData.password, {
      nonce: formData.shield_nonce,
      solution: formData.shield_solution,
      fingerprint: formData.fingerprint
    });

    if (result.success) {
      // Check if account is pending deletion
      if (result.pending_deletion) {
        setDeletionInfo(result.deletionInfo);
        setStep(6); // Move to reactivation step (step 6)
        setIsLoading(false);
        return;
      }
      navigate(result.redirectPath || '/home');
    } else {
      setPasswordError(result.error || 'Incorrect password. Please try again.');
    }

    setIsLoading(false);
  };

  const handleCaptchaVerify = useCallback((shieldDataOrId, solutionOrAnswer) => {
    // Check if it's the new Shield data or old Captcha
    if (typeof shieldDataOrId === 'object') {
      const { nonce, solution, fingerprint } = shieldDataOrId;
      setFormData(prev => ({
        ...prev,
        shield_nonce: nonce,
        shield_solution: solution,
        fingerprint: fingerprint
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        captcha_id: shieldDataOrId,
        captcha_answer: solutionOrAnswer
      }));
    }

    setIsShieldSolved(true);

    // Auto-advance if we were on the dedicated security check step (Step 2)
    if (step === 2) {
      if (usePasswordless) {
        setStep(4); // Go to Send OTP screen
      } else {
        setStep(3); // Go to Password screen
      }
    }
  }, [step, usePasswordless]);

  // Effect to handle pending submissions once shield is solved
  useEffect(() => {
    if (isShieldSolved && isLoading) {
      if (step === 3) { // Password step
        handlePasswordSubmit({ preventDefault: () => { } });
      } else if (step === 4) { // Send OTP step
        handleSendOTP();
      }
    }
  }, [isShieldSolved, isLoading, step]); // Added step to dependencies

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/settings/account/reactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Re-fetch user to update state from 'pending_deletion' to 'active'
      await fetchUser();

      // Redirect to home after reactivation
      navigate('/home');
    } catch (error) {
      console.error('Failed to reactivate account:', error);
      setPasswordError('Failed to reactivate account. Please try again.');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleLogout = () => {
    logout();
    setDeletionInfo(null);
    setStep(1);
    setFormData({ email: '', otp: '', password: '' });
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

  const handleContinueWithoutPassword = () => {
    // Just navigate to Send OTP screen, don't send OTP yet
    setUsePasswordless(true);
    setPasswordError('');
    setStep(4);
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    setSendOtpError('');
    setOtpSuccessMessage('');

    if (!isShieldSolved) {
      // Wait for shield
      return;
    }

    try {
      const payload = {
        email: formData.email,
        purpose: 'login',
        captcha_id: formData.captcha_id,
        captcha_answer: formData.captcha_answer,
        shield_nonce: formData.shield_nonce,
        shield_solution: formData.shield_solution,
        fingerprint: formData.fingerprint
      }

      const response = await axios.post(`${API_URL}/api/auth/send-otp`, payload);

      // OTP sent successfully, show success message and move to OTP input step
      setOtpSuccessMessage('OTP sent successfully to your email');
      setStep(5); // Shifted due to new step
    } catch (error) {
      // Check if error has a response with data
      if (error.response && error.response.data) {
        setSendOtpError(error.response.data.detail || error.response.data.message || 'Network error. Please try again.');
      } else {
        setSendOtpError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setOtpError('');
    setOtpSuccessMessage('');
    // Clear the OTP input
    setFormData({ ...formData, otp: '' });

    try {
      const response = await axios.post(`${API_URL}/api/auth/send-otp`, {
        email: formData.email,
        purpose: 'login',
        captcha_id: formData.captcha_id,
        captcha_answer: formData.captcha_answer,
        shield_nonce: formData.shield_nonce,
        shield_solution: formData.shield_solution,
        fingerprint: formData.fingerprint
      });

      setOtpSuccessMessage('OTP sent successfully to your email');
    } catch (error) {
      // Check if error has a response with data
      if (error.response && error.response.data) {
        setOtpError(error.response.data.detail || error.response.data.message || 'Network error. Please try again.');
      } else {
        setOtpError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setOtpError('');
    setOtpSuccessMessage('');
    try {
      // Use axios instead of fetch to avoid rrweb monitoring conflicts
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        email: formData.email,
        otp_code: formData.otp,
        purpose: 'login'
      }, {
        validateStatus: function (status) {
          // Don't throw error for any status code
          return true;
        }
      });
      if (response.status === 200 && response.data.success && response.data.access_token) {
        const data = response.data;

        // Store token and user data
        localStorage.setItem('token', data.access_token);

        // Set token in context
        setToken(data.access_token);

        // Set axios authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

        // Check if account is pending deletion
        if (data.account_status === 'pending_deletion') {
          setDeletionInfo({
            deletion_scheduled_at: data.deletion_scheduled_at,
            permanent_deletion_at: data.permanent_deletion_at,
            days_remaining: data.days_remaining,
            username: data.username,
            user_id: data.user_id
          });
          setStep(6); // Move to reactivation step (step 6)
          setIsLoading(false);
          return;
        }

        // Set user in context
        setUser(data.user);
        navigate(lastPath || '/home');
      } else {
        // Response is not OK (400, 404, etc.) - display the backend error message
        const errorMessage = response.data.detail || response.data.message || 'Invalid verification code';
        setOtpError(errorMessage);
      }
    } catch (error) {
      console.error('Caught exception in OTP Verification:', error);
      console.error('Error stack:', error.stack);
      setOtpError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    if (provider === 'Google') {
      try {
        const response = await axios.get(`${API_URL}/api/auth/google/url`);
        if (response.data && response.data.url) {
          window.location.href = response.data.url;
        } else {
          showMessage('Failed to initialize Google login', 'error');
        }
      } catch (error) {
        console.error('Failed to get Google auth URL:', error);
        showMessage('Unable to start Google login. Please try again.', 'error');
      }
    } else if (provider === 'GitHub') {
      try {
        const response = await axios.get(`${API_URL}/api/auth/github/url`);
        if (response.data && response.data.url) {
          window.location.href = response.data.url;
        } else {
          showMessage('Failed to initialize GitHub login', 'error');
        }
      } catch (error) {
        console.error('Failed to get GitHub auth URL:', error);
        showMessage('Unable to start GitHub login. Please try again.', 'error');
      }
    } else {
      showMessage(`${provider} login is coming soon!`, 'success');
    }
  };

  const handleBack = () => {
    if (step === 6) {
      // From reactivation back to password
      setStep(3);
      setDeletionInfo(null);
    } else if (step === 5 && usePasswordless) {
      // From OTP input back to Send OTP screen
      setStep(4);
    } else if (step === 4 && usePasswordless) {
      // From Send OTP screen back to password
      setUsePasswordless(false);
      setStep(3);
    } else if (step === 3 || step === 2) { // If on password or security check, go back to email
      setStep(1);
      setIsShieldSolved(false); // Reset shield state when going back to email
      setFormData(prev => ({ ...prev, shield_nonce: '', shield_solution: null, fingerprint: null }));
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleUseDifferentEmail = () => {
    setIsEditingEmail(true);
    setSendOtpError('');
  };

  const handleCancelEditEmail = () => {
    setIsEditingEmail(false);
    setSendOtpError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Marketing Content - Show on step 1 and step 6 */}
      {(step === 1 || step === 6) && (
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#eff6ff] p-12 flex-col justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="SCRAPI Logo" className="w-9 h-9" />
            <span className="text-xl font-semibold text-gray-900">SCRAPI</span>
          </div>

          {/* Main Content - Centered */}
          <div className="flex items-center justify-center flex-1">
            <div className="max-w-md">
              {step === 1 || step === 4 || step === 5 ? (
                <>
                  <h1 className="text-[28px] leading-[34px]  text-gray-900 mb-7 font-walsheim-semibold">
                    Welcome back to SCRAPI
                  </h1>

                  <div className="space-y-5">
                    {/* Feature 1 */}
                    <div className="flex items-start space-x-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        <Check className="w-[18px] h-[18px] text-green-600 stroke-[2.5]" />
                      </div>
                      <div>
                        <p className="text-[15px] leading-[22px] text-gray-900 font-medium mb-0.5 font-walsheim-semibold">Manage your Actors</p>
                        <p className="text-[13px] leading-[19px] text-gray-600">
                          Access your serverless cloud programs, custom scraping scripts, and scheduled tasks.
                        </p>
                      </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="flex items-start space-x-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        <Check className="w-[18px] h-[18px] text-green-600 stroke-[2.5]" />
                      </div>
                      <div>
                        <p className="text-[15px] leading-[22px] text-gray-900 font-medium mb-0.5 font-walsheim-semibold">Access your Datasets</p>
                        <p className="text-[13px] leading-[19px] text-gray-600">
                          Download your extracted data in JSON, CSV, Excel, XML, or HTML table formats.
                        </p>
                      </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="flex items-start space-x-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        <Check className="w-[18px] h-[18px] text-green-600 stroke-[2.5]" />
                      </div>
                      <div>
                        <p className="text-[15px] leading-[22px] text-gray-900 font-medium mb-0.5 font-walsheim-semibold">Monitor Integrations & Webhooks</p>
                        <p className="text-[13px] leading-[19px] text-gray-600">
                          Track your automated pipelines connected to Zapier, Make, Slack, and custom webhooks.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-[24px] leading-[30px] font-bold text-gray-900 mb-3 font-walsheim-semibold">
                    Your Account is Scheduled for Deletion
                  </h1>
                  <p className="text-[13px] leading-[19px] text-gray-600 mb-5">
                    We understand plans change. If you've had a change of heart, we'd love to have you back.
                  </p>

                  <div className="space-y-4">
                    {/* What you'll lose section */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-red-200">
                      <h3 className="text-[14px] font-semibold text-red-700 mb-3 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1.5" />
                        What will be permanently deleted:
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div>
                            <p className="text-[12px] font-medium text-gray-900">All Your Actors & Tasks</p>
                            <p className="text-[11px] text-gray-600">Every scraper configuration and saved task will be removed</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div>
                            <p className="text-[12px] font-medium text-gray-900">Complete Run History</p>
                            <p className="text-[11px] text-gray-600">All execution logs, results, and performance data</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div>
                            <p className="text-[12px] font-medium text-gray-900">Datasets & Exports</p>
                            <p className="text-[11px] text-gray-600">All collected data, exports, and storage will be wiped</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div>
                            <p className="text-[12px] font-medium text-gray-900">API Keys & Integrations</p>
                            <p className="text-[11px] text-gray-600">All active API keys will be permanently revoked</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div>
                            <p className="text-[12px] font-medium text-gray-900">Scheduled Automations</p>
                            <p className="text-[11px] text-gray-600">All recurring schedules will stop permanently</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Restore info */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-green-200">
                      <h3 className="text-[14px] font-semibold text-green-700 mb-2 flex items-center">
                        <Check className="w-4 h-4 mr-1.5" />
                        Reactivate to restore everything
                      </h3>
                      <p className="text-[11px] text-gray-700">
                        Click the reactivate button to immediately cancel the deletion and restore full access to all your data, scrapers, and settings. Your account will be back to normal instantly.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-[11px] leading-[16px] text-gray-500">
            This site is protected by reCAPTCHA and the{' '}
            <a href="#" className="text-blue-600 hover:underline">Google Privacy Policy</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
            {' '}apply.
          </div>
        </div>
      )}

      {/* Right Column - Login Form */}
      <div className={`w-full ${(step === 1 || step === 6) ? 'lg:w-1/2' : ''} flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-white`}>
        <div className={`w-full ${step === 6 ? 'max-w-[480px]' : 'max-w-[360px]'}`}>
          {/* Back button */}
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-[13px]"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
          )}

          <h2 className="text-[22px] leading-[28px] font-semibold text-gray-900 mb-6 font-walsheim-semibold">
            {step === 1 && 'Log in to your account'}
            {step === 2 && 'Security check'}
            {step === 3 && 'Enter your password'}
            {step === 4 && 'Verify your email'}
            {step === 5 && 'Enter verification code'}
            {step === 6 && 'Account Deletion Pending'}
          </h2>

          {step === 1 && (
            <>
              {/* OAuth Buttons */}
              <div className="space-y-3 mb-5">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('Google')}
                  className="w-full flex items-center justify-center space-x-2.5 px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700 font-medium text-[14px] font-walsheim-semibold"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthLogin('GitHub')}
                  className="w-full flex items-center justify-center space-x-2.5 px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700 font-medium text-[14px] font-walsheim-semibold"
                >
                  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <span>Continue with GitHub</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-500 text-[13px]">or</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  {/* Honeypot field - hidden from users */}
                  <input
                    type="text"
                    name="website_check"
                    value={formData.website_check}
                    onChange={(e) => setFormData({ ...formData, website_check: e.target.value })}
                    style={{ display: 'none' }}
                    tabIndex="-1"
                    autoComplete="off"
                  />
                  <CustomValidationTooltip
                    show={showValidationTooltip}
                    message="Please fill out this field."
                    onClose={() => setShowValidationTooltip(false)}
                  >
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        setEmailError('');
                        setShowValidationTooltip(false);
                      }}
                      className={`w-full h-[38px] text-[14px] rounded-md ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                    />
                  </CustomValidationTooltip>
                  {emailError && (
                    <p className="mt-1.5 text-[12px] text-red-600 flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      {emailError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md mt-2"
                  disabled={isCheckingEmail}
                >
                  {isCheckingEmail ? 'Checking...' : 'Next'}
                </Button>
              </form>
            </>
          )}

          {step === 2 && (
            <div className="py-8">
              <SecureShield
                onVerify={handleCaptchaVerify}
                email={formData.email}
              />
            </div>
          )}

          {step === 3 && (
            <>
              <p className="text-[13px] text-gray-600 mb-6">
                <span className="font-medium text-gray-900">{formData.email}</span>
              </p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        setPasswordError('');
                      }}
                      required
                      className={`w-full h-[38px] text-[14px] rounded-md pr-10 ${passwordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                    />
                    <div
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>
                  </div>
                  {passwordError && (
                    <p className="mt-1.5 text-[12px] text-red-600 flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      {passwordError}
                    </p>
                  )}
                  {authProvider === 'google' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                      <p className="text-[12px] text-blue-700 leading-relaxed">
                        <AlertCircle className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" />
                        <strong>Notice:</strong> This account is linked to Google. Since you signed up with Google, you don't have a password for this site.
                      </p>
                      <Button
                        type="button"
                        onClick={() => handleOAuthLogin('Google')}
                        className="w-full mt-3 bg-[#4285F4] hover:bg-[#357ae8] text-white h-[38px] text-[13px] font-medium rounded-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                      </Button>
                      <p className="mt-2.5 text-[11px] text-blue-600 text-center">
                        Or use <strong>"Continue without password"</strong> to get a code.
                      </p>
                    </div>
                  )}
                  {authProvider === 'github' && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-[12px] text-gray-700 leading-relaxed">
                        <AlertCircle className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" />
                        <strong>Notice:</strong> This account is linked to GitHub. Since you signed up with GitHub, you don't have a password for this site.
                      </p>
                      <Button
                        type="button"
                        onClick={() => handleOAuthLogin('GitHub')}
                        className="w-full mt-3 bg-[#24292e] hover:bg-[#1a1e22] text-white h-[38px] text-[13px] font-medium rounded-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.744.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        Sign in with GitHub
                      </Button>
                      <p className="mt-2.5 text-[11px] text-gray-500 text-center">
                        Or use <strong>"Continue without password"</strong> to get a code.
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleContinueWithoutPassword}
                    className="text-[13px] text-blue-600 hover:underline font-medium"
                  >
                    Continue without password
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 4 && usePasswordless && (
            <>
              {isEditingEmail ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                      Email
                    </label>
                    <Input
                      id="edit-email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value, otp: '' });
                        setSendOtpError('');
                      }}
                      required
                      className={`w-full h-[38px] text-[14px] rounded-md ${sendOtpError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                    />
                    {sendOtpError && (
                      <p className="mt-1.5 text-[12px] text-red-600 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {sendOtpError}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleSendOTP}
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md"
                      disabled={!formData.email || isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send OTP'}
                    </Button>
                    <Button
                      onClick={handleCancelEditEmail}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 h-[38px] text-[14px] font-medium rounded-md"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-gray-600 mb-6">
                    We'll send a verification code to<br />
                    <span className="font-medium text-gray-900">{formData.email}</span>
                  </p>

                  {sendOtpError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-[12px] text-red-600 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {sendOtpError}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Button
                      onClick={handleSendOTP}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send OTP'}
                    </Button>

                    <p className="text-center text-[13px] text-gray-600">
                      <button
                        type="button"
                        onClick={handleUseDifferentEmail}
                        className="text-blue-600 hover:underline font-medium"
                        disabled={isLoading}
                      >
                        Use different email
                      </button>
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {step === 5 && usePasswordless && (
            <>
              <p className="text-[13px] text-gray-600 mb-6">
                Verification code sent to<br />
                <span className="font-medium text-gray-900">{formData.email}</span>
              </p>

              {otpSuccessMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-[12px] text-green-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {otpSuccessMessage}
                  </p>
                </div>
              )}

              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-3 text-center">
                    Enter 6-digit code
                  </label>
                  <OTPInput
                    length={6}
                    value={formData.otp}
                    onChange={(otp) => {
                      setFormData({ ...formData, otp });
                      setOtpError('');
                      setOtpSuccessMessage('');
                    }}
                    disabled={isLoading}
                  />
                  {otpError && (
                    <p className="mt-2 text-[12px] text-red-600 flex items-center justify-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      {otpError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md"
                  disabled={isLoading || formData.otp.length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </Button>

                <div className="space-y-2">
                  <p className="text-center text-[13px] text-gray-600">
                    Didn't receive the code?{' '}
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-blue-600 hover:underline font-medium"
                      disabled={isLoading}
                    >
                      Resend
                    </button>
                  </p>
                </div>
              </form>
            </>
          )}

          {step === 6 && deletionInfo && (
            <div className="space-y-4">
              {/* Warning Banner */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-semibold mb-1">
                    Account Deletion in Progress
                  </p>
                  <p className="text-xs text-gray-700 mb-0.5">
                    Deletion requested on{' '}
                    <span className="font-semibold text-gray-900">
                      {formatDate(deletionInfo.deletion_scheduled_at)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600">
                    Account: <span className="font-medium">{deletionInfo.username}</span>
                  </p>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="text-center">
                  <p className="text-xs font-medium mb-1 text-gray-700">Time Remaining</p>
                  <div className="flex items-baseline justify-center gap-1.5 mb-1">
                    <p className="text-3xl font-bold leading-none text-gray-900">
                      {deletionInfo.days_remaining}
                    </p>
                    <p className="text-base font-semibold text-gray-700">
                      {deletionInfo.days_remaining === 1 ? 'Day' : 'Days'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    Permanent deletion: {formatDate(deletionInfo.permanent_deletion_at)}
                  </p>
                </div>
              </div>

              {/* What will be deleted - Mobile optimized */}
              <div className="lg:hidden p-3 rounded-lg bg-gray-50 border border-gray-300">
                <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                  What will be deleted:
                </h3>
                <ul className="space-y-1 text-xs text-gray-700">
                  <li className="flex items-start">
                    <span className="text-gray-500 mr-1.5">•</span>
                    <span>All actors, tasks & configurations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-500 mr-1.5">•</span>
                    <span>Complete run history & logs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-500 mr-1.5">•</span>
                    <span>All datasets & exports</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-500 mr-1.5">•</span>
                    <span>API keys & integrations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-500 mr-1.5">•</span>
                    <span>Scheduled automations</span>
                  </li>
                </ul>
              </div>

              {/* Reactivate info */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      Reactivate to keep everything
                    </h3>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Click the button below to immediately cancel the deletion. All your data, scrapers, and settings will be fully restored.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-xs text-red-600 flex items-center font-medium">
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    {passwordError}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleReactivate}
                  disabled={isReactivating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm font-semibold rounded-lg"
                  data-testid="reactivate-account-btn"
                >
                  {isReactivating ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Reactivating...
                    </span>
                  ) : (
                    'Reactivate My Account'
                  )}
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 h-9 text-sm font-medium rounded-lg"
                  data-testid="logout-btn"
                >
                  Logout Instead
                </Button>
              </div>

              {/* Help text */}
              <p className="text-center text-xs text-gray-500 leading-relaxed px-1">
                Need help? Contact our support team. Reactivation takes effect immediately and all your data will be safe.
              </p>
            </div>
          )}

          {/* Terms and conditions */}
          {step === 1 && (
            <p className="mt-3 text-[11px] leading-[16px] text-gray-600 text-center">
              By signing in, you agree to SCRAPI's{' '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              {' '}and{' '}
              <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a>.
            </p>
          )}

          {/* Signup link */}
          {step === 1 && (
            <p className="mt-6 text-center text-[13px] text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;