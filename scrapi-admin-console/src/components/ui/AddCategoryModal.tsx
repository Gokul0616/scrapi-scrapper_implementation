import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Edit2 } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';

interface Category {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoriesCount: number;
  editingCategory?: Category | null;
  mode: 'add' | 'edit';
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  categoriesCount,
  editingCategory,
  mode 
}) => {
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: categoriesCount
  });
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens or mode/category changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && editingCategory) {
        setFormData({
          name: editingCategory.name,
          description: editingCategory.description || '',
          display_order: editingCategory.display_order
        });
      } else {
        setFormData({
          name: '',
          description: '',
          display_order: categoriesCount
        });
      }
    }
  }, [isOpen, categoriesCount, mode, editingCategory]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('Category name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('scrapi_admin_token');
      
      const url = mode === 'add' 
        ? `${BACKEND_URL}/api/categories`
        : `${BACKEND_URL}/api/categories/${editingCategory?.id}`;
      
      const method = mode === 'add' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Failed to ${mode} category`);
      }

      showAlert(`Category ${mode === 'add' ? 'created' : 'updated'} successfully`, 'success');
      onSuccess(); // This will refresh the category list
      onClose(); // Close the modal after successful save
    } catch (error: any) {
      showAlert(error.message || `Failed to ${mode} category`, 'error');
      console.error(`Error ${mode}ing category:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[60] p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Category</h2>
              <p className="text-xs text-gray-500">Create a new policy category</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
            title="Close"
            data-testid="close-add-category-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="e.g., Legal Documents"
                disabled={loading}
                autoFocus
                data-testid="add-category-name-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                placeholder="Brief description of this category (optional)"
                rows={3}
                disabled={loading}
                data-testid="add-category-description-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="0"
                min="0"
                disabled={loading}
                data-testid="add-category-order-input"
              />
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Categories with lower numbers appear first in the list
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
            data-testid="cancel-add-category-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-add-category-btn"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Category
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
