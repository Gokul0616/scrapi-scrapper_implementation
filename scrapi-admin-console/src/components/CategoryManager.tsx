import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, FolderPlus, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { CategoryFormModal } from './ui/CategoryFormModal';

interface Category {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryUpdated: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, onClose, onCategoryUpdated }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('scrapi_admin_token');
      const response = await fetch(`${BACKEND_URL}/api/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      setCategories(data);
    } catch (error) {
      showAlert('Failed to load categories', 'error');
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode('add');
    setEditingCategory(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setFormMode('edit');
    setEditingCategory(category);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('scrapi_admin_token');
      const response = await fetch(`${BACKEND_URL}/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete category');
      }

      showAlert('Category deleted successfully', 'success');
      fetchCategories();
      onCategoryUpdated();
    } catch (error: any) {
      showAlert(error.message || 'Failed to delete category', 'error');
      console.error('Error deleting category:', error);
    }
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setIsFormModalOpen(false);
  };

  const handleFormSuccess = () => {
    fetchCategories();
    onCategoryUpdated();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Category Form Modal (for both Add and Edit) */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
        categoriesCount={categories.length}
        editingCategory={editingCategory}
        mode={formMode}
      />

      {/* Main Category Manager Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
          style={{ maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <FolderPlus className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manage Categories</h2>
              <p className="text-xs text-gray-500">Organize your policy documents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Categories List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="text-sm text-gray-500 mt-3">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FolderPlus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No categories yet</h3>
              <p className="text-sm text-gray-500 mb-4">Get started by creating your first category</p>
              {isOwner && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  data-testid="add-first-category-btn"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  All Categories ({categories.length})
                </h3>
              </div>
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="group flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  data-testid={`category-item-${category.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{category.name}</h4>
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        #{category.display_order}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-1">{category.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Display Order: {category.display_order}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit category"
                        data-testid={`edit-category-${category.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete category"
                        data-testid={`delete-category-${category.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom with Add Category button */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'} total
            </p>
            {isOwner && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all"
                data-testid="add-category-btn"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            data-testid="close-modal-btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
