import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const NotFound = ({ onOpenCookieSettings }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Home Page Navbar */}
      <Navbar onOpenCookieSettings={onOpenCookieSettings} />
      
      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-2xl">
          {/* Main Heading with GT-Walsheim-like font */}
          <h1 
            className="text-4xl md:text-5xl font-normal text-gray-900 mb-6 tracking-tight"
            style={{ fontFamily: "'GT-Walsheim-Regular', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
            data-testid="404-heading"
          >
            Houston, we have a problem!
          </h1>
          
          {/* Subtext */}
          <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
            The page you're looking for was not found. Please try somewhere else.
          </p>

          {/* Go to Homepage Button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 text-white text-base font-medium rounded-md hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            data-testid="go-to-homepage-btn"
          >
            Go to homepage
          </button>
        </div>
      </div>

      {/* Footer at bottom */}
      <Footer onOpenCookieSettings={onOpenCookieSettings} />
    </div>
  );
};

export default NotFound;
