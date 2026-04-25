import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';

// Import components
import AccountTab from '../components/settings/AccountTab';
import OrganizationsTab from '../components/settings/OrganizationsTab';
import ApiIntegrations from '../components/ApiIntegrations';
import LoginPrivacyTab from '../components/settings/LoginPrivacyTab';
import NotificationsTab from '../components/settings/NotificationsTab';
import ReferralsTab from '../components/settings/ReferralsTab';

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read tab from URL query parameter, default to 'account'
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'account');

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'login-privacy', label: 'Login & Privacy' },
    { id: 'api-integrations', label: 'API & Integrations' },
    { id: 'organizations', label: 'Organizations' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'referrals', label: 'Referrals' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountTab isActive={true} />;
      case 'login-privacy':
        return <LoginPrivacyTab />;
      case 'api-integrations':
        return (
          <div className="mt-0 pt-4 max-w-5xl mx-auto">
            <ApiIntegrations />
          </div>
        );
      case 'organizations':
        return <OrganizationsTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'referrals':
        return <ReferralsTab />;
      default:
        return <AccountTab isActive={true} />;
    }
  };

  return (
    <>
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      <div className="flex-1 min-h-screen bg-background" data-testid="settings-page">
        <div className="mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground" data-testid="settings-title">
              Settings
            </h1>
            <Button
              variant="outline"
              size="sm"
              data-testid="api-button"
              className="border-border text-muted-foreground hover:bg-muted"
            >
              API
            </Button>
          </div>

          {/* Tabs */}
          <div className="border-b border-border mb-4">
            <div className="flex gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-3 text-sm font-bold transition-all relative ${activeTab === tab.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="pb-10">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
