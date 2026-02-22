import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { getOrganizations, deleteOrganization, leaveOrganization } from '../services/organizationService';
import { Building2, Plus, Users, Crown, Shield, User as UserIcon, ExternalLink, Trash2, LogOut, Settings } from 'lucide-react';
import CreateOrganizationModal from '../components/CreateOrganizationModal';
import AlertModal from '../components/AlertModal';
import { showError } from '../components/ErrorDisplay';

const Organizations = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { refreshWorkspaces } = useWorkspace();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = async (newOrg) => {
    await fetchOrganizations();
    await refreshWorkspaces();
  };

  const handleDeleteClick = (org) => {
    setSelectedOrg(org);
    setShowDeleteModal(true);
  };

  const handleLeaveClick = (org) => {
    setSelectedOrg(org);
    setShowLeaveModal(true);
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;

    try {
      setActionLoading(selectedOrg.id);
      await deleteOrganization(selectedOrg.id);
      await fetchOrganizations();
      await refreshWorkspaces();
      setShowDeleteModal(false);
      setSelectedOrg(null);
    } catch (err) {
      console.error('Failed to delete organization:', err);
      showError(err.response?.data?.detail || 'Failed to delete organization', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async () => {
    if (!selectedOrg) return;

    try {
      setActionLoading(selectedOrg.id);
      await leaveOrganization(selectedOrg.id);
      await fetchOrganizations();
      await refreshWorkspaces();
      setShowLeaveModal(false);
      setSelectedOrg(null);
    } catch (err) {
      console.error('Failed to leave organization:', err);
      showError(err.response?.data?.detail || 'Failed to leave organization', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'member':
        return <UserIcon className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      owner: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      admin: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      member: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border ${colors[role] || colors.member
        }`}>
        {getRoleIcon(role)}
        <span>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className={`w-12 h-12 mx-auto mb-4 animate-pulse ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Loading organizations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-[#0F1014]' : 'bg-gray-50'
      }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                Organizations
              </h1>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Manage your organizations and workspaces
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              data-testid="create-organization-button"
            >
              <Plus className="w-5 h-5" />
              <span>Create Organization</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg border ${theme === 'dark'
              ? 'bg-red-900/20 border-red-800 text-red-400'
              : 'bg-red-50 border-red-200 text-red-600'
            }`}>
            {error}
          </div>
        )}

        {/* Organizations List */}
        {organizations.length === 0 ? (
          <div className={`text-center py-16 rounded-lg border-2 border-dashed ${theme === 'dark'
              ? 'bg-gray-900/50 border-gray-700'
              : 'bg-white border-gray-300'
            }`}>
            <Building2 className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`} />
            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              No organizations yet
            </h3>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
              Create your first organization to collaborate with your team
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create Organization</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <div
                key={org.id}
                className={`rounded-lg border p-6 transition-all hover:shadow-lg ${theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 hover:border-gray-600'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                data-testid={`organization-card-${org.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'
                      }`}>
                      <Building2 className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        {org.display_name}
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                        @{org.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {org.description && (
                  <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    {org.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <Users className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                      {org.member_count} {org.member_count === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  {getRoleBadge(org.user_role)}
                </div>

                {/* Plan */}
                <div className={`text-xs mb-4 px-2 py-1 rounded inline-block ${theme === 'dark'
                    ? 'bg-gray-800 text-gray-400'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                  {org.plan} Plan
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 mt-4 pt-4 border-t ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }">
                  <button
                    onClick={() => navigate(`/organizations/${org.id}`)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark'
                        ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    data-testid={`view-organization-${org.id}`}
                  >
                    View
                  </button>

                  {org.user_role === 'owner' ? (
                    <button
                      onClick={() => handleDeleteClick(org)}
                      disabled={actionLoading === org.id}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark'
                          ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      data-testid={`delete-organization-${org.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLeaveClick(org)}
                      disabled={actionLoading === org.id}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark'
                          ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      data-testid={`leave-organization-${org.id}`}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedOrg && (
        <AlertModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedOrg(null);
          }}
          onConfirm={handleDelete}
          title="Delete Organization"
          message={`Are you sure you want to delete "${selectedOrg.display_name}"? This action cannot be undone and will remove all members and data associated with this organization.`}
          confirmText="Delete"
          confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
          loading={actionLoading === selectedOrg.id}
        />
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveModal && selectedOrg && (
        <AlertModal
          isOpen={showLeaveModal}
          onClose={() => {
            setShowLeaveModal(false);
            setSelectedOrg(null);
          }}
          onConfirm={handleLeave}
          title="Leave Organization"
          message={`Are you sure you want to leave "${selectedOrg.display_name}"? You will lose access to all resources in this organization.`}
          confirmText="Leave"
          confirmButtonClass="bg-orange-500 hover:bg-orange-600 text-white"
          loading={actionLoading === selectedOrg.id}
        />
      )}
    </div>
  );
};

export default Organizations;