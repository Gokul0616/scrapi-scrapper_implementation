import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, FolderPlus, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0
  });

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
    setFormData({
      name: '',
      description: '',
      display_order: categories.length
    });
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order
    });
    setEditingId(category.id);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('Category name is required', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('scrapi_admin_token');
      const url = isCreating
        ? `${BACKEND_URL}/api/categories`
        : `${BACKEND_URL}/api/categories/${editingId}`;
      
      const method = isCreating ? 'POST' : 'PUT';

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
        throw new Error(error.detail || 'Failed to save category');
      }

      showAlert(`Category ${isCreating ? 'created' : 'updated'} successfully`, 'success');
      setIsCreating(false);
      setEditingId(null);
      fetchCategories();
      onCategoryUpdated();
    } catch (error: any) {
      showAlert(error.message || 'Failed to save category', 'error');
      console.error('Error saving category:', error);
    }
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
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', description: '', display_order: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Manage Categories</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {isCreating ? 'Create New Category' : 'Edit Category'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., Legal Documents"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Category Button */}
          {!isCreating && !editingId && isOwner && (
            <button
              onClick={handleCreate}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          )}

          {/* Categories List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No categories found</div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{category.name}</h4>
                    {category.description && (
                      <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Display Order: {category.display_order}</p>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
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

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
