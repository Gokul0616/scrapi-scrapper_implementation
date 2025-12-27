import axios from 'axios';

// List of static routes that should NOT redirect to 404
const STATIC_ROUTES = [
  '/login',
  '/register',
  '/home',
  '/actors',
  '/runs',
  '/marketplace',
  '/store',
  '/schedules',
  '/access-keys',
  '/settings',
  '/billing',
  '/docs',
  '/help',
  '/storage',
  '/proxy',
  '/integrations',
  '/tasks',
  '/development',
  '/actor-code-editor'
];

// Dynamic route patterns (routes with :param)
const DYNAMIC_ROUTE_PATTERNS = [
  /^\/actor\/[^/]+$/,      // /actor/:actorId
  /^\/dataset\/[^/]+$/,    // /dataset/:runId
  /^\/run\/[^/]+$/         // /run/:runId
];

/**
 * Check if current path is a dynamic route
 */
const isDynamicRoute = (pathname) => {
  // Check if it matches any dynamic route pattern
  return DYNAMIC_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));
};

/**
 * Check if current path should handle 404 redirects
 */
const shouldHandleNotFound = (pathname) => {
  // Don't handle if it's a static route
  if (STATIC_ROUTES.includes(pathname)) {
    return false;
  }
  
  // Only handle if it's a dynamic route
  return isDynamicRoute(pathname);
};

/**
 * Setup axios response interceptor for 404 handling
 */
export const setupAxiosInterceptor = (navigate) => {
  // Response interceptor
  axios.interceptors.response.use(
    (response) => {
      // Return successful response as-is
      return response;
    },
    (error) => {
      // Check if it's a 404 error
      if (error.response && error.response.status === 404) {
        const currentPath = window.location.pathname;
        
        // Only redirect to not-found for dynamic routes with IDs
        if (shouldHandleNotFound(currentPath)) {
          console.log('404 detected on dynamic route, navigating to not-found page');
          navigate('/not-found');
        }
      }
      
      // Always reject the error so components can handle it if needed
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptor;
