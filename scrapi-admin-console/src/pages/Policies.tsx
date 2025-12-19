import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Save, X, Eye, AlertCircle } from 'lucide-react';
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

export const PoliciesPage: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedPolicy, setEditedPolicy] = useState<Policy | null>(null);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
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
  };

  const handleSave = async () => {
    if (!editedPolicy) return;

    try {
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/policies/${docId}`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading policies...</div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="policies-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Policy Management</h1>
          <p className="text-gray-400">Manage legal documents and policies</p>
        </div>
        {isOwner && !isEditing && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            data-testid="create-policy-btn"
          >
            <Plus size={20} />
            Create Policy
          </button>
        )}
      </div>

      {!isOwner && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-md flex items-start gap-3">
          <AlertCircle className="text-yellow-500 mt-0.5" size={20} />
          <div className="text-sm text-yellow-200">
            You have view-only access. Only owners can edit or delete policies.
          </div>
        </div>
      )}

      {isEditing && editedPolicy ? (
        <div className="bg-aws-card rounded-lg border border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              {isCreating ? 'Create New Policy' : 'Edit Policy'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                data-testid="save-policy-btn"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                  setEditedPolicy(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Document ID *
                </label>
                <input
                  type="text"
                  value={editedPolicy.doc_id}
                  onChange={(e) => setEditedPolicy({ ...editedPolicy, doc_id: e.target.value })}
                  disabled={!isCreating}
                  className="w-full px-3 py-2 bg-aws-light border border-gray-600 rounded-md text-white disabled:opacity-50"
                  placeholder="e.g., cookie-policy"
                  data-testid="policy-doc-id-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={editedPolicy.title}
                  onChange={(e) => setEditedPolicy({ ...editedPolicy, title: e.target.value })}
                  className="w-full px-3 py-2 bg-aws-light border border-gray-600 rounded-md text-white"
                  placeholder="e.g., Cookie Policy"
                  data-testid="policy-title-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Updated
              </label>
              <input
                type="text"
                value={editedPolicy.last_updated}
                onChange={(e) => setEditedPolicy({ ...editedPolicy, last_updated: e.target.value })}
                className="w-full px-3 py-2 bg-aws-light border border-gray-600 rounded-md text-white"
                placeholder="e.g., August 15, 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Introduction *
              </label>
              <textarea
                value={editedPolicy.intro}
                onChange={(e) => setEditedPolicy({ ...editedPolicy, intro: e.target.value })}
                className="w-full px-3 py-2 bg-aws-light border border-gray-600 rounded-md text-white h-24"
                placeholder="Introduction text..."
                data-testid="policy-intro-textarea"
              />
            </div>

            {/* Sidebar Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Left Sidebar Items
                </label>
                <button
                  onClick={addSidebarItem}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-2">
                {editedPolicy.sidebar_items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-aws-light rounded border border-gray-600">
                    <input
                      type="text"
                      value={item.id}
                      onChange={(e) => updateSidebarItem(index, 'id', e.target.value)}
                      className="flex-1 px-2 py-1 bg-aws-dark border border-gray-600 rounded text-white text-sm"
                      placeholder="ID"
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateSidebarItem(index, 'title', e.target.value)}
                      className="flex-1 px-2 py-1 bg-aws-dark border border-gray-600 rounded text-white text-sm"
                      placeholder="Title"
                    />
                    <input
                      type="text"
                      value={item.icon || ''}
                      onChange={(e) => updateSidebarItem(index, 'icon', e.target.value)}
                      className="w-20 px-2 py-1 bg-aws-dark border border-gray-600 rounded text-white text-sm"
                      placeholder="Icon"
                    />
                    <button
                      onClick={() => removeSidebarItem(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sections */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Main Content Sections
                </label>
                <button
                  onClick={addSection}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Section
                </button>
              </div>
              <div className="space-y-4">
                {editedPolicy.sections.map((section, index) => (
                  <div key={index} className="p-4 bg-aws-light rounded border border-gray-600">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm text-gray-400">Section {index + 1}</span>
                      <button
                        onClick={() => removeSection(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={section.id}
                        onChange={(e) => updateSection(index, 'id', e.target.value)}
                        className="w-full px-2 py-1 bg-aws-dark border border-gray-600 rounded text-white text-sm"
                        placeholder="Section ID"
                      />
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(index, 'title', e.target.value)}
                        className="w-full px-2 py-1 bg-aws-dark border border-gray-600 rounded text-white text-sm"
                        placeholder="Section Title (will appear in right sidebar)"
                      />
                      <textarea
                        value={section.content}
                        onChange={(e) => updateSection(index, 'content', e.target.value)}
                        className="w-full px-2 py-1 bg-aws-dark border border-gray-600 rounded text-white text-sm h-20"
                        placeholder="Section Content"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {policies.map((policy) => (
            <div
              key={policy.doc_id}
              className="bg-aws-card rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors"
              data-testid={`policy-card-${policy.doc_id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="text-blue-400 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{policy.title}</h3>
                    <p className="text-sm text-gray-400">Last updated: {policy.last_updated}</p>
                  </div>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4 line-clamp-2">{policy.intro}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  {policy.sections.length} sections • {policy.sidebar_items.length} nav items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPolicy(policy)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="View"
                    data-testid={`view-policy-${policy.doc_id}`}
                  >
                    <Eye size={18} />
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => handleEdit(policy)}
                        className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                        title="Edit"
                        data-testid={`edit-policy-${policy.doc_id}`}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(policy.doc_id)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                        data-testid={`delete-policy-${policy.doc_id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-aws-card rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{selectedPolicy.title}</h2>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-400 mb-4">Last updated: {selectedPolicy.last_updated}</p>
              <p className="text-gray-300 mb-6">{selectedPolicy.intro}</p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Left Sidebar Navigation</h3>
                  <div className="space-y-2">
                    {selectedPolicy.sidebar_items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                        <span>{item.icon || '•'}</span>
                        <span>{item.title}</span>
                        <span className="text-gray-500">({item.id})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Main Content Sections</h3>
                  <div className="space-y-4">
                    {selectedPolicy.sections.map((section, idx) => (
                      <div key={idx} className="p-4 bg-aws-light rounded border border-gray-600">
                        <h4 className="font-semibold text-white mb-2">{section.title}</h4>
                        <p className="text-gray-300 text-sm">{section.content}</p>
                        {section.subsections && section.subsections.length > 0 && (
                          <div className="mt-3 ml-4 space-y-2">
                            {section.subsections.map((sub, subIdx) => (
                              <div key={subIdx}>
                                <div className="font-medium text-gray-200 text-sm">{sub.title}</div>
                                <div className="text-gray-400 text-sm">{sub.content}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
