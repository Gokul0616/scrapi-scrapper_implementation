/**
 * Utility for managing valid sidebar routes.
 * This is used to ensure that 'last-path' redirection only sends users
 * to actual dashboard pages, and not to auth pages or transient checkout pages.
 */

export const VALID_SIDEBAR_PATHS = [
    '/home',
    '/actors',
    '/runs',
    '/tasks',
    '/integrations',
    '/schedules',
    '/my-actors',
    '/insights',
    '/messaging',
    '/proxy',
    '/storage',
    '/billing',
    '/settings',
    '/marketplace',
    '/store'
];

/**
 * Checks if a given path is one of the main sidebar menu items.
 * @param {string} path - The path to check.
 * @returns {boolean} - True if it's a valid sidebar path.
 */
export const isValidSidebarPath = (path) => {
    if (!path) return false;
    // Remove trailing slashes and potential query params for comparison
    const cleanPath = path.split('?')[0].replace(/\/$/, '') || '/';

    // Special case for root
    // if (cleanPath === '/') return true;

    return VALID_SIDEBAR_PATHS.some(validPath => cleanPath === validPath);
};
