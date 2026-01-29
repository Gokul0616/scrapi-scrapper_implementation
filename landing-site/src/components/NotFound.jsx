import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const NotFound = ({ onOpenCookieSettings }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-black dark:to-zinc-900">
      {/* Navbar */}
      <Navbar onOpenCookieSettings={onOpenCookieSettings} />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6" style={{ minHeight: '100vh' }}>
        <div className="text-center max-w-2xl py-12">
          <h1
            className="text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-6 tracking-tight"
            style={{
              fontFamily:
                "'GT-Walsheim-Regular', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
            data-testid="404-heading"
          >
            Captain! , we’ve encountered an issue...
          </h1>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
            The page you're looking for was not found. Please try somewhere else.
          </p>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-8 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            data-testid="go-to-homepage-btn"
          >
            Go to homepage
          </button>
        </div>
      </main>

      {/* Footer */}
      <Footer onOpenCookieSettings={onOpenCookieSettings} />
    </div>
  );
};

export default NotFound;
