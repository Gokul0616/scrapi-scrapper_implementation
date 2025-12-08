import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { showError } from '../components/ErrorDisplay';
import { Check, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import OTPInput from '../components/OTPInput';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const Login = () => {
  const navigate = useNavigate();
  const { login, setUser, lastPath } = useAuth();
  const [step, setStep] = useState(1); // 1: Email, 2: Password, 3: OTP (passwordless)
  const [formData, setFormData] = useState({ 
    email: '', 
    otp: '',
    password: '' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usePasswordless, setUsePasswordless] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      showError('Login successful!', { type: 'success' });
      navigate(result.redirectPath || '/home');
    } else {
      showError(result.error || 'Login failed', { type: 'error', title: 'Login Failed' });
    }
    
    setIsLoading(false);
  };

  const handleContinueWithoutPassword = async () => {
    setUsePasswordless(true);
    setIsLoading(true);
    
    try {
      // Send OTP via backend
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, purpose: 'login' })
      });

      const data = await response.json();

      if (response.ok) {
        showError('Verification code sent to your email', { type: 'success', title: 'OTP Sent' });
        setStep(3);
      } else {
        showError(data.detail || 'Failed to send verification code', { type: 'error', title: 'Error' });
      }
    } catch (error) {
      showError('Network error. Please try again.', { type: 'error', title: 'Error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, purpose: 'login' })
      });

      const data = await response.json();

      if (response.ok) {
        showError('Verification code sent to your email', { type: 'success', title: 'OTP Sent' });
      } else {
        showError(data.detail || 'Failed to send verification code', { type: 'error', title: 'Error' });
      }
    } catch (error) {
      showError('Network error. Please try again.', { type: 'error', title: 'Error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Verify OTP via backend
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          otp_code: formData.otp,
          purpose: 'login'
        })
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        // Store token and user data
        localStorage.setItem('token', data.access_token);
        setUser(data.user);
        
        showError('Login successful!', { type: 'success', title: 'Welcome' });
        navigate(lastPath || '/home');
      } else {
        showError(data.detail || 'Invalid verification code', { type: 'error', title: 'Verification Failed' });
      }
    } catch (error) {
      showError('Network error. Please try again.', { type: 'error', title: 'Error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    showError(`${provider} OAuth integration coming soon!`, { type: 'info', title: 'Coming Soon' });
  };

  const handleBack = () => {
    if (step === 3 && usePasswordless) {
      setUsePasswordless(false);
      setStep(2);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleUseDifferentEmail = () => {
    setIsEditingEmail(true);
  };

  const handleEmailChange = (newEmail) => {
    setFormData({ ...formData, email: newEmail, otp: '' });
  };

  const handleSaveEmail = () => {
    if (formData.email) {
      setIsEditingEmail(false);
      // Optionally resend OTP with new email
      handleSendOTP();
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Marketing Content - Only show on step 1 */}
      {step === 1 && (
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#f8f5ff] via-[#ede7ff] to-[#f3efff] p-12 flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center space-x-2 mb-16">
              <img src="/logo.png" alt="SCRAPI Logo" className="w-9 h-9" />
              <span className="text-xl font-semibold text-gray-900">SCRAPI</span>
            </div>

            {/* Main Content */}
            <div className="max-w-md">
              <h1 className="text-[28px] leading-[34px] font-semibold text-gray-900 mb-7">
                Get started with a free plan
              </h1>

              <div className="space-y-5">
                {/* Feature 1 */}
                <div className="flex items-start space-x-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="w-[18px] h-[18px] text-green-600 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-[15px] leading-[22px] text-gray-900 font-medium mb-0.5">$5.00 free platform credit every month</p>
                    <p className="text-[13px] leading-[19px] text-gray-600">
                      No credit card required. You can upgrade any time.
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start space-x-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="w-[18px] h-[18px] text-green-600 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-[15px] leading-[22px] text-gray-900 font-medium mb-0.5">Start scraping immediately</p>
                    <p className="text-[13px] leading-[19px] text-gray-600">
                      Use one of thousands of pre-built Actors for your web scraping and automation projects.
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start space-x-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="w-[18px] h-[18px] text-green-600 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-[15px] leading-[22px] text-gray-900 font-medium mb-0.5">Build your own solution</p>
                    <p className="text-[13px] leading-[19px] text-gray-600">
                      Our ready to use infrastructure, proxies, and storage set you up for immediate success.
                    </p>
                  </div>
                </div>
              </div>
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
      <div className={`w-full ${step === 1 ? 'lg:w-1/2' : ''} flex items-center justify-center p-8 bg-white`}>
        <div className="w-full max-w-[360px]">
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

          <h2 className="text-[22px] leading-[28px] font-semibold text-gray-900 mb-6">
            {step === 1 && 'Log in to your account'}
            {step === 2 && 'Enter your password'}
            {step === 3 && 'Enter verification code'}
          </h2>

          {step === 1 && (
            <>
              {/* OAuth Buttons */}
              <div className="space-y-3 mb-5">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('Google')}
                  className="w-full flex items-center justify-center space-x-2.5 px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700 font-medium text-[14px]"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthLogin('GitHub')}
                  className="w-full flex items-center justify-center space-x-2.5 px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700 font-medium text-[14px]"
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
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full h-[38px] text-[14px] border-gray-300 rounded-md"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Please wait...' : 'Next'}
                </Button>
              </form>
            </>
          )}

          {step === 2 && (
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
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full h-[38px] text-[14px] border-gray-300 rounded-md pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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

          {step === 3 && usePasswordless && (
            <>
              <p className="text-[13px] text-gray-600 mb-6">
                We'll send a verification code to<br />
                <span className="font-medium text-gray-900">{formData.email}</span>
              </p>

              {formData.otp === '' ? (
                <div className="space-y-4">
                  <Button
                    onClick={handleSendOTP}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send OTP'}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleUseDifferentEmail}
                      className="text-[13px] text-blue-600 hover:underline font-medium"
                    >
                      Use different email
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleOTPSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-3 text-center">
                      Enter 6-digit code
                    </label>
                    <OTPInput
                      length={6}
                      value={formData.otp}
                      onChange={(otp) => setFormData({ ...formData, otp })}
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md"
                    disabled={isLoading || formData.otp.length !== 6}
                  >
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </Button>

                  <div className="space-y-2">
                    <p className="text-center text-[13px] text-gray-600">
                      Didn't receive the code?{' '}
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Resend
                      </button>
                    </p>
                    <p className="text-center text-[13px] text-gray-600">
                      <button
                        type="button"
                        onClick={handleUseDifferentEmail}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Use different email
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </>
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