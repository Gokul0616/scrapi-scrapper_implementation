import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Edit2, Trash2, Save, X, AlertCircle, Search, Filter,
  ChevronRight, Shield, ChevronDown, Info, GripVertical, FolderPlus, Table as TableIcon, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { CategoryManager } from '../components/CategoryManager';

interface SidebarItem {
  id: string;
  title: string;
  icon?: string;
}

interface PolicySubsection {
  id: string;
  title: string;
  content: string;
}

interface PolicySection {
  id: string;
  title: string;
  content: string;
  subsections?: PolicySubsection[];
  table?: any[];
}

interface Policy {
  doc_id: string;
  title: string;
  label?: string;
  category: string;
  is_public: boolean;
  last_updated: string;
  intro: string;
  sidebar_items: SidebarItem[];
  sections: PolicySection[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// AWS-style Skeleton Loader
const SkeletonLoader: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="h-7 w-48 bg-muted rounded mb-2"></div>
          <div className="h-4 w-64 bg-muted/50 rounded"></div>
        </div>
        <div className="h-9 w-32 bg-muted rounded"></div>
      </div>
      <div className="bg-card shadow-sm rounded border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex gap-4">
            <div className="h-8 w-96 bg-muted rounded"></div>
            <div className="h-8 w-24 bg-muted rounded"></div>
          </div>
        </div>
        <div className="bg-muted/30 px-6 py-3 border-b border-border">
          <div className="flex gap-8">
            <div className="h-4 w-32 bg-muted rounded"></div>
            <div className="h-4 w-24 bg-muted rounded"></div>
            <div className="h-4 w-28 bg-muted rounded"></div>
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-muted rounded"></div>
              <div className="flex-1">
                <div className="h-5 w-40 bg-muted rounded mb-2"></div>
                <div className="h-3 w-64 bg-muted/50 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PoliciesPage: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedPolicy, setEditedPolicy] = useState<Policy | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(['Legal Documents', 'Compliance']);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  // State for collapsible sections in edit mode
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  // State for drag and drop
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    fetchPolicies();
    fetchCategories();
  }, []);

  // Sync drawer state with selected policy
  useEffect(() => {
    if (selectedPolicy) {
      setDrawerOpen(true);
    } else {
      setDrawerOpen(false);
    }
  }, [selectedPolicy]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('scrapi_admin_token');
      const response = await fetch(`${BACKEND_URL}/api/policies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch policies');

      const data = await response.json();
      setPolicies(data);
    } catch (error) {
      showAlert('Failed to load policies', 'error');
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('scrapi_admin_token');
      const response = await fetch(`${BACKEND_URL}/api/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      const categoryNames = data.map((cat: any) => cat.name);
      setCategories(categoryNames);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Keep default categories if fetch fails
      setCategories(['Legal Documents', 'Compliance']);
    }
  };

  const handleEdit = (policy: Policy) => {
    setEditedPolicy({ ...policy });
    setIsEditing(true);
    setSelectedPolicy(null);
    // Expand all sections by default when editing starts
    const initialExpanded: Record<number, boolean> = {};
    policy.sections.forEach((_, idx) => { initialExpanded[idx] = false; });
    // Maybe expand the first one
    if (policy.sections.length > 0) initialExpanded[0] = true;
    setExpandedSections(initialExpanded);
  };

  const handleCreate = () => {
    setEditedPolicy({
      doc_id: '',
      title: '',
      label: '',
      category: 'Legal Documents',
      is_public: true,
      last_updated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      intro: '',
      sidebar_items: [],
      sections: []
    });
    setIsCreating(true);
    setIsEditing(true);
    setSelectedPolicy(null);
    setExpandedSections({});
  };

  const handleSave = async () => {
    if (!editedPolicy) return;

    try {
      const token = localStorage.getItem('scrapi_admin_token');
      const url = isCreating
        ? `${BACKEND_URL}/api/policies`
        : `${BACKEND_URL}/api/policies/${editedPolicy.doc_id}`;

      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedPolicy)
      });

      if (!response.ok) throw new Error('Failed to save policy');

      showAlert(`Policy ${isCreating ? 'created' : 'updated'} successfully`, 'success');
      setIsEditing(false);
      setIsCreating(false);
      setEditedPolicy(null);
      fetchPolicies();
    } catch (error) {
      showAlert('Failed to save policy', 'error');
      console.error('Error saving policy:', error);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const token = localStorage.getItem('scrapi_admin_token');
      const response = await fetch(`${BACKEND_URL}/api/policies/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete policy');

      showAlert('Policy deleted successfully', 'success');
      fetchPolicies();
      setSelectedPolicy(null);
    } catch (error) {
      showAlert('Failed to delete policy', 'error');
      console.error('Error deleting policy:', error);
    }
  };

  const addSection = () => {
    if (!editedPolicy) return;
    const newIdx = editedPolicy.sections.length;
    setEditedPolicy({
      ...editedPolicy,
      sections: [...editedPolicy.sections, { id: '', title: '', content: '', subsections: [], table: [] }]
    });
    setExpandedSections(prev => ({ ...prev, [newIdx]: true }));
  };

  const addSidebarItem = () => {
    if (!editedPolicy) return;
    setEditedPolicy({
      ...editedPolicy,
      sidebar_items: [...editedPolicy.sidebar_items, { id: '', title: '', icon: '' }]
    });
  };

  const updateSection = (index: number, field: string, value: any) => {
    if (!editedPolicy) return;
    const newSections = [...editedPolicy.sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const updateSidebarItem = (index: number, field: string, value: string) => {
    if (!editedPolicy) return;
    const newItems = [...editedPolicy.sidebar_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditedPolicy({ ...editedPolicy, sidebar_items: newItems });
  };

  const removeSection = (index: number) => {
    if (!editedPolicy) return;
    const newSections = editedPolicy.sections.filter((_, i) => i !== index);
    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const removeSidebarItem = (index: number) => {
    if (!editedPolicy) return;
    const newItems = editedPolicy.sidebar_items.filter((_, i) => i !== index);
    setEditedPolicy({ ...editedPolicy, sidebar_items: newItems });
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    setDraggedSectionIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    // Add some visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedSectionIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedSectionIndex !== null && draggedSectionIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedSectionIndex === null || !editedPolicy) return;

    // Reorder sections
    const newSections = [...editedPolicy.sections];
    const [draggedSection] = newSections.splice(draggedSectionIndex, 1);
    newSections.splice(dropIndex, 0, draggedSection);

    // Update expanded sections mapping
    const newExpandedSections: Record<number, boolean> = {};
    Object.keys(expandedSections).forEach((key) => {
      const oldIndex = parseInt(key);
      let newIndex = oldIndex;

      if (oldIndex === draggedSectionIndex) {
        newIndex = dropIndex;
      } else if (draggedSectionIndex < dropIndex && oldIndex > draggedSectionIndex && oldIndex <= dropIndex) {
        newIndex = oldIndex - 1;
      } else if (draggedSectionIndex > dropIndex && oldIndex >= dropIndex && oldIndex < draggedSectionIndex) {
        newIndex = oldIndex + 1;
      }

      newExpandedSections[newIndex] = expandedSections[oldIndex];
    });

    setEditedPolicy({ ...editedPolicy, sections: newSections });
    setExpandedSections(newExpandedSections);
    setDraggedSectionIndex(null);
    setDragOverIndex(null);
  };

  // Table management functions
  const addTableToSection = (sectionIndex: number) => {
    if (!editedPolicy) return;
    const newSections = [...editedPolicy.sections];
    // Initialize with empty table or default structure
    newSections[sectionIndex].table = [];
    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const addTableRow = (sectionIndex: number) => {
    if (!editedPolicy) return;
    const newSections = [...editedPolicy.sections];
    const table = newSections[sectionIndex].table || [];

    // If table is empty, add first row with default columns
    if (table.length === 0) {
      newSections[sectionIndex].table = [{ name: '', description: '', type: '', expiration: '' }];
    } else {
      // Copy structure from first row
      const newRow: any = {};
      const firstRow = table[0];
      Object.keys(firstRow).forEach(key => {
        newRow[key] = '';
      });
      newSections[sectionIndex].table = [...table, newRow];
    }

    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const removeTableRow = (sectionIndex: number, rowIndex: number) => {
    if (!editedPolicy) return;
    const newSections = [...editedPolicy.sections];
    const table = newSections[sectionIndex].table || [];
    newSections[sectionIndex].table = table.filter((_, idx) => idx !== rowIndex);
    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const updateTableCell = (sectionIndex: number, rowIndex: number, columnKey: string, value: string) => {
    if (!editedPolicy) return;
    const newSections = [...editedPolicy.sections];
    const table = [...(newSections[sectionIndex].table || [])];
    table[rowIndex] = { ...table[rowIndex], [columnKey]: value };
    newSections[sectionIndex].table = table;
    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const addTableColumn = (sectionIndex: number, columnName: string) => {
    if (!editedPolicy || !columnName.trim()) return;
    const newSections = [...editedPolicy.sections];
    const table = newSections[sectionIndex].table || [];

    // Add new column to all rows
    const updatedTable = table.map(row => ({ ...row, [columnName]: '' }));
    newSections[sectionIndex].table = updatedTable;
    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const removeTableColumn = (sectionIndex: number, columnKey: string) => {
    if (!editedPolicy) return;
    const newSections = [...editedPolicy.sections];
    const table = newSections[sectionIndex].table || [];

    // Remove column from all rows
    const updatedTable = table.map(row => {
      const newRow = { ...row };
      delete newRow[columnKey];
      return newRow;
    });

    newSections[sectionIndex].table = updatedTable;
    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const removeTable = (sectionIndex: number) => {
    if (!editedPolicy) return;
    const newSections = [...editedPolicy.sections];
    newSections[sectionIndex].table = [];
    setEditedPolicy({ ...editedPolicy, sections: newSections });
  };

  const filteredPolicies = policies.filter(policy =>
    policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.doc_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedPolicy(null), 300); // Clear after animation
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="policies-page-loading">
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative" data-testid="policies-page">
      {/* Header */}
      {!isEditing && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Policy Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage legal documents and policies for your platform</p>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => setCategoryManagerOpen(true)}
                className="bg-card hover:bg-muted text-foreground border border-border px-4 py-2 rounded-sm text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                data-testid="manage-categories-btn"
              >
                <FolderPlus size={16} />
                Manage Categories
              </button>
              <button
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-sm text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                data-testid="create-policy-btn"
              >
                <Plus size={16} />
                Create Policy
              </button>
            </div>
          )}
        </div>
      )}

      {!isOwner && !isEditing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm text-yellow-800">
            You have view-only access. Only owners can create, edit, or delete policies.
          </div>
        </div>
      )}

      {isEditing && editedPolicy ? (
        /* Edit/Create Layout - AWS "Resource Style" */
        <div className="max-w-5xl mx-auto pb-20">
          {/* Editor Header */}
          <div className="mb-6">
            {/* Back Button */}
            <button
              onClick={() => {
                setIsEditing(false);
                setIsCreating(false);
                setEditedPolicy(null);
              }}
              className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              data-testid="back-to-policies-btn"
            >
              <ArrowLeft size={16} />
              Back to Policies
            </button>

            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isCreating ? 'Create Policy' : `Edit: ${editedPolicy.title}`}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure policy metadata, navigation structure, and content sections.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    setEditedPolicy(null);
                  }}
                  className="bg-card border border-border text-foreground px-4 py-2 rounded-sm text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-sm text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                  data-testid="save-policy-btn"
                >
                  <Save size={16} />
                  {isCreating ? 'Create Policy' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">

            {/* 1. General Configuration Card */}
            <div className="bg-card rounded border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Shield className="text-primary" size={20} />
                  General Configuration
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Policy Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedPolicy.title}
                      onChange={(e) => setEditedPolicy({ ...editedPolicy, title: e.target.value })}
                      className="block w-full px-3 py-2 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-colors"
                      placeholder="e.g. Terms of Service"
                      data-testid="policy-title-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Document ID (Slug) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editedPolicy.doc_id}
                        onChange={(e) => setEditedPolicy({ ...editedPolicy, doc_id: e.target.value })}
                        disabled={!isCreating}
                        className={`block w-full px-3 py-2 border border-border rounded-sm text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-colors ${!isCreating ? 'bg-muted text-muted-foreground' : 'bg-card text-foreground'}`}
                        placeholder="e.g. terms-of-service"
                        data-testid="policy-doc-id-input"
                      />
                      {!isCreating && (
                        <span className="absolute right-3 top-2 text-xs text-muted-foreground flex items-center gap-1">
                          <Info size={12} /> Immutable
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Last Updated String
                  </label>
                  <input
                    type="text"
                    value={editedPolicy.last_updated}
                    onChange={(e) => setEditedPolicy({ ...editedPolicy, last_updated: e.target.value })}
                    className="block w-full px-3 py-2 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-colors max-w-md"
                    placeholder="e.g. August 2025"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Sidebar Label
                    </label>
                    <input
                      type="text"
                      value={editedPolicy.label || ''}
                      onChange={(e) => setEditedPolicy({ ...editedPolicy, label: e.target.value })}
                      className="block w-full px-3 py-2 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-colors"
                      placeholder="Leave empty to use title"
                      data-testid="policy-label-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Optional: Custom label for sidebar navigation</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editedPolicy.category}
                      onChange={(e) => setEditedPolicy({ ...editedPolicy, category: e.target.value })}
                      className="block w-full px-3 py-2 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-colors"
                      data-testid="policy-category-select"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Group in sidebar by category</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Visibility
                    </label>
                    <div className="flex items-center gap-3 mt-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editedPolicy.is_public}
                          onChange={(e) => setEditedPolicy({ ...editedPolicy, is_public: e.target.checked })}
                          className="w-4 h-4 text-primary border-border bg-card rounded focus:ring-primary"
                          data-testid="policy-public-checkbox"
                        />
                        <span className="ml-2 text-sm text-foreground">Show on landing site</span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {editedPolicy.is_public ? 'Publicly visible' : 'Hidden from public'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Introduction / Abstract <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editedPolicy.intro}
                    onChange={(e) => setEditedPolicy({ ...editedPolicy, intro: e.target.value })}
                    className="block w-full px-3 py-2 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm min-h-[100px] transition-colors"
                    placeholder="Brief description of this policy..."
                    data-testid="policy-intro-textarea"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This text appears at the top of the policy page.</p>
                </div>
              </div>
            </div>

            {/* 2. Navigation Structure Card */}
            <div className="bg-card rounded border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Filter className="text-primary" size={20} />
                  Navigation Structure
                </h3>
                <button
                  onClick={addSidebarItem}
                  className="text-sm font-bold text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Sidebar Item
                </button>
              </div>
              <div className="p-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 mb-4 text-sm text-foreground/80 flex gap-2 items-start">
                  <Info size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  These items generate the table of contents sidebar. They link to sections by ID.
                </div>

                {editedPolicy.sidebar_items.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 border border-dashed border-border rounded">
                    <p className="text-sm text-muted-foreground">No navigation items yet.</p>
                    <button onClick={addSidebarItem} className="mt-2 text-sm text-primary font-medium">Add first item</button>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-border rounded-sm">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Section ID</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Icon (Optional)</th>
                          <th className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {editedPolicy.sidebar_items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => updateSidebarItem(index, 'title', e.target.value)}
                                className="block w-full px-2 py-1 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                placeholder="Link Label"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.id}
                                onChange={(e) => updateSidebarItem(index, 'id', e.target.value)}
                                className="block w-full px-2 py-1 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                placeholder="#section-id"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.icon || ''}
                                onChange={(e) => updateSidebarItem(index, 'icon', e.target.value)}
                                className="block w-full px-2 py-1 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                placeholder="icon-name"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                onClick={() => removeSidebarItem(index)}
                                className="text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Content Sections Card */}
            <div className="bg-card rounded border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FileText className="text-primary" size={20} />
                  Policy Sections
                </h3>
                <button
                  onClick={addSection}
                  className="bg-card border border-border hover:bg-muted text-foreground px-3 py-1.5 rounded-sm text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> Add Content Section
                </button>
              </div>
              <div className="p-6 bg-muted/20">
                {editedPolicy.sections.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No content sections</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Start adding sections to build your policy.</p>
                    <button
                      onClick={addSection}
                      className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                      Add Section
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editedPolicy.sections.map((section, index) => {
                      const isExpanded = expandedSections[index];
                      const isDragging = draggedSectionIndex === index;
                      const isDragOver = dragOverIndex === index;

                      return (
                        <div
                          key={index}
                          className={`bg-white border rounded shadow-sm transition-all duration-200 ${isDragging ? 'opacity-50 border-aws-blue' : 'border-aws-border'
                            } ${isDragOver ? 'border-aws-orange border-2 shadow-lg' : ''
                            }`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          {/* Section Header */}
                          <div
                            className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-aws-border"
                          >
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                              <div
                                className="cursor-move hover:bg-gray-200 p-1 rounded"
                                title="Drag to reorder"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <GripVertical size={16} className="text-gray-400" />
                              </div>
                              <div
                                className={`transform transition-transform duration-300 ease-in-out cursor-pointer ${isExpanded ? 'rotate-180' : ''}`}
                                onClick={() => toggleSection(index)}
                              >
                                <ChevronDown size={16} className="text-gray-500" />
                              </div>
                              <div
                                className="flex flex-col flex-1 cursor-pointer"
                                onClick={() => toggleSection(index)}
                              >
                                <span className="text-sm font-bold text-aws-text truncate">
                                  {section.title || <span className="text-gray-400 italic">Untitled Section</span>}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {section.id || 'no-id'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => removeSection(index)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete Section"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Section Body */}
                          {isExpanded && (
                            <div className="p-4 space-y-4 border-t border-border transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                    Section Title
                                  </label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(index, 'title', e.target.value)}
                                    className="block w-full px-3 py-2 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                    placeholder="e.g. User Responsibilities"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                    Section ID (Anchor)
                                  </label>
                                  <input
                                    type="text"
                                    value={section.id}
                                    onChange={(e) => updateSection(index, 'id', e.target.value)}
                                    className="block w-full px-3 py-2 border border-border rounded-sm text-sm font-mono bg-muted/50 text-foreground focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                    placeholder="e.g. user-responsibilities"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                  Content
                                </label>
                                <textarea
                                  value={section.content}
                                  onChange={(e) => updateSection(index, 'content', e.target.value)}
                                  className="block w-full px-3 py-2 border border-border rounded-sm text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[150px] font-sans transition-colors"
                                  placeholder="Enter the main content for this section..."
                                />
                              </div>

                              {/* Table Management Section */}
                              <div className="border-t border-border pt-4 mt-6">
                                <div className="flex justify-between items-center mb-3">
                                  <label className="block text-xs font-bold text-muted-foreground uppercase">
                                    <TableIcon className="inline w-4 h-4 mr-1" />
                                    Data Table (Optional)
                                  </label>
                                  {(!section.table || section.table.length === 0) ? (
                                    <button
                                      onClick={() => addTableToSection(index)}
                                      className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                                    >
                                      <Plus size={14} /> Add Table
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (confirm('Remove entire table from this section?')) {
                                          removeTable(index);
                                        }
                                      }}
                                      className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                                    >
                                      <Trash2 size={14} /> Remove Table
                                    </button>
                                  )}
                                </div>

                                {section.table && section.table.length > 0 && (
                                  <div className="space-y-3">
                                    {/* Add Column Button */}
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="text"
                                        id={`new-column-${index}`}
                                        placeholder="Column name (e.g., 'name', 'description')"
                                        className="flex-1 px-2 py-1 border border-border bg-card text-foreground rounded text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const input = e.target as HTMLInputElement;
                                            if (input.value.trim()) {
                                              addTableColumn(index, input.value.trim());
                                              input.value = '';
                                            }
                                          }
                                        }}
                                      />
                                      <button
                                        onClick={() => {
                                          const input = document.getElementById(`new-column-${index}`) as HTMLInputElement;
                                          if (input && input.value.trim()) {
                                            addTableColumn(index, input.value.trim());
                                            input.value = '';
                                          }
                                        }}
                                        className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground text-xs rounded flex items-center gap-1 border border-border transition-colors"
                                      >
                                        <Plus size={12} /> Add Column
                                      </button>
                                    </div>

                                    {/* Table Editor */}
                                    <div className="overflow-x-auto border border-border rounded">
                                      <table className="min-w-full divide-y divide-border text-xs">
                                        <thead className="bg-muted/30">
                                          <tr>
                                            {Object.keys(section.table[0] || {}).map((columnKey) => (
                                              <th key={columnKey} className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider relative group">
                                                <div className="flex items-center justify-between">
                                                  <span>{columnKey}</span>
                                                  <button
                                                    onClick={() => {
                                                      if (confirm(`Remove column "${columnKey}"?`)) {
                                                        removeTableColumn(index, columnKey);
                                                      }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 ml-2 text-red-500 hover:text-red-600 transition-opacity"
                                                    title="Remove column"
                                                  >
                                                    <X size={12} />
                                                  </button>
                                                </div>
                                              </th>
                                            ))}
                                            <th className="px-3 py-2 w-16">
                                              <span className="sr-only">Actions</span>
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-card divide-y divide-border">
                                          {section.table.map((row: any, rowIdx: number) => (
                                            <tr key={rowIdx} className="hover:bg-muted/50 transition-colors">
                                              {Object.keys(row).map((columnKey) => (
                                                <td key={columnKey} className="px-3 py-2">
                                                  <input
                                                    type="text"
                                                    value={row[columnKey] || ''}
                                                    onChange={(e) => updateTableCell(index, rowIdx, columnKey, e.target.value)}
                                                    className="w-full px-2 py-1 border border-border bg-card text-foreground rounded text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                                    placeholder={`Enter ${columnKey}`}
                                                  />
                                                </td>
                                              ))}
                                              <td className="px-3 py-2">
                                                <button
                                                  onClick={() => removeTableRow(index, rowIdx)}
                                                  className="text-red-500 hover:text-red-600 transition-colors"
                                                  title="Delete row"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Add Row Button */}
                                    <button
                                      onClick={() => addTableRow(index)}
                                      className="w-full py-2 border-2 border-dashed border-border rounded text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Plus size={14} /> Add Row
                                    </button>
                                  </div>
                                )}

                                {(!section.table || section.table.length === 0) && (
                                  <div className="text-center py-6 bg-muted/20 border border-dashed border-border rounded">
                                    <TableIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
                                    <p className="text-xs text-muted-foreground mt-2">No table added yet</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Floating Save Bar (Mobile/Tablet friendly) */}
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg flex justify-between items-center z-50 lg:hidden transition-colors">
            <span className="text-sm font-medium text-muted-foreground">{isCreating ? 'Unsaved Policy' : 'Editing Policy'}</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                  setEditedPolicy(null);
                }}
                className="px-3 py-2 border border-border bg-card text-foreground hover:bg-muted rounded text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm font-medium shadow-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Policy List - AWS Console Style Table */
        <div className="bg-card shadow-sm rounded border border-border overflow-hidden">
          {/* Search and Filter Bar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30">
            <div className="relative w-full sm:w-96 flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-1.5 border border-border rounded-sm bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center space-x-2 text-foreground hover:text-primary px-3 py-1.5 border border-border rounded-sm text-sm font-medium bg-card transition-colors">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/30">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                    Policy
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                    Visibility
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                    Sections
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredPolicies.map((policy) => (
                  <tr
                    key={policy.doc_id}
                    className={`hover:bg-muted/50 transition-colors cursor-pointer ${selectedPolicy?.doc_id === policy.doc_id ? 'bg-muted/50 border-l-4 border-l-primary' : ''}`}
                    onClick={() => setSelectedPolicy(policy)}
                    data-testid={`policy-row-${policy.doc_id}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-primary hover:underline">
                            {policy.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{policy.doc_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <span className="px-2.5 py-0.5 text-[12px] font-medium bg-primary/10 text-primary rounded-full">
                        {policy.category || 'Legal Documents'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <span className={`px-2.5 py-0.5 text-[12px] font-medium rounded-full ${policy.is_public !== false
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-muted text-muted-foreground'
                        }`}>
                        {policy.is_public !== false ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {policy.last_updated}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 text-[12px] font-medium bg-muted text-foreground rounded-full">
                        {policy.sections.length} sections
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        {isOwner && (
                          <>
                            <button
                              onClick={() => handleEdit(policy)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                              title="Edit"
                              data-testid={`edit-policy-${policy.doc_id}`}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(policy.doc_id)}
                              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete"
                              data-testid={`delete-policy-${policy.doc_id}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPolicies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-2 text-sm font-medium text-foreground">No policies found</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new policy.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredPolicies.length > 0 && (
            <div className="bg-card px-4 py-3 border-t border-border sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{filteredPolicies.length}</span> of <span className="font-medium">{policies.length}</span> policies
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AWS Style Side Drawer */}
      {/* Overlay Backdrop - Mild shadow effect */}
      <div
        className={`fixed transition-opacity duration-300 ease-in-out ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998
        }}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div
        className={`fixed max-w-[90vw] sm:max-w-[600px] w-full bg-card shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          height: '100vh',
          zIndex: 9999
        }}
      >
        {selectedPolicy && (
          <>
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-card flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedPolicy.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="bg-muted/50 px-2 py-0.5 rounded border border-border font-mono">
                    {selectedPolicy.doc_id}
                  </span>
                  <span>•</span>
                  <span>Updated {selectedPolicy.last_updated}</span>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 text-foreground">
              {/* Introduction Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                  <Shield size={16} className="text-primary" />
                  Overview
                </h3>
                <div className="bg-primary/10 border-l-4 border-primary p-4 text-sm text-foreground leading-relaxed">
                  {selectedPolicy.intro}
                </div>
              </div>

              {/* Sections Map */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2 border-b border-border pb-2">
                  <FileText size={16} className="text-muted-foreground" />
                  Policy Sections ({selectedPolicy.sections.length})
                </h3>

                <div className="space-y-4">
                  {selectedPolicy.sections.map((section, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-sm shadow-sm overflow-hidden group">
                      <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                        <span className="font-medium text-foreground text-sm">{section.title}</span>
                        <span className="text-xs text-muted-foreground font-mono">{section.id}</span>
                      </div>
                      <div className="p-4 text-sm text-muted-foreground leading-relaxed">
                        {section.content}

                        {/* Subsections */}
                        {section.subsections && section.subsections.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-border">
                            {section.subsections.map((sub, subIdx) => (
                              <div key={subIdx}>
                                <h5 className="font-medium text-foreground text-sm mb-1">{sub.title}</h5>
                                <p className="text-muted-foreground text-sm">{sub.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tables */}
                        {section.table && section.table.length > 0 && (
                          <div className="mt-4 overflow-x-auto">
                            <div className="flex items-center gap-2 mb-2">
                              <TableIcon size={14} className="text-primary" />
                              <span className="text-xs font-bold text-muted-foreground uppercase">Data Table</span>
                            </div>
                            <div className="border border-border rounded overflow-hidden">
                              <table className="min-w-full divide-y divide-border text-xs">
                                <thead className="bg-muted/30">
                                  <tr>
                                    {Object.keys(section.table[0] || {}).map((key) => (
                                      <th key={key} className="px-3 py-2 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        {key}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                  {section.table.map((row: any, rowIdx: number) => (
                                    <tr key={rowIdx} className="hover:bg-muted/50">
                                      {Object.values(row).map((val: any, colIdx: number) => (
                                        <td key={colIdx} className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                                          {val}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Items Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2 border-b border-border pb-2">
                  <Filter size={16} className="text-muted-foreground" />
                  Navigation Structure
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPolicy.sidebar_items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-dashed border-border rounded bg-muted/30 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span className="font-medium">{item.title}</span>
                    </div>
                  ))}
                  {selectedPolicy.sidebar_items.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">No navigation items defined</span>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3 flex-shrink-0">
              {isOwner && (
                <button
                  onClick={() => {
                    handleEdit(selectedPolicy);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground hover:bg-muted text-sm font-medium rounded transition-colors shadow-sm"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
              )}
              <button
                onClick={closeDrawer}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>

      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        onCategoryUpdated={() => {
          fetchCategories();
          fetchPolicies();
        }}
      />
    </div>
  );
};
