import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { 
  getOrganization, 
  getMembers, 
  inviteMember, 
  updateMemberRole, 
  removeMember,
  transferOwnership,
  updateOrganization,
  deleteOrganization,
  leaveOrganization
} from '../services/organizationService';
import { 
  Building2, 
  Users, 
  Crown, 
  Shield, 
  User as UserIcon, 
  Mail,
  Plus,
  MoreVertical,
  Trash2,
  LogOut,
  ArrowLeft,
  UserPlus,
  RefreshCw,
  Settings as SettingsIcon,
  Save,
  X
} from 'lucide-react';
import AlertModal from '../components/AlertModal';

const OrganizationDetail = () => {
  const { theme } = useTheme();
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { refreshWorkspaces } = useWorkspace();
  
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [selectedMember, setSelectedMember] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    display_name: '',
    description: '',
    billing_email: ''
  });

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [orgData, membersData] = await Promise.all([
        getOrganization(orgId),
        getMembers(orgId)
      ]);
      setOrganization(orgData);
      setMembers(membersData);
      setEditData({
        display_name: orgData.display_name,
        description: orgData.description || '',
        billing_email: orgData.billing_email || ''
      });
    } catch (err) {
      console.error('Failed to fetch organization:', err);
      setError(err.response?.data?.detail || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    
    try {
      setActionLoading(true);
      await inviteMember(orgId, { email: inviteEmail, role: inviteRole });
      await fetchData();
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (err) {
      setInviteError(err.response?.data?.detail || 'Failed to invite member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      setActionLoading(true);
      await updateMemberRole(orgId, memberId, { role: newRole });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    
    try {
      setActionLoading(true);
      await removeMember(orgId, selectedMember.id);
      await fetchData();
      setShowRemoveModal(false);
      setSelectedMember(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedMember) return;
    
    try {
      setActionLoading(true);
      await transferOwnership(orgId, selectedMember.user_id);
      await fetchData();
      await refreshWorkspaces();
      setShowTransferModal(false);
      setSelectedMember(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to transfer ownership');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOrganization = async (e) => {
    e.preventDefault();
    
    try {
      setActionLoading(true);
      await updateOrganization(orgId, editData);
      await fetchData();
      setIsEditing(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrganization = async () => {
    try {
      setActionLoading(true);
      await deleteOrganization(orgId);
      await refreshWorkspaces();
      navigate('/organizations');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete organization');
      setActionLoading(false);
    }
  };

  const handleLeaveOrganization = async () => {
    try {
      setActionLoading(true);
      await leaveOrganization(orgId);
      await refreshWorkspaces();
      navigate('/organizations');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to leave organization');
      setActionLoading(false);
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

  const canManageMembers = organization?.user_role === 'owner' || organization?.user_role === 'admin';
  const isOwner = organization?.user_role === 'owner';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className={`w-12 h-12 mx-auto mb-4 animate-pulse ${
            theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Loading organization...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-8 ${
        theme === 'dark' ? 'bg-[#0F1014]' : 'bg-gray-50'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className={`p-6 rounded-lg border text-center ${
            theme === 'dark' 
              ? 'bg-red-900/20 border-red-800 text-red-400' 
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => navigate('/organizations')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Back to Organizations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 ${
      theme === 'dark' ? 'bg-[#0F1014]' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/organizations')}
            className={`inline-flex items-center space-x-2 mb-4 text-sm ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Organizations</span>
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'
              }`}>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h1 className={`text-3xl font-bold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {organization?.display_name}
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  @{organization?.name}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border ${
                    organization?.user_role === 'owner' 
                      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      : organization?.user_role === 'admin'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                  }`}>
                    {getRoleIcon(organization?.user_role)}
                    <span>{organization?.user_role?.charAt(0).toUpperCase() + organization?.user_role?.slice(1)}</span>
                  </span>
                  <span className={`px-2 py-1 rounded-md text-xs ${
                    theme === 'dark' 
                      ? 'bg-gray-800 text-gray-400' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {organization?.plan} Plan
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isOwner && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                  data-testid="delete-organization-button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {!isOwner && (
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  data-testid="leave-organization-button"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`border-b mb-6 ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-4 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'members'
                  ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Members
              {activeTab === 'members' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-4 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'settings'
                  ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
              {activeTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          </div>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Team Members ({members.length})
              </h2>
              {canManageMembers && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  data-testid="invite-member-button"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            <div className={`rounded-lg border overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Member
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Email
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Role
                      </th>
                      {canManageMembers && (
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                  }`}>
                    {members.map((member) => (
                      <tr key={member.id} data-testid={`member-row-${member.user_id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                            }`}>
                              <UserIcon className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`} />
                            </div>
                            <span className={`font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {member.username}
                            </span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {member.role === 'owner' || !canManageMembers ? (
                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-medium ${
                              member.role === 'owner'
                                ? 'bg-yellow-500/10 text-yellow-500'
                                : member.role === 'admin'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-gray-500/10 text-gray-500'
                            }`}>
                              {getRoleIcon(member.role)}
                              <span>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
                            </span>
                          ) : (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              disabled={actionLoading}
                              className={`px-3 py-1 rounded-md text-xs font-medium border ${
                                theme === 'dark'
                                  ? 'bg-gray-800 border-gray-700 text-white'
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              data-testid={`role-select-${member.user_id}`}
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        {canManageMembers && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {member.role !== 'owner' && (
                              <div className="flex items-center justify-end space-x-2">
                                {isOwner && (
                                  <button
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setShowTransferModal(true);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                      theme === 'dark'
                                        ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                    }`}
                                    data-testid={`transfer-ownership-${member.user_id}`}
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowRemoveModal(true);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
                                  data-testid={`remove-member-${member.user_id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <h2 className={`text-xl font-semibold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Organization Settings
            </h2>

            {!isEditing ? (
              <div className={`rounded-lg border p-6 ${
                theme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Display Name
                    </label>
                    <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      {organization?.display_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Organization Name
                    </label>
                    <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      @{organization?.name}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Description
                    </label>
                    <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      {organization?.description || 'No description'}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Billing Email
                    </label>
                    <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      {organization?.billing_email || 'Not set'}
                    </p>
                  </div>
                </div>

                {canManageMembers && (
                  <div className="mt-6 pt-6 border-t ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      <span>Edit Settings</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleUpdateOrganization} className={`rounded-lg border p-6 ${
                theme === 'dark' 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editData.display_name}
                      onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Description
                    </label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Billing Email
                    </label>
                    <input
                      type="email"
                      value={editData.billing_email}
                      onChange={(e) => setEditData({ ...editData, billing_email: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 mt-6">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{actionLoading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        display_name: organization?.display_name,
                        description: organization?.description || '',
                        billing_email: organization?.billing_email || ''
                      });
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={() => {
              setShowInviteModal(false);
              setInviteError('');
            }}
          />
          <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[9999] rounded-lg border shadow-lg ${
            theme === 'dark' 
              ? 'bg-[#1a1a1a] border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Invite Member
              </h2>
            </div>
            
            <form onSubmit={handleInvite} className="px-6 py-4">
              {inviteError && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  theme === 'dark' 
                    ? 'bg-red-900/20 border border-red-800 text-red-400' 
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  {inviteError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="member@example.com"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-gray-900 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                  }}
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
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Remove Member Modal */}
      {showRemoveModal && selectedMember && (
        <AlertModal
          isOpen={showRemoveModal}
          onClose={() => {
            setShowRemoveModal(false);
            setSelectedMember(null);
          }}
          onConfirm={handleRemoveMember}
          title="Remove Member"
          message={`Are you sure you want to remove ${selectedMember.username} from this organization?`}
          confirmText="Remove"
          confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
          loading={actionLoading}
        />
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && selectedMember && (
        <AlertModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedMember(null);
          }}
          onConfirm={handleTransferOwnership}
          title="Transfer Ownership"
          message={`Are you sure you want to transfer ownership to ${selectedMember.username}? You will become an admin and will no longer have owner privileges.`}
          confirmText="Transfer Ownership"
          confirmButtonClass="bg-purple-500 hover:bg-purple-600 text-white"
          loading={actionLoading}
        />
      )}

      {/* Delete Organization Modal */}
      {showDeleteModal && (
        <AlertModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteOrganization}
          title="Delete Organization"
          message={`Are you sure you want to delete "${organization?.display_name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
          loading={actionLoading}
        />
      )}

      {/* Leave Organization Modal */}
      {showLeaveModal && (
        <AlertModal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          onConfirm={handleLeaveOrganization}
          title="Leave Organization"
          message={`Are you sure you want to leave "${organization?.display_name}"? You will lose access to all resources.`}
          confirmText="Leave"
          confirmButtonClass="bg-orange-500 hover:bg-orange-600 text-white"
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default OrganizationDetail;
