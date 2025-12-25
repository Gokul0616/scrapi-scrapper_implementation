/**
 * Get user initials from organization name or full name
 * @param {Object} user - User object containing organization_name, first_name, last_name
 * @returns {string} - First letter of organization name or full name
 */
export const getUserInitials = (user) => {
  if (!user) return '?';
  
  // Prefer organization name, then first name, fallback to username
  const name = user.organization_name || user.first_name || user.username || '?';
  
  // Return first letter, uppercase
  return name.charAt(0).toUpperCase();
};

/**
 * Get user display name (organization name or full name)
 * @param {Object} user - User object
 * @returns {string} - Display name
 */
export const getUserDisplayName = (user) => {
  if (!user) return '';
  
  // Prefer organization name
  if (user.organization_name) {
    return user.organization_name;
  }
  
  // Otherwise use full name
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  
  // Fallback to username
  return user.username || '';
};

/**
 * Get profile background color based on user's profile_color
 * @param {string} profileColor - The color from backend
 * @param {string} theme - Current theme ('dark' or 'light')
 * @returns {string} - CSS gradient string
 */
export const getProfileColor = (profileColor, theme = 'dark') => {
  if (!profileColor) {
    // Default fallback color
    return 'linear-gradient(to bottom right, #8B5CF6, #7C3AED)';
  }
  
  // Create a gradient using the profile color
  return `linear-gradient(to bottom right, ${profileColor}, ${profileColor}dd)`;
};
