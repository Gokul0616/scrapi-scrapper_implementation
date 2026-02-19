import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import { createOrganization } from '../services/organizationService';
import { Building2, AlertCircle, HelpCircle, User, X } from 'lucide-react';
import GlobalModal from './GlobalModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const CreateOrganizationModal = () => {
  const { theme } = useTheme();
  const { closeModal, modalData, isModalOpen } = useModal();
  const isOpen = isModalOpen('create-organization');
  const onSuccess = modalData?.onSuccess;

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    billing_email: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        display_name: '',
        billing_email: ''
      });
      setErrors({});
      setApiError('');
      setLoading(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Organization username is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Username must be at least 3 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = 'Only lowercase letters, numbers, and hyphens allowed';
    }

    if (!formData.display_name) {
      newErrors.display_name = 'Organization name is required';
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

      onSuccess && onSuccess(response);
      closeModal();
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

    // Auto-generate name from display_name if name hasn't been manually edited
    // Note: This logic is simple; real implementation might track "touched" state more robustly.
    if (name === 'display_name' && !formData.name) {
      const autoName = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, name: autoName }));
    }
  };

  if (!isOpen) return null;

  return (
    <GlobalModal
      modalId="create-organization"
      title="Create a new organization"
      size="md"
      showCloseButton={true}
      closeOnBackdropClick={!loading}
    >
      <form onSubmit={handleSubmit} className="p-6">
        {apiError && (
          <div className={`mb-4 p-3 rounded-lg flex items-start space-x-2 ${theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
            }`}>
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-500">{apiError}</p>
          </div>
        )}

        <div className="space-y-5">
          {/* Organization Name */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
              Organization name
            </label>
            <div className="relative">
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-md border text-sm ${theme === 'dark'
                  ? 'bg-gray-950 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } ${errors.display_name ? 'border-red-500' : ''} focus:ring-1 focus:ring-blue-500 outline-none transition-colors`}
              />
              <div className="absolute right-3 top-2.5">
                <User className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>
            {errors.display_name && (
              <p className="text-xs text-red-500 mt-1">{errors.display_name}</p>
            )}
          </div>

          {/* Organization Username */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Organization username
              </label>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Unique identifier for your organization URL
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-md border text-sm ${theme === 'dark'
                ? 'bg-gray-950 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } ${errors.name ? 'border-red-500' : ''} focus:ring-1 focus:ring-blue-500 outline-none transition-colors`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Billing Email */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
              Organization email <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              name="billing_email"
              value={formData.billing_email}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-md border text-sm ${theme === 'dark'
                ? 'bg-gray-950 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } ${errors.billing_email ? 'border-red-500' : ''} focus:ring-1 focus:ring-blue-500 outline-none transition-colors`}
            />
            {errors.billing_email && (
              <p className="text-xs text-red-500 mt-1">{errors.billing_email}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-8">
          <button
            type="button"
            onClick={closeModal}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${theme === 'dark'
              ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </GlobalModal>
  );
};

export default CreateOrganizationModal;
