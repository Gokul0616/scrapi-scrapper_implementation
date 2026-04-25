import React from 'react';
import { Button } from '../ui/button';
import { Building2, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useModal } from '../../contexts/ModalContext';

const OrganizationsTab = () => {
  const { workspaces, refreshWorkspaces } = useWorkspace();
  const { openModal } = useModal();

  return (
    <div className="mt-4 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Your Organizations</h3>
          <p className="text-sm text-muted-foreground">
            Manage organizations you are a member of.
          </p>
        </div>
        <Button
          onClick={() => openModal('create-organization', { onSuccess: refreshWorkspaces })}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Organization
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {workspaces.filter((w) => w.workspace_type === 'organization').length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>You haven't joined any organizations yet.</p>
          </div>
        ) : (
          workspaces
            .filter((w) => w.workspace_type === 'organization')
            .map((org) => (
              <div key={org.workspace_id} className="p-4 flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{org.workspace_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      Role: {org.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Placeholder for future manage specific org functionality */}
                  <Button variant="ghost" size="sm" className="hidden">
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Convert Personal Account Section */}
      <div className="pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Convert Personal Account</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Convert your personal account into an organization to enable team collaboration features.
              You will become the owner of the new organization, and all your existing resources will be moved.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => openModal('convert-to-organization', { onSuccess: refreshWorkspaces })}
            className="border-primary/50 text-primary hover:bg-primary/5"
          >
            Convert to Organization
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationsTab;
