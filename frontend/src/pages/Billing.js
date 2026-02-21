import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ExternalLink, ChevronRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import HistoricalUsageView from '../components/HistoricalUsageView';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Billing = () => {
  const { theme } = useTheme();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState('current');

  // Determine if we're in organization mode
  const isOrganization = currentWorkspace?.workspace_type === 'organization';
  const isOwner = !isOrganization || currentWorkspace?.role === 'owner';
  const pageTitle = isOrganization ? 'Organization billing' : 'Billing';

  const [billingData, setBillingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/billing/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBillingData(response.data);
      } catch (err) {
        console.error('Error fetching billing data:', err);
        setError('Failed to load billing information');
      } finally {
        setIsLoading(false);
      }
    };
    if (currentWorkspace) {
      fetchBillingData();
    }
  }, [currentWorkspace]);

  const handleUpgrade = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/billing/checkout`, { plan_type: 'Starter' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Error redirecting to checkout:', err);
    }
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
    <div className="space-y-4">
      {/* Platform Usage Header */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-lg font-semibold text-foreground">
            Platform usage in current billing period: <span className="font-bold">${billingData.totalUsage.toFixed(2)}</span>
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
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold mb-3 text-foreground">Plan consumption</h3>

        {/* Progress Bar */}
        <div className="mb-2.5">
          <div className="h-6 bg-muted rounded-full overflow-hidden relative">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(billingData.planConsumption.freeUsed / billingData.planConsumption.freeTotal) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Usage Labels */}
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-foreground font-medium">
              Free usage ${billingData.planConsumption.freeUsed.toFixed(2)} / ${billingData.planConsumption.freeTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-muted border-2 border-border"></span>
            <span className="text-muted-foreground">
              Remaining free usage ${billingData.planConsumption.freeRemaining.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Platform Usage Breakdown */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold mb-3 text-foreground">Platform usage breakdown by services</h3>

        {/* Visual Bar */}
        <div className="h-6 bg-blue-400 rounded-lg mb-4 overflow-hidden">
          {/* This would be dynamically split based on actual usage */}
        </div>

        {/* Service List */}
        <div className="space-y-0 border border-border rounded-lg overflow-hidden">
          {billingData.services.map((service, index) => (
            <div
              key={service.name}
              className={`flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors ${index !== billingData.services.length - 1 ? 'border-b border-border' : ''
                }`}
            >
              <div className="flex items-center gap-2.5">
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
    <HistoricalUsageView currentWorkspace={currentWorkspace} />
  );

  const renderSubscription = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold mb-3 text-foreground">Current Plan</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-bold text-foreground">Free Plan</p>
            <p className="text-sm text-muted-foreground mt-0.5">$0.00 / month</p>
            <p className="text-sm text-muted-foreground mt-0.5">$5.00 platform credits included</p>
          </div>
          {isOwner && (
            <button onClick={handleUpgrade} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Upgrade Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Pricing information and plan comparison</p>
      <p className="text-sm text-muted-foreground mt-1">Compare different plans and features</p>
    </div>
  );

  const renderInvoices = () => (
    <div className="text-center py-12">
      <p className="text-muted-foreground">No invoices available</p>
      <p className="text-sm text-muted-foreground mt-1">Your billing invoices will appear here</p>
    </div>
  );

  const renderLimits = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold mb-3 text-foreground">Usage Limits</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Platform credits per month</span>
            <span className="text-sm font-semibold text-foreground">$5.00</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Concurrent Actor runs</span>
            <span className="text-sm font-semibold text-foreground">1</span>
          </div>
          <div className="flex items-center justify-between py-2">
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
    <div className="flex-1 min-h-screen bg-background">
      {isLoading ? (
        <div className="flex items-center justify-center h-full pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
          <div className="bg-red-500/10 text-red-500 rounded-lg p-6 max-w-md">
            <p className="font-medium text-lg mb-2">Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      ) : (
        <div className=" px-6 py-6">
          {/* Header with Title and Action Buttons */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground bg-card">
                API
              </button>
              {isOwner && (
                <button onClick={handleUpgrade} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Upgrade
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border mb-4">
            <div className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-2.5 text-sm font-medium transition-colors relative ${activeTab === tab.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {renderTabContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;