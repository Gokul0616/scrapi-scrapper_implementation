import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Edit2, ArrowLeftRight, AlertCircle } from 'lucide-react';
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
  const [duplicateError, setDuplicateError] = useState<{
    message: string;
    existingCategory: Category;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Reset form when modal opens or mode/category changes
  useEffect(() => {
    if (isOpen) {
      setDuplicateError(null);
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

  // Check for duplicate display order on change
  useEffect(() => {
    if (!isOpen) return;
    
    const checkDisplayOrder = async () => {
      const displayOrder = formData.display_order;
      
      // Don't check if it's the same as the current category being edited
      if (mode === 'edit' && editingCategory && displayOrder === editingCategory.display_order) {
        setDuplicateError(null);
        return;
      }

      setCheckingDuplicate(true);
      try {
        const token = localStorage.getItem('scrapi_admin_token');
        const categoryIdParam = mode === 'edit' && editingCategory 
          ? `?category_id=${editingCategory.id}` 
          : '';
        
        const response = await fetch(
          `${BACKEND_URL}/api/categories/check-display-order/${displayOrder}${categoryIdParam}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (!data.available && data.existing_category) {
            setDuplicateError({
              message: `Display order ${displayOrder} is already used by "${data.existing_category.name}"`,
              existingCategory: data.existing_category
            });
          } else {
            setDuplicateError(null);
          }
        }
      } catch (error) {
        console.error('Error checking display order:', error);
      } finally {
        setCheckingDuplicate(false);
      }
    };

    const timeoutId = setTimeout(checkDisplayOrder, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.display_order, isOpen, mode, editingCategory]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('Category name is required', 'error');
      return;
    }

    // Check for duplicate before saving
    if (duplicateError) {
      showAlert('Please resolve the duplicate display order before saving', 'error');
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
        
        // Check if it's a duplicate display order error (409 status)
        if (response.status === 409 && error.detail?.existing_category) {
          setDuplicateError({
            message: error.detail.message || 'Display order already exists',
            existingCategory: error.detail.existing_category
          });
          showAlert('Display order already exists. Use the swap button to exchange orders.', 'error');
          return;
        }
        
        throw new Error(error.detail || `Failed to ${mode} category`);
      }

      const result = await response.json();
      
      // Check if display order was auto-adjusted
      if (result.display_order !== formData.display_order) {
        showAlert(
          `Category ${mode === 'add' ? 'created' : 'updated'} successfully! Display order was auto-adjusted from ${formData.display_order} to ${result.display_order}.`,
          'success'
        );
      } else {
        showAlert(`Category ${mode === 'add' ? 'created' : 'updated'} successfully`, 'success');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      showAlert(error.message || `Failed to ${mode} category`, 'error');
      console.error(`Error ${mode}ing category:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!duplicateError) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('scrapi_admin_token');
      
      // For 'add' mode, we need to save first then swap
      if (mode === 'add') {
        // First create the category
        const createResponse = await fetch(`${BACKEND_URL}/api/categories`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create category');
        }

        const newCategory = await createResponse.json();
        
        // Then swap
        const swapResponse = await fetch(`${BACKEND_URL}/api/categories/swap-display-order`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category_id_1: newCategory.id,
            category_id_2: duplicateError.existingCategory.id
          })
        });

        if (!swapResponse.ok) {
          throw new Error('Failed to swap display orders');
        }

        showAlert('Category created and display orders swapped successfully!', 'success');
      } else {
        // For 'edit' mode, just swap
        const swapResponse = await fetch(`${BACKEND_URL}/api/categories/swap-display-order`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category_id_1: editingCategory?.id,
            category_id_2: duplicateError.existingCategory.id
          })
        });

        if (!swapResponse.ok) {
          throw new Error('Failed to swap display orders');
        }

        // Update the category with other fields
        await fetch(`${BACKEND_URL}/api/categories/${editingCategory?.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            display_order: duplicateError.existingCategory.display_order
          })
        });

        showAlert('Category updated and display orders swapped successfully!', 'success');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      showAlert(error.message || 'Failed to swap display orders', 'error');
      console.error('Error swapping:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !duplicateError) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  const isAddMode = mode === 'add';
  const title = isAddMode ? 'Add New Category' : 'Edit Category';
  const subtitle = isAddMode ? 'Create a new policy category' : 'Update category details';
  const buttonText = isAddMode ? 'Create Category' : 'Save Changes';
  const ButtonIcon = isAddMode ? Plus : Edit2;

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
              <ButtonIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
            title="Close"
            data-testid="close-category-form-modal"
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
                data-testid="category-name-input"
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
                data-testid="category-description-input"
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
                className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                  duplicateError 
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
                placeholder="0"
                min="0"
                disabled={loading}
                data-testid="category-order-input"
              />
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Categories with lower numbers appear first in the list
              </p>
              
              {/* Duplicate Warning and Swap Button */}
              {duplicateError && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg" data-testid="duplicate-warning">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-orange-800 mb-1">
                        Display Order Conflict
                      </p>
                      <p className="text-xs text-orange-700">
                        {duplicateError.message}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSwap}
                    disabled={loading || !formData.name.trim()}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    data-testid="swap-display-order-btn"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    Swap Display Orders
                  </button>
                  <p className="text-xs text-orange-600 mt-2 italic">
                    💡 Swapping will exchange display orders: Your category will take order {formData.display_order}, and "{duplicateError.existingCategory.name}" will take your current order.
                  </p>
                </div>
              )}
              
              {checkingDuplicate && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  Checking availability...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
            data-testid="cancel-category-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || duplicateError !== null}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-category-btn"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isAddMode ? 'Creating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {buttonText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
