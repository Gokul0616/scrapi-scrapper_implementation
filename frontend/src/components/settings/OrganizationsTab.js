import React from 'react';
import { Building2, Plus } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useModal } from '../../contexts/ModalContext';
import ActionButton from '../ui/ActionButton';

const OrganizationsTab = () => {
  const { workspaces, refreshWorkspaces } = useWorkspace();
  const { openModal } = useModal();

  const orgs = workspaces.filter((w) => w.workspace_type === 'organization');

  return (
    <div className="mt-0 pt-4 max-w-5xl mx-auto">
      {/* Organizations List Section */}
      <div className="pb-6 border-b border-border">
        <div className="flex gap-8">
          {/* Left Column */}
          <div className="w-40 flex-shrink-0">
            <h2 className="text-base font-semibold mb-1.5 text-foreground">
              Organizations
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage organizations you are a member of.
            </p>
          </div>

          {/* Right Column */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">
                {orgs.length} organization{orgs.length !== 1 ? 's' : ''}
              </span>
              <ActionButton
                icon={Plus}
                variant='secondary'
                label="Create Organization"
                onClick={() => openModal('create-organization', { onSuccess: refreshWorkspaces })}
              />
            </div>

            <div className="rounded-lg border border-border divide-y divide-border bg-card overflow-hidden">
              {orgs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">You haven't joined any organizations yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Create or get invited to an organization to collaborate.</p>
                </div>
              ) : (
                orgs.map((org) => (
                  <div key={org.workspace_id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{org.workspace_name}</div>
                        <div className="text-xs text-muted-foreground capitalize mt-0.5">
                          Role: {org.role}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Convert Personal Account Section */}
      <div className="py-6">
        <div className="flex gap-8">
          {/* Left Column */}
          <div className="w-40 flex-shrink-0">
            <h2 className="text-base font-semibold mb-1.5 text-foreground">
              Convert account
            </h2>
            <p className="text-xs text-muted-foreground">
              Convert your personal account into an organization.
            </p>
          </div>

          {/* Right Column */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-accent/30">
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  Convert your personal account into an organization to enable team collaboration features.
                  You will become the owner of the new organization, and all your existing resources will be moved.
                </p>
              </div>
              <ActionButton
                label="Convert to Organization"
                onClick={() => openModal('convert-to-organization', { onSuccess: refreshWorkspaces })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationsTab;
