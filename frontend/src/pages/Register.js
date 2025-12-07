import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from '../hooks/use-toast';
import { Check } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    organizationName: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    const result = await register(formData.username, formData.email, formData.password, formData.organizationName);
    
    if (result.success) {
      toast({ title: 'Registration successful!', variant: 'default' });
      navigate('/home');
    } else {
      toast({ title: 'Registration failed', description: result.error, variant: 'destructive' });
    }
    
    setIsLoading(false);
  };

  const handleOAuthSignup = (provider) => {
    toast({ 
      title: 'OAuth Integration', 
      description: `${provider} OAuth integration coming soon!`, 
      variant: 'default' 
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Marketing Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 p-12 flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-16">
            <img src="/logo.png" alt="Logo" className="w-10 h-10" />
            <span className="text-2xl font-semibold text-gray-900">SCRAPI</span>
          </div>

          {/* Main Content */}
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold text-gray-900 mb-8">
              Get started with a free plan
            </h1>

            <div className="space-y-6">
              {/* Feature 1 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium mb-1">$5.00 free platform credit every month</p>
                  <p className="text-gray-600 text-sm">
                    No credit card required. You can upgrade any time.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium mb-1">Start scraping immediately</p>
                  <p className="text-gray-600 text-sm">
                    Use one of thousands of pre-built Actors for your web scraping and automation projects.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium mb-1">Build your own solution</p>
                  <p className="text-gray-600 text-sm">
                    Our ready to use infrastructure, proxies, and storage set you up for immediate success.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500">
          This site is protected by reCAPTCHA and the{' '}
          <a href="#" className="text-blue-600 hover:underline">Google Privacy Policy</a>{' '}
          and{' '}
          <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
          apply.
        </div>
      </div>

      {/* Right Column - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8">
            Create your account
          </h2>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthSignup('Google')}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignup('GitHub')}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name (Optional)
              </label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Organization Name"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Next'}
            </Button>
          </form>

          {/* Terms and conditions */}
          <p className="mt-4 text-xs text-gray-600 text-center">
            By signing up, you agree to SCRAPI's{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a>.
          </p>

          {/* Login link */}
          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
