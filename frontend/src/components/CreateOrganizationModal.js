import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Building2, AlertCircle } from 'lucide-react';
import { createOrganization } from '../services/organizationService';

const CreateOrganizationModal = ({ isOpen, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    billing_email: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Organization name must be at least 3 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = 'Only lowercase letters, numbers, and hyphens allowed';
    }
    
    if (!formData.display_name) {
      newErrors.display_name = 'Display name is required';
    }
    
    if (formData.billing_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.billing_email)) {
      newErrors.billing_email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await createOrganization(formData);
      
      // Reset form
      setFormData({
        name: '',
        display_name: '',
        description: '',
        billing_email: ''
      });
      
      onSuccess && onSuccess(response);
      onClose();
    } catch (error) {
      setApiError(error.response?.data?.detail || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Auto-generate name from display_name
    if (name === 'display_name' && !formData.name) {
      const autoName = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, name: autoName }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[9999] rounded-lg border shadow-lg ${
          theme === 'dark' 
            ? 'bg-[#1a1a1a] border-gray-700' 
            : 'bg-white border-gray-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'
            }`}>
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Create Organization
              </h2>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Set up a new workspace for your team
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {apiError && (
            <div className={`mb-4 p-3 rounded-lg flex items-start space-x-2 ${
              theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
            }`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{apiError}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Display Name *
              </label>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="My Company"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } ${errors.display_name ? 'border-red-500' : ''}`}
              />
              {errors.display_name && (
                <p className="text-xs text-red-500 mt-1">{errors.display_name}</p>
              )}
            </div>

            {/* Organization Name */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Organization Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="my-company"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } ${errors.name ? 'border-red-500' : ''}`}
              />
              <p className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Lowercase, numbers, and hyphens only. This will be used in URLs.
              </p>
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of your organization"
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Billing Email */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Billing Email (Optional)
              </label>
              <input
                type="email"
                name="billing_email"
                value={formData.billing_email}
                onChange={handleChange}
                placeholder="billing@company.com"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } ${errors.billing_email ? 'border-red-500' : ''}`}
              />
              {errors.billing_email && (
                <p className="text-xs text-red-500 mt-1">{errors.billing_email}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateOrganizationModal;
