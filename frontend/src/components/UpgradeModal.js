import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import GlobalModal from './GlobalModal';

const UpgradeModal = () => {
  const { theme } = useTheme();
  const { closeModal, isModalOpen } = useModal();
  const { workspaces, selectWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const isOpen = isModalOpen('upgrade');
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Filter workspaces to show personal and organizations where user is owner
  const eligibleWorkspaces = workspaces.filter(
    (w) => w.workspace_type === 'personal' || w.role === 'owner'
  );

  const personalAccount = eligibleWorkspaces.find(w => w.workspace_type === 'personal');
  const orgAccounts = eligibleWorkspaces.filter(w => w.workspace_type === 'organization');

  useEffect(() => {
    if (isOpen) {
      if (personalAccount) {
        setSelectedWorkspace(personalAccount);
      } else if (orgAccounts.length > 0) {
        setSelectedWorkspace(orgAccounts[0]);
      } else {
        setSelectedWorkspace(null);
      }
    }
  }, [isOpen, workspaces]); // Re-run when modal opens or workspaces change

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedWorkspace) {
      // Silently switch workspace in context (no page reload) so checkout sees it immediately
      selectWorkspace(selectedWorkspace);
      closeModal();
      navigate('/upgrade-checkout');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/);
    if (words.length > 1) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase(); // using max 2 chars
  };

  const renderWorkspaceOption = (workspace) => {
    const isSelected = selectedWorkspace?.workspace_id === workspace.workspace_id && selectedWorkspace?.workspace_type === workspace.workspace_type;
    return (
      <button
        key={`${workspace.workspace_type}-${workspace.workspace_id}`}
        onClick={() => setSelectedWorkspace(workspace)}
        className={`w-full flex items-center px-3.5 py-2.5 rounded-[10px] border text-left transition-all duration-200 ${isSelected
          ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : theme === 'dark'
            ? 'border-transparent bg-transparent hover:bg-white/5'
            : 'border-transparent bg-white hover:bg-gray-50'
          } focus:outline-none`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center font-medium flex-shrink-0">
            {getInitials(workspace.workspace_name)}
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              {workspace.workspace_name}
            </span>
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              {workspace.workspace_type === 'personal' ? 'Personal' : 'Organization'}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <GlobalModal
      modalId="upgrade"
      title={<span className="text-[17px] font-bold text-gray-900 dark:text-white">Select account</span>}
      size="sm"
      showCloseButton={true}
      className="!rounded-[14px] !max-w-[500px]"
    >
      <div className="p-4 pt-3">
        <p className={`text-[15px] font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
          Which account do you want to subscribe with?
        </p>

        <div className="space-y-2">
          {personalAccount && (
            <div>
              {renderWorkspaceOption(personalAccount)}
            </div>
          )}

          {orgAccounts.length > 0 && (
            <div className="pt-1">
              <h4 className={`text-[13px] font-semibold mb-1 pl-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Organizations
              </h4>
              <div className="space-y-2">
                {orgAccounts.map(renderWorkspaceOption)}
              </div>
            </div>
          )}

          {eligibleWorkspaces.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              No eligible accounts found to upgrade.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 mt-5">
          <button
            type="button"
            onClick={closeModal}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${theme === 'dark'
              ? 'border-gray-700 text-gray-300 hover:bg-white/10 bg-transparent'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'
              }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedWorkspace}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#0d66d0] text-white hover:bg-[#0b5cbe] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </GlobalModal>
  );
};

export default UpgradeModal;
