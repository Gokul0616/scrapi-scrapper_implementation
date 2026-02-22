/**
 * ErrorDisplay facade
 * This file now just acts as a proxy to send global events to MessageContext
 * instead of rendering its own UI, ensuring application-wide consistency.
 */

// Container component is no longer used, providing empty fallback to prevent import errors if still referenced
export const ErrorDisplayContainer = () => null;

// Helper function to show errors from anywhere in the app
export const showError = (message, options = {}) => {
  const event = new CustomEvent('show-global-message', {
    detail: {
      message,
      type: options.type || 'error',
      title: options.title,
      duration: options.duration !== undefined ? options.duration : 5000
    }
  });
  window.dispatchEvent(event);
};

// Dummy default export to satisfy "import ErrorDisplay"
export default function ErrorDisplay() {
  return null;
}
