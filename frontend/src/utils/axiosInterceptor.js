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
 * Setup axios interceptors for workspace context and 404 handling
 */
export const setupAxiosInterceptor = (navigate, showMessage) => {
  // Request interceptor to add workspace headers
  axios.interceptors.request.use(
    (config) => {
      // Get active workspace from localStorage
      const activeWorkspace = localStorage.getItem('activeWorkspace');
      if (activeWorkspace) {
        try {
          const workspace = JSON.parse(activeWorkspace);
          config.headers['X-Workspace-Type'] = workspace.workspace_type || 'personal';
          config.headers['X-Workspace-Id'] = workspace.workspace_id || '';
        } catch (e) {
          console.error('Failed to parse active workspace:', e);
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for 404 handling
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
          return Promise.reject(error);
        }
      }

      if (showMessage) {
        let errorText = 'An unexpected error occurred';
        if (error.response) {
          if (error.response.data && error.response.data.detail) {
            errorText = error.response.data.detail;
          } else if (error.response.data && error.response.data.message) {
            errorText = error.response.data.message;
          } else if (error.response.status === 404) {
            errorText = 'API endpoint not found (404)';
          } else {
            errorText = `Server error (${error.response.status})`;
          }
        } else if (error.message) {
          errorText = error.message;
        }
        showMessage(errorText, 'error');
      }

      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptor;
