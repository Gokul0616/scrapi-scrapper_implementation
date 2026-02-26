import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useModal } from '../contexts/ModalContext';
import {
  ExternalLink, ChevronRight, Loader2, HelpCircle, FileText,
  Download, Eye, Tag, Search, Filter, ArrowUpDown,
  ChevronLeft, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import HistoricalUsageView from '../components/HistoricalUsageView';
import CustomTooltip from '../components/CustomTooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Billing = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentWorkspace } = useWorkspace();
  const { openModal } = useModal();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'current');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  // Sync active tab if URL changes externally (e.g. navigating from PaymentSuccess)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Determine if we're in organization mode
  const isOrganization = currentWorkspace?.workspace_type === 'organization';
  const isOwner = !isOrganization || currentWorkspace?.role === 'owner';
  const pageTitle = isOrganization ? 'Organization billing' : 'Billing';

  const [billingData, setBillingData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [goToPage, setGoToPage] = useState('');

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
      fetchInvoices();
    }
  }, [currentWorkspace]);

  const fetchInvoices = async () => {
    try {
      setIsLoadingInvoices(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/billing/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(inv =>
      inv.invoice_no.toLowerCase().includes(q) ||
      inv.plan.toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const handleGoToPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(goToPage);
    if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setGoToPage('');
    }
  };

  const handleUpgrade = () => {
    openModal('upgrade');
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

  const renderPricingRow = (label, value, tooltip) => (
    <div className="flex items-center py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <div className="w-1/2 flex items-center gap-1.5 pl-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {tooltip && (
          <CustomTooltip content={tooltip}>
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help transition-colors" />
          </CustomTooltip>
        )}
      </div>
      <div className="w-1/2">
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="space-y-4 pb-12">
      {/* Actors */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h3 className="text-base font-bold text-foreground">Actors</h3>
        </div>
        <div>
          {renderPricingRow('Compute units (CU)', '$0.30 / CU', 'Billed per second of Actor run based on memory allocated')}
        </div>
      </div>

      {/* Proxy */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h3 className="text-base font-bold text-foreground">Proxy</h3>
        </div>
        <div>
          {renderPricingRow('Residential proxies', '$8.00 / GB', 'Charged per GB of traffic')}
          {renderPricingRow('Datacenter proxies', '5 IPs included', 'Shared IPs included in free tier')}
          {renderPricingRow('SERPs proxy', '$2.50 / 1,000 SERPs', 'Billed per 1,000 search engine result pages')}
        </div>
      </div>

      {/* Storage */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h3 className="text-base font-bold text-foreground">Storage</h3>
        </div>

        {/* Dataset */}
        <div className="border-b border-border">
          <div className="px-4 py-3 bg-muted/10 font-medium text-foreground text-sm">
            Dataset
          </div>
          {renderPricingRow('Timed storage 1,000 GB-hours', '$1.00', 'Storage billed hourly')}
          {renderPricingRow('1,000 reads', '$0.0004')}
          {renderPricingRow('1,000 writes', '$0.005')}
        </div>

        {/* Key-value store */}
        <div className="border-b border-border">
          <div className="px-4 py-3 bg-muted/10 font-medium text-foreground text-sm">
            Key-value store
          </div>
          {renderPricingRow('Timed storage 1,000 GB-hours', '$1.00', 'Storage billed hourly')}
          {renderPricingRow('1,000 reads', '$0.005')}
          {renderPricingRow('1,000 writes', '$0.05')}
          {renderPricingRow('1,000 lists', '$0.05')}
        </div>

        {/* Request queue */}
        <div>
          <div className="px-4 py-3 bg-muted/10 font-medium text-foreground text-sm">
            Request queue
          </div>
          {renderPricingRow('Timed storage 1,000 GB-hours', '$4.00', 'Storage billed hourly')}
          {renderPricingRow('1,000 reads', '$0.0004')}
          {renderPricingRow('1,000 writes', '$0.02')}
        </div>
      </div>

      {/* Data transfer */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h3 className="text-base font-bold text-foreground">Data transfer</h3>
        </div>
        <div>
          {renderPricingRow('External / GB', '$0.20', 'Transfer outside of Scrapi network')}
          {renderPricingRow('Internal / GB', '$0.05', 'Transfer within Scrapi network')}
        </div>
      </div>
    </div>
  );

  const renderInvoices = () => {
    if (isLoadingInvoices) {
      return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-12 h-12 bg-muted rounded-full mb-4"></div>
          <div className="h-4 bg-muted rounded w-48"></div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Search and Filter Area */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter invoices"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <span className="text-sm font-medium text-foreground">
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Invoices Table */}
        <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/5 text-left h-[44px]">
                  <th className="px-4 py-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors group">
                    <div className="flex items-center gap-1">
                      Number
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors group">
                    <div className="flex items-center gap-1">
                      Amount
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors group">
                    <div className="flex items-center gap-1">
                      Issued on
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-muted-foreground cursor-default transition-colors group">
                    <div className="flex items-center gap-1">
                      Due on
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors group">
                    <div className="flex items-center gap-1">
                      Payment status
                      <Filter className="w-3.5 h-3.5 text-muted-foreground/60" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-muted-foreground cursor-default transition-colors group">
                    <div className="flex items-center gap-1">
                      Payment attempts
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors group">
                    <div className="flex items-center gap-1">
                      Invoice type
                      <Filter className="w-3.5 h-3.5 text-muted-foreground/60" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-muted-foreground text-right pr-6">
                    View
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-sm text-muted-foreground">
                      No results found
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => (
                    <tr
                      key={inv._id}
                      className="group hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/billing/invoices/${inv._id}`)}
                    >
                      <td className="px-4 py-4">
                        <span className="text-[13px] font-medium text-foreground">#{inv.invoice_no.split('-').pop()}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[13px] font-semibold text-foreground">${inv.amount.toFixed(2)} USD</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[13px] text-foreground">
                          {new Date(inv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[13px] text-foreground">
                          {new Date(inv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 w-fit border border-emerald-100 dark:border-emerald-900/30">
                          <span className="text-[11px] font-bold uppercase tracking-wider">Paid</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[13px] text-foreground">1</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[13px] text-foreground capitalize">{inv.plan} Subscription</span>
                      </td>
                      <td className="px-4 py-4 text-right pr-6">
                        <button
                          className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/billing/invoices/${inv._id}`);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="border-t border-border px-4 py-3 bg-muted/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-card border border-border rounded px-3 py-1 text-sm pr-8 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <span className="text-sm text-muted-foreground ml-2">
                {filteredInvoices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <form onSubmit={handleGoToPage} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Go to page:</span>
                <input
                  type="text"
                  value={goToPage}
                  onChange={(e) => setGoToPage(e.target.value)}
                  placeholder={currentPage}
                  className="w-12 h-8 border border-border rounded bg-card px-2 text-sm text-center outline-none focus:border-blue-500"
                />
                <button type="submit" className="px-3 py-1 border border-border rounded text-sm font-medium hover:bg-muted transition-colors">Go</button>
              </form>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-md text-sm font-bold shadow-sm">
                  {currentPage}
                </div>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="px-6 py-3">
          {/* Header with Title and Action Buttons */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground bg-card uppercase tracking-wider font-bold">
                API
              </button>
              {isOwner && (
                <button onClick={handleUpgrade} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                  Upgrade
                </button>
              )}
            </div>
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
      )}
    </div>
  );
};

export default Billing;