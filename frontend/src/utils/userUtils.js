/**
 * Get user initials from organization name or username
 * @param {Object} user - User object containing organization_name and username
 * @returns {string} - First letter of organization name or username
 */
export const getUserInitials = (user) => {
  if (!user) return '?';
  
  // Prefer organization name, fallback to username
  const name = user.organization_name || user.username || '?';
  
  // Return first letter, uppercase
  return name.charAt(0).toUpperCase();
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
