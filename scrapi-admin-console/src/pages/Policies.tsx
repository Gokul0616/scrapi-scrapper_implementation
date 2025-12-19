import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Save, X, Eye, AlertCircle, Search, Filter, ChevronRight, Copy, Check, Clock, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

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
          <div className="h-7 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded"></div>
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded"></div>
      </div>
      <div className="bg-white shadow-sm rounded border border-aws-border overflow-hidden">
        <div className="p-4 border-b border-aws-border bg-gray-50">
          <div className="flex gap-4">
            <div className="h-8 w-96 bg-gray-200 rounded"></div>
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-3 border-b border-aws-border">
          <div className="flex gap-8">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-4 w-28 bg-gray-200 rounded"></div>
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-6 py-4 border-b border-aws-border">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-5 w-40 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-64 bg-gray-100 rounded"></div>
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

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    fetchPolicies();
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

  const handleEdit = (policy: Policy) => {
    setEditedPolicy({ ...policy });
    setIsEditing(true);
    // If we are editing, we might want to close the view drawer or keep it open?
    // AWS usually opens a full page or a different modal for editing.
    // For now, let's keep the existing behavior: Edit mode replaces the list view or opens a form.
    // In the previous code, it replaced the list view. Let's stick to that but maybe close the drawer if open.
    setSelectedPolicy(null); 
  };

  const handleCreate = () => {
    setEditedPolicy({
      doc_id: '',
      title: '',
      last_updated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      intro: '',
      sidebar_items: [],
      sections: []
    });
    setIsCreating(true);
    setIsEditing(true);
    setSelectedPolicy(null);
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
    setEditedPolicy({
      ...editedPolicy,
      sections: [...editedPolicy.sections, { id: '', title: '', content: '', subsections: [], table: [] }]
    });
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
    <div className="space-y-6" data-testid="policies-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-aws-text">Policy Management</h1>
          <p className="text-sm text-aws-text-secondary mt-1">Manage legal documents and policies for your platform</p>
        </div>
        {isOwner && !isEditing && (
          <button
            onClick={handleCreate}
            className="bg-aws-orange hover:bg-orange-600 text-white px-4 py-2 rounded-sm text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
            data-testid="create-policy-btn"
          >
            <Plus size={16} />
            Create Policy
          </button>
        )}
      </div>

      {!isOwner && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm text-yellow-800">
            You have view-only access. Only owners can create, edit, or delete policies.
          </div>
        </div>
      )}

      {isEditing && editedPolicy ? (
        /* Edit/Create Form - AWS Style */
        <div className="bg-white shadow-sm rounded border border-aws-border">
          <div className="px-6 py-4 border-b border-aws-border bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-aws-text">
              {isCreating ? 'Create New Policy' : 'Edit Policy'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-aws-orange hover:bg-orange-600 text-white px-4 py-1.5 rounded-sm text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                data-testid="save-policy-btn"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                  setEditedPolicy(null);
                }}
                className="bg-white border border-gray-300 text-aws-text px-4 py-1.5 rounded-sm text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-aws-text mb-1.5">
                  Document ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedPolicy.doc_id}
                  onChange={(e) => setEditedPolicy({ ...editedPolicy, doc_id: e.target.value })}
                  disabled={!isCreating}
                  className="block w-full px-3 py-1.5 border border-gray-300 rounded-sm text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-aws-blue focus:border-aws-blue disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="e.g., cookie-policy"
                  data-testid="policy-doc-id-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-aws-text mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedPolicy.title}
                  onChange={(e) => setEditedPolicy({ ...editedPolicy, title: e.target.value })}
                  className="block w-full px-3 py-1.5 border border-gray-300 rounded-sm text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-aws-blue focus:border-aws-blue"
                  placeholder="e.g., Cookie Policy"
                  data-testid="policy-title-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-aws-text mb-1.5">
                Last Updated
              </label>
              <input
                type="text"
                value={editedPolicy.last_updated}
                onChange={(e) => setEditedPolicy({ ...editedPolicy, last_updated: e.target.value })}
                className="block w-full px-3 py-1.5 border border-gray-300 rounded-sm text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-aws-blue focus:border-aws-blue"
                placeholder="e.g., August 15, 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-aws-text mb-1.5">
                Introduction <span className="text-red-500">*</span>
              </label>
              <textarea
                value={editedPolicy.intro}
                onChange={(e) => setEditedPolicy({ ...editedPolicy, intro: e.target.value })}
                className="block w-full px-3 py-1.5 border border-gray-300 rounded-sm text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-aws-blue focus:border-aws-blue h-24 resize-none"
                placeholder="Introduction text..."
                data-testid="policy-intro-textarea"
              />
            </div>

            {/* Sidebar Items */}
            <div className="border border-aws-border rounded-sm">
              <div className="px-4 py-3 bg-gray-50 border-b border-aws-border flex justify-between items-center">
                <h3 className="text-sm font-medium text-aws-text">Left Sidebar Items</h3>
                <button
                  onClick={addSidebarItem}
                  className="text-sm text-aws-blue hover:text-blue-700 font-medium"
                >
                  + Add Item
                </button>
              </div>
              <div className="p-4 space-y-3">
                {editedPolicy.sidebar_items.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No sidebar items added yet.</p>
                ) : (
                  editedPolicy.sidebar_items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded border border-gray-200">
                      <input
                        type="text"
                        value={item.id}
                        onChange={(e) => updateSidebarItem(index, 'id', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-sm text-sm"
                        placeholder="ID"
                      />
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateSidebarItem(index, 'title', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-sm text-sm"
                        placeholder="Title"
                      />
                      <input
                        type="text"
                        value={item.icon || ''}
                        onChange={(e) => updateSidebarItem(index, 'icon', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-sm text-sm"
                        placeholder="Icon"
                      />
                      <button
                        onClick={() => removeSidebarItem(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sections */}
            <div className="border border-aws-border rounded-sm">
              <div className="px-4 py-3 bg-gray-50 border-b border-aws-border flex justify-between items-center">
                <h3 className="text-sm font-medium text-aws-text">Main Content Sections</h3>
                <button
                  onClick={addSection}
                  className="text-sm text-aws-blue hover:text-blue-700 font-medium"
                >
                  + Add Section
                </button>
              </div>
              <div className="p-4 space-y-4">
                {editedPolicy.sections.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No sections added yet.</p>
                ) : (
                  editedPolicy.sections.map((section, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-medium text-aws-text-secondary uppercase">Section {index + 1}</span>
                        <button
                          onClick={() => removeSection(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={section.id}
                          onChange={(e) => updateSection(index, 'id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm"
                          placeholder="Section ID"
                        />
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(index, 'title', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm"
                          placeholder="Section Title"
                        />
                        <textarea
                          value={section.content}
                          onChange={(e) => updateSection(index, 'content', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm h-20 resize-none"
                          placeholder="Section Content"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Policy List - AWS Console Style Table */
        <div className="bg-white shadow-sm rounded border border-aws-border overflow-hidden">
          {/* Search and Filter Bar */}
          <div className="p-4 border-b border-aws-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
            <div className="relative w-full sm:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-aws-blue focus:border-aws-blue sm:text-sm transition-shadow"
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center space-x-2 text-aws-text hover:text-aws-blue px-3 py-1.5 border border-gray-300 rounded-sm text-sm font-medium bg-white transition-colors">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-aws-border">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                    Policy
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                    Sections
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-aws-text-secondary uppercase tracking-wider">
                    Nav Items
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-aws-border">
                {filteredPolicies.map((policy) => (
                  <tr 
                    key={policy.doc_id} 
                    className={`hover:bg-blue-50 transition-colors cursor-pointer ${selectedPolicy?.doc_id === policy.doc_id ? 'bg-blue-50 border-l-4 border-l-aws-blue' : ''}`}
                    onClick={() => setSelectedPolicy(policy)}
                    data-testid={`policy-row-${policy.doc_id}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-aws-blue/10 rounded flex items-center justify-center">
                          <FileText className="h-5 w-5 text-aws-blue" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-aws-blue hover:underline">
                            {policy.title}
                          </div>
                          <div className="text-xs text-aws-text-secondary mt-0.5">{policy.doc_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-aws-text-secondary">
                      {policy.last_updated}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {policy.sections.length} sections
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {policy.sidebar_items.length} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        {isOwner && (
                          <>
                            <button
                              onClick={() => handleEdit(policy)}
                              className="p-1.5 text-gray-400 hover:text-aws-orange hover:bg-orange-50 rounded transition-colors"
                              title="Edit"
                              data-testid={`edit-policy-${policy.doc_id}`}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(policy.doc_id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                              data-testid={`delete-policy-${policy.doc_id}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-300" />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPolicies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-300" />
                      <h3 className="mt-2 text-sm font-medium text-aws-text">No policies found</h3>
                      <p className="mt-1 text-sm text-aws-text-secondary">
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
            <div className="bg-white px-4 py-3 border-t border-aws-border sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-aws-text-secondary">
                  Showing <span className="font-medium">{filteredPolicies.length}</span> of <span className="font-medium">{policies.length}</span> policies
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AWS Style Side Drawer */}
      {/* Overlay Backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 max-w-[90vw] sm:max-w-[600px] w-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedPolicy && (
          <>
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-aws-border flex items-start justify-between bg-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-aws-text">{selectedPolicy.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-aws-text-secondary">
                  <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-mono">
                    {selectedPolicy.doc_id}
                  </span>
                  <span>•</span>
                  <span>Updated {selectedPolicy.last_updated}</span>
                </div>
              </div>
              <button 
                onClick={closeDrawer}
                className="text-gray-400 hover:text-aws-text p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Introduction Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-aws-text uppercase tracking-wide flex items-center gap-2">
                  <Shield size={16} className="text-aws-orange" />
                  Overview
                </h3>
                <div className="bg-blue-50 border-l-4 border-aws-blue p-4 text-sm text-aws-text leading-relaxed">
                  {selectedPolicy.intro}
                </div>
              </div>

              {/* Sections Map */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-aws-text uppercase tracking-wide flex items-center gap-2 border-b border-gray-200 pb-2">
                  <FileText size={16} className="text-aws-text-secondary" />
                  Policy Sections ({selectedPolicy.sections.length})
                </h3>
                
                <div className="space-y-4">
                  {selectedPolicy.sections.map((section, idx) => (
                    <div key={idx} className="bg-white border border-aws-border rounded-sm shadow-sm overflow-hidden group">
                      <div className="px-4 py-3 bg-gray-50 border-b border-aws-border flex items-center justify-between">
                        <span className="font-medium text-aws-text text-sm">{section.title}</span>
                        <span className="text-xs text-gray-400 font-mono">{section.id}</span>
                      </div>
                      <div className="p-4 text-sm text-aws-text-secondary leading-relaxed">
                        {section.content}
                        
                        {/* Subsections */}
                        {section.subsections && section.subsections.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-200">
                            {section.subsections.map((sub, subIdx) => (
                              <div key={subIdx}>
                                <h5 className="font-medium text-aws-text text-sm mb-1">{sub.title}</h5>
                                <p className="text-aws-text-secondary text-sm">{sub.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Items Preview */}
              <div className="space-y-3">
                 <h3 className="text-sm font-bold text-aws-text uppercase tracking-wide flex items-center gap-2 border-b border-gray-200 pb-2">
                  <Filter size={16} className="text-aws-text-secondary" />
                  Navigation Structure
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPolicy.sidebar_items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-dashed border-gray-300 rounded bg-gray-50 text-sm text-aws-text-secondary">
                      <div className="w-1.5 h-1.5 bg-aws-orange rounded-full"></div>
                      <span className="font-medium">{item.title}</span>
                    </div>
                  ))}
                  {selectedPolicy.sidebar_items.length === 0 && (
                     <span className="text-sm text-gray-400 italic">No navigation items defined</span>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-aws-border bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
               {isOwner && (
                  <button
                    onClick={() => {
                       handleEdit(selectedPolicy);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-aws-border text-aws-text text-sm font-medium rounded hover:bg-gray-100 transition-colors shadow-sm"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
               )}
               <button
                  onClick={closeDrawer}
                  className="px-4 py-2 bg-aws-blue hover:bg-blue-700 text-white text-sm font-medium rounded shadow-sm transition-colors"
               >
                  Done
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
