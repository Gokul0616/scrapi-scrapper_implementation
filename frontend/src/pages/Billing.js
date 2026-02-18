import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ExternalLink, ChevronRight } from 'lucide-react';

const Billing = () => {
  const { theme } = useTheme();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState('current');

  // Determine if we're in organization mode
  const isOrganization = currentWorkspace?.workspace_type === 'organization';
  const pageTitle = isOrganization ? 'Organization billing' : 'Billing';

  // Mock data - in production this would come from API
  const billingData = {
    totalUsage: 0.00,
    billingPeriod: {
      start: 'Feb 10, 2026',
      end: 'Mar 9, 2026',
      type: 'Monthly'
    },
    planConsumption: {
      freeUsed: 0.00,
      freeTotal: 5.00,
      freeRemaining: 5.00
    },
    services: [
      { name: 'Actors', color: 'bg-emerald-500', amount: 0.00, icon: '●' },
      { name: 'Data transfer', color: 'bg-purple-500', amount: 0.00, icon: '●' },
      { name: 'Proxy', color: 'bg-orange-500', amount: 0.00, icon: '●' },
      { name: 'Storage', color: 'bg-blue-500', amount: 0.00, icon: '●' }
    ]
  };

  const tabs = [
    { id: 'current', label: 'Current period' },
    { id: 'historical', label: 'Historical usage' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'limits', label: 'Limits' }
  ];

  const renderCurrentPeriod = () => (
    <div className="space-y-6">
      {/* Platform Usage Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[22px] font-normal text-foreground">
            Platform usage in current billing period: <span className="font-semibold">${billingData.totalUsage.toFixed(2)}</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Billing period: {billingData.billingPeriod.start} - {billingData.billingPeriod.end} UTC
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground border border-border">
              {billingData.billingPeriod.type}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          This is your total platform usage to be billed in the current billing period, which reflects free Actor compute units or other discounts from your subscription plan.{' '}
          <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {/* Plan Consumption */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-4 text-foreground">Plan consumption</h3>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-8 bg-muted rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(billingData.planConsumption.freeUsed / billingData.planConsumption.freeTotal) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Usage Labels */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-foreground font-medium">
              Free usage ${billingData.planConsumption.freeUsed.toFixed(2)} / ${billingData.planConsumption.freeTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-muted border-2 border-border"></span>
            <span className="text-muted-foreground">
              Remaining free usage ${billingData.planConsumption.freeRemaining.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Platform Usage Breakdown */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-4 text-foreground">Platform usage breakdown by services</h3>
        
        {/* Visual Bar */}
        <div className="h-8 bg-blue-400 rounded-lg mb-6 overflow-hidden">
          {/* This would be dynamically split based on actual usage */}
        </div>

        {/* Service List */}
        <div className="space-y-0 border border-border rounded-lg overflow-hidden">
          {billingData.services.map((service, index) => (
            <div
              key={service.name}
              className={`flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors ${
                index !== billingData.services.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className={`w-2 h-2 rounded-full ${service.color}`}></span>
                <span className="text-sm font-medium text-foreground">{service.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                ${service.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHistoricalUsage = () => (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Historical usage data will be displayed here</p>
      <p className="text-sm text-muted-foreground mt-2">Track your past billing cycles and usage patterns</p>
    </div>
  );

  const renderSubscription = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Current Plan</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">Free Plan</p>
            <p className="text-sm text-muted-foreground mt-1">$0.00 / month</p>
            <p className="text-sm text-muted-foreground mt-1">$5.00 platform credits included</p>
          </div>
          <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Pricing information and plan comparison</p>
      <p className="text-sm text-muted-foreground mt-2">Compare different plans and features</p>
    </div>
  );

  const renderInvoices = () => (
    <div className="text-center py-16">
      <p className="text-muted-foreground">No invoices available</p>
      <p className="text-sm text-muted-foreground mt-2">Your billing invoices will appear here</p>
    </div>
  );

  const renderLimits = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Usage Limits</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground">Platform credits per month</span>
            <span className="text-sm font-semibold text-foreground">$5.00</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground">Concurrent Actor runs</span>
            <span className="text-sm font-semibold text-foreground">1</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-foreground">Maximum RAM per Actor</span>
            <span className="text-sm font-semibold text-foreground">2 GB</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'current':
        return renderCurrentPeriod();
      case 'historical':
        return renderHistoricalUsage();
      case 'subscription':
        return renderSubscription();
      case 'pricing':
        return renderPricing();
      case 'invoices':
        return renderInvoices();
      case 'limits':
        return renderLimits();
      default:
        return renderCurrentPeriod();
    }
  };

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <div className="max-w-[1400px] mx-auto">
        {/* Header with Title and Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-normal text-foreground">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground bg-card">
              API
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Upgrade
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Billing;