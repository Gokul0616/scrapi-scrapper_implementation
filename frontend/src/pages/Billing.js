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
import EditBillingModal from '../components/modals/EditBillingModal';
import AddPaymentModal from '../components/modals/AddPaymentModal';
import AddReferralModal from '../components/modals/AddReferralModal';
import AddPromoModal from '../components/modals/AddPromoModal';
import AlertModal from '../components/AlertModal';
import DataTable from '../components/ui/DataTable';
import LoadingScreen from '@/components/LoadingScreen';

const BILLING_TOOLTIPS = {
  // Service breakdown
  "Actor compute units": {
    what: "Resources consumed by your Actors (CPU & RAM).",
    how: "Calculated as RAM (GB) * Duration (Hours) * Compute price per CU."
  },
  "Pay per event": {
    what: "Fixed costs for specific Actor events.",
    how: "Some Actors charge a flat fee per start or for specific results generated."
  },
  "Datasets": {
    what: "Long-term scalable storage for structured tabular data.",
    how: "Calculated from the sum of Timed storage volume, plus Reads and Writes ($0.0050/$0.0004 per 1k ops)."
  },
  "Key-value stores": {
    what: "Storage for files, images, PDFs, or unstructured blobs.",
    how: "Calculated from Timed storage volume, plus Reads, Writes, and Lists ($0.0050/$0.0004 per 1k ops)."
  },
  "Request queues": {
    what: "Stateful queues managing URLs to scrape across distributed workers.",
    how: "Calculated from Timed storage footprint, plus enqueueing and dequeueing ($0.0050/$0.0004 per 1k ops)."
  },
  "Timed storage": {
    what: "Cost for retaining data footprint over time.",
    how: "Calculated continuously based on Data Size (GB) * Duration (Hours) * storage rate."
  },
  "Reads": {
    what: "Data retrieval and queue popping operations.",
    how: "Billed per 1,000 requests to read records or dequeue URLs."
  },
  "Writes": {
    what: "Data saving and queue pushing operations.",
    how: "Billed per 1,000 items written, stored, or enqueued."
  },
  "Lists": {
    what: "Retrieving keys and enumerating records in storage.",
    how: "Billed per 1,000 requests to list available storage records."
  },
  "Internal": {
    what: "Data transfer between platform services.",
    how: "Billed per GB transferred internally. Currently free on some plans."
  },
  "External": {
    what: "Data transfer to external destinations (egress).",
    how: "Billed per GB sent to external URLs or downloaded."
  },
  "SERP": {
    what: "Search Engine Results Page proxy usage.",
    how: "Billed per successful request made through SERP proxies."
  },
  "Residential": {
    what: "Residential IP rotation proxy usage.",
    how: "Billed per GB of data transferred through residential IPs."
  },
  // Limits / Subscription
  "Total Actor RAM": {
    what: "Peak memory allocation for running Actors.",
    how: "Sum of RAM configuration for all currently active runs in your workspace."
  },
  "Number of Actors": {
    what: "Limit on unique customized Actors.",
    how: "The total number of Actors you can create or save in this workspace."
  },
  "Number of schedules": {
    what: "Limit on automated tasks.",
    how: "The total number of active automated triggers you can maintain."
  },
  "Number of Actor tasks": {
    what: "Limit on saved configurations.",
    how: "The total number of parameterized Actor configurations you can save."
  },
  "Number of concurrent Actor runs": {
    what: "Parallel execution limit.",
    how: "The maximum number of scrapers that can run at the same time."
  },
  "Max Actor build memory": {
    what: "Memory allocation during builds.",
    how: "The RAM limit for the environment where your custom Actors are built."
  },
  "Max Actor build time": {
    what: "Duration limit for Actor builds.",
    how: "The maximum time allowed to compile and package your custom Actor code."
  },
  "Data retention": {
    what: "How long we keep your data.",
    how: "Datasets and logs are automatically deleted after this many days."
  },
  "Free platform usage": {
    what: "Monthly free credit allowance.",
    how: "Recharged every month on your billing anniversary."
  },
  "Residential proxies": {
    what: "Access to residential IP networks.",
    how: "Calculated based on GB of data transferred through residential IPs."
  },
  "Proxy SERPs": {
    what: "Access to search engine result proxies.",
    how: "Billed per successful request to Google, Bing, etc."
  },
  "Support level": {
    what: "Customer support coverage.",
    how: "Determined by your current subscription tier."
  },
  "Plan usage credit": {
    what: "Available platform credits.",
    how: "Remaining balance of free usage provided by your current plan."
  },
  "Plan expiration": {
    what: "End of current billing cycle.",
    how: "The date when your current subscription will renew or expire."
  }
};

const renderTooltipContent = (label) => {
  const info = BILLING_TOOLTIPS[label];
  return (
    <div className="flex flex-col gap-1 text-[11px] text-left max-w-[250px]">
      <div className="font-bold text-foreground">
        {info?.what || "Usage details for this item."}
      </div>
      <div className="text-muted-foreground text-[10px] leading-relaxed">
        {info?.how || "Calculated based on actual consumption."}
      </div>
    </div>
  );
};

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
  const [subscriptionSetup, setSubscriptionSetup] = useState(null);
  const [billingDetails, setBillingDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [error, setError] = useState(null);
  const [expandedServices, setExpandedServices] = useState({});

  const toggleService = (serviceName) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceName]: !prev[serviceName]
    }));
  };
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const summaryRes = await axios.get(`${API}/billing/page-details?workspace_id=${currentWorkspace.workspace_id}&workspace_type=${currentWorkspace.workspace_type}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { summary, billing_details, subscription } = summaryRes.data;
        setBillingData(summary);
        setBillingDetails(billing_details);
        setSubscriptionSetup(subscription);

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

  useEffect(() => {
    if (currentWorkspace && activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [currentWorkspace, activeTab, currentPage, itemsPerPage, searchQuery]);

  const fetchInvoices = async () => {
    try {
      setIsLoadingInvoices(true);
      const token = localStorage.getItem('token');
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        workspace_id: currentWorkspace.workspace_id,
        workspace_type: currentWorkspace.workspace_type
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await axios.get(`${API}/billing/invoices`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data.invoices || []);
      setTotalInvoices(response.data.total || 0);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Filtering is now handled on server
  const filteredInvoices = invoices;


  const totalPages = Math.ceil(totalInvoices / itemsPerPage);


  const handleUpgrade = () => {
    openModal('upgrade');
  };

  const handleDeletePaymentMethod = async () => {
    setShowDeleteConfirm(false);
    try {
      const token = localStorage.getItem('token');
      const wsQuery = `?workspace_id=${currentWorkspace.workspace_id}&workspace_type=${currentWorkspace.workspace_type}`;
      await axios.delete(`${API}/billing/payment-method${wsQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state to reflect deletion
      setSubscriptionSetup(prev => ({
        ...prev,
        payment_method: null,
        card_last4: null,
        card_expiry: null,
        paypal_order_id: null
      }));
    } catch (err) {
      console.error('Failed to delete payment method:', err);
      alert('Failed to delete payment method.');
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
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Platform usage in current billing period: <span className="font-bold">${billingData.totalUsage.toFixed(5)}</span>
            <CustomTooltip 
              content={
                <div className="flex flex-col gap-1 text-[11px] text-left max-w-[250px]">
                  <div className="font-bold text-foreground">Your total consumption so far.</div>
                  <div className="text-muted-foreground text-[10px] leading-relaxed">Calculated based on your aggregate usage across all services since the start of the billing period.</div>
                </div>
              }
            >
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
            </CustomTooltip>
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
        <h3 className="text-base font-semibold mb-3 text-foreground flex items-center gap-2">
          Plan consumption
          <CustomTooltip 
            content={
              <div className="flex flex-col gap-1 text-[11px] text-left max-w-[250px]">
                <div className="font-bold text-foreground">Usage of your monthly pre-paid credits.</div>
                <div className="text-muted-foreground text-[10px] leading-relaxed">Most plans include a monthly allowance of free platform usage credits.</div>
              </div>
            }
          >
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
          </CustomTooltip>
        </h3>

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
              Free usage ${billingData.planConsumption.freeUsed.toFixed(5)} / ${billingData.planConsumption.freeTotal.toFixed(5)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-muted border-2 border-border"></span>
            <span className="text-muted-foreground">
              Remaining free usage ${billingData.planConsumption.freeRemaining.toFixed(5)}
            </span>
          </div>
        </div>
      </div>

      {/* Platform Usage Breakdown */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold mb-3 text-foreground flex items-center gap-2">
          Platform usage breakdown by services
          <CustomTooltip 
            content={
              <div className="flex flex-col gap-1 text-[11px] text-left max-w-[250px]">
                <div className="font-bold text-foreground">Granular breakdown of costs across platform components.</div>
                <div className="text-muted-foreground text-[10px] leading-relaxed">Shows exactly where your consumption is coming from: Actors, Storage, Proxy, or Data Transfer.</div>
              </div>
            }
          >
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
          </CustomTooltip>
        </h3>

        {/* Visual Bar */}
        <div className="h-6 bg-muted rounded-full mb-4 overflow-hidden flex w-full border border-border">
          {billingData.totalUsage > 0 ? (
            billingData.services.map((service, index) => {
              const percentage = (service.amount / billingData.totalUsage) * 100;
              if (percentage === 0) return null;
              return (
                <div
                  key={index}
                  className={`h-full ${service.color} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                  title={`${service.name}: $${service.amount.toFixed(5)}`}
                />
              );
            })
          ) : (
            <div className="h-full w-full bg-muted" title="No usage recorded yet" />
          )}
        </div>

        {/* Service List */}
        <div className="space-y-0 border border-border rounded-lg overflow-hidden">
          {billingData.services.map((service, index) => {
            const isExpanded = !!expandedServices[service.name];
            return (
              <div key={service.name} className={`${index !== billingData.services.length - 1 ? 'border-b border-border' : ''}`}>
                <div
                  onClick={() => toggleService(service.name)}
                  className={`flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer ${isExpanded ? 'bg-muted/30' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={`w-2 h-2 rounded-full ${service.color}`}></span>
                    <span className="text-sm font-bold text-foreground">{service.name}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    ${service.amount.toFixed(5)}
                  </span>
                </div>

                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden bg-muted/5 dark:bg-muted/10">
                    {service.details && (
                      <div className="px-3 pb-4 pt-1">
                        <div className="overflow-x-auto">
                          <table className="w-full text-[12px] text-left border-collapse">
                            <thead>
                              <tr className="text-muted-foreground font-medium border-b border-border/50">
                                <th className="py-2 font-semibold">Item</th>
                                <th className="py-2 font-semibold text-right">Usage / Units</th>
                                <th className="py-2 font-semibold text-right">Price per unit</th>
                                <th className="py-2 font-semibold text-right">Cost</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {service.details.map((detail, dIdx) => {
                                if (detail.is_header) {
                                  return (
                                    <tr key={`header-${dIdx}`}>
                                      <td colSpan="4" className="py-3 font-bold text-foreground text-[13px] pt-4 flex items-center gap-1.5">
                                        {detail.label}
                                        {BILLING_TOOLTIPS[detail.label] && (
                                          <CustomTooltip 
                                            content={
                                              <div className="flex flex-col gap-1 text-[11px] text-left max-w-[250px]">
                                                <div className="font-bold text-foreground">{BILLING_TOOLTIPS[detail.label].what}</div>
                                                <div className="text-muted-foreground text-[10px] leading-relaxed">{BILLING_TOOLTIPS[detail.label].how}</div>
                                              </div>
                                            }
                                          >
                                            <HelpCircle className="w-3 h-3 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                                          </CustomTooltip>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                }

                            if (detail.type === 'run') {
                              return (
                                <tr key={detail.id || dIdx} className="hover:bg-muted/30 transition-colors">
                                  <td className="py-2.5">
                                    <div className="flex flex-col">
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/actor/${detail.actor_id}`);
                                        }}
                                        className="text-blue-500 font-bold hover:underline cursor-pointer"
                                      >
                                        {detail.actor_name} - {detail.unit_label}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(detail.date).toLocaleString()}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 text-right font-medium">{detail.units}</td>
                                  <td className="py-2.5 text-right text-muted-foreground">{detail.price_per_unit}</td>
                                  <td className="py-2.5 text-right font-bold text-foreground">${detail.cost.toFixed(5)}</td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={dIdx} className="hover:bg-muted/20 transition-colors">
                                <td className="py-2.5 flex items-center gap-1.5 font-medium text-foreground">
                                  {detail.label}
                                  <CustomTooltip 
                                    content={
                                      <div className="flex flex-col gap-1 text-[11px] text-left max-w-[250px]">
                                        <div className="font-bold text-foreground">
                                          {BILLING_TOOLTIPS[detail.label]?.what || "Usage details for this service."}
                                        </div>
                                        <div className="text-muted-foreground text-[10px] leading-relaxed">
                                          {BILLING_TOOLTIPS[detail.label]?.how || "Calculated based on actual consumption."}
                                        </div>
                                      </div>
                                    }
                                  >
                                    <HelpCircle className="w-3 h-3 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                                  </CustomTooltip>
                                </td>
                                <td className="py-2.5 text-right font-medium text-foreground">{detail.value}</td>
                                <td className="py-2.5 text-right text-muted-foreground">{detail.price || '-'}</td>
                                <td className="py-2.5 text-right font-bold text-foreground">${detail.cost.toFixed(5)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderHistoricalUsage = () => (
    <HistoricalUsageView currentWorkspace={currentWorkspace} />
  );

  const renderSubscription = () => {
    // Dynamic CU price formatting mapped exactly to Pricing logic for UI consistency
    let cuPriceString = '$0.300 / CU';
    if (billingData?.plan?.toLowerCase() === 'growth') cuPriceString = '$0.250 / CU';
    if (billingData?.plan?.toLowerCase() === 'scale') cuPriceString = '$0.200 / CU';
    if (billingData?.plan?.toLowerCase() === 'enterprise') cuPriceString = 'Custom';

    let residentialProxy = '$8.00 / GB';
    if (billingData?.plan?.toLowerCase() === 'growth') residentialProxy = '$7.50 / GB';
    if (billingData?.plan?.toLowerCase() === 'scale') residentialProxy = '$7.00 / GB';
    if (billingData?.plan?.toLowerCase() === 'enterprise') residentialProxy = 'Custom';

    let datacenterProxy = '5';
    if (billingData?.plan?.toLowerCase() === 'starter') datacenterProxy = '30 IPs then $1.00/IP';
    if (billingData?.plan?.toLowerCase() === 'growth') datacenterProxy = '100 IPs then $0.80/IP';
    if (billingData?.plan?.toLowerCase() === 'scale') datacenterProxy = '500 IPs then $0.60/IP';
    if (billingData?.plan?.toLowerCase() === 'enterprise') datacenterProxy = 'Custom';

    // Dynamic plan colors
    const planColors = {
      free: "bg-blue-400",
      starter: "bg-orange-400",
      growth: "bg-purple-400",
      scale: "bg-emerald-400",
      enterprise: "bg-indigo-400"
    };
    const activePlanKey = (billingData?.plan || 'free').toLowerCase();
    const activePlanColor = planColors[activePlanKey] || "bg-orange-400";

    // Helper logic to grab any saved detail (fallback to subscription if missing in dedicated details)
    const displayName = billingDetails?.full_name || subscriptionSetup?.billing_full_name || '';
    const displayAddress = billingDetails?.street_address || subscriptionSetup?.billing_street_address || '';
    const displayCity = billingDetails?.city || subscriptionSetup?.billing_city || '';
    const displayState = billingDetails?.state || subscriptionSetup?.billing_state || '';
    const displayCountry = billingDetails?.country || subscriptionSetup?.billing_country || '';
    const displayPostal = billingDetails?.postal_code || subscriptionSetup?.billing_postal_code || '';

    // Address format
    const fullAddress = [displayAddress, displayCity, displayState, displayPostal, displayCountry].filter(Boolean).join(', ');

    return (
      <div className="space-y-6">

        {/* -- Current Subscription Box -- */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-foreground">Current subscription</h2>
            {/* <button
              onClick={() => {
                if (currentWorkspace) {
                  selectWorkspace(currentWorkspace);
                }
                navigate('/upgrade-checkout');
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors"
            >
              Upgrade
            </button> */}
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full ${activePlanColor} opacity-80`} />
                <span className="text-[15px] font-bold text-foreground capitalize">
                  {billingData?.plan || 'Free'} plan
                  {billingData?.plan_period && (
                    <span className="text-muted-foreground font-normal lowercase ml-1">/ {billingData.plan_period}</span>
                  )}
                </span>
              </div>

              {(billingData?.account_balance || 0) > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50/80 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                  <span className="text-[13px] font-semibold text-green-700 dark:text-green-400">
                    Credit Balance: ${Number(billingData.account_balance).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Free platform usage:</span> ${billingData?.limits?.platform_credits?.toFixed(2) || '5.00'}
                <CustomTooltip content="Total free platform usage provided each month.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Scrapi Store pricing discount:</span> None
                <CustomTooltip content="Discount applied to premium subscriptions for actors available on the Store.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Actor compute units (CU):</span> {cuPriceString}
                <CustomTooltip content="Price per Compute Unit (CU), calculated based on Actor run time and memory.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Actor RAM:</span> {billingData?.limits?.max_ram_gb >= 9999 ? 'Unlimited' : `${billingData?.limits?.max_ram_gb || 2} GB`}
                <CustomTooltip content="Maximum memory allocation available for a single Actor run.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Max concurrent Actor runs:</span> {billingData?.limits?.max_concurrent_runs >= 9999 ? 'Unlimited' : (billingData?.limits?.max_concurrent_runs || 1)}
                <CustomTooltip content="Maximum number of automated scraping tasks that can execute parallelly at once.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Datacenter proxies:</span> {datacenterProxy}
                <CustomTooltip content="Access shared datacenter IP addresses provided by our network.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Residential proxies:</span> {residentialProxy}
                <CustomTooltip content="Access to real residential IPs routed through our localized network.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Proxy SERPs:</span> $2.50 / 1,000 SERPs
                <CustomTooltip content="Price for fetching Search Engine Results Pages (Google, Bing) reliably.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <span className="font-medium">Support level:</span> <span className="text-blue-500 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1">Community <ExternalLink className="w-3 h-3" /></span>
                <CustomTooltip content="The level of customer support coverage provided for your current tier.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>

              {/* Added Plan usage credit as requested */}
              <div className="flex items-center gap-2 text-[13px] text-foreground pt-1 border-t border-border/50">
                <span className="font-medium">Plan usage credit:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  ${billingData?.planConsumption?.freeUsed?.toFixed(2) || '0.00'} / ${billingData?.planConsumption?.freeTotal?.toFixed(2) || '0.00'}
                </span>
                <CustomTooltip content="Your available free platform usage credits for the current billing period.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                </CustomTooltip>
              </div>

              {billingData?.expires_at && (
                <div className="flex items-center gap-2 text-[13px] text-foreground pt-1 border-t border-border/50">
                  <span className="font-medium">Plan expiration:</span>
                  <span className={`${new Date(billingData.expires_at) < new Date() ? 'text-red-500 font-bold' : 'text-orange-600 dark:text-orange-400 font-bold'}`}>
                    {new Date(billingData.expires_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    {new Date(billingData.expires_at) > new Date() && (
                      <span className="ml-1.5 text-xs font-medium opacity-80">
                        ({Math.ceil((new Date(billingData.expires_at) - new Date()) / (1000 * 60 * 60 * 24))} days left)
                      </span>
                    )}
                  </span>
                  <CustomTooltip content="The date your current subscription plan will expire.">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                  </CustomTooltip>
                </div>
              )}

              <div className="pt-3">
                <a href="#" className="text-[13px] font-medium text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1">See all plan features and compare plans <ExternalLink className="w-3.5 h-3.5" /></a>
              </div>
            </div>
          </div>
        </div>

        {/* -- Payment Methods Box -- */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-foreground">Payment methods</h3>
              <CustomTooltip content="Manage the credit cards or PayPal accounts used for billing your subscription.">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
              </CustomTooltip>
            </div>
            <button onClick={() => openModal('add-payment')} className="flex items-center gap-1 text-[13px] text-foreground font-semibold hover:bg-muted px-2 py-1 rounded transition-colors"><span className="text-lg leading-none mb-0.5">+</span> Add new</button>
          </div>
          <div className="p-5">
            {!subscriptionSetup?.payment_method ? (
              <div className="text-[13px] text-muted-foreground">No payment methods found.</div>
            ) : (
              <div className="flex items-center justify-between border border-border/60 rounded-lg p-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-muted rounded border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {subscriptionSetup?.payment_method === 'paypal' ? 'PAYPAL' : 'CARD'}
                  </div>
                  <span className="text-[13px] font-semibold text-foreground">
                    {subscriptionSetup?.payment_method === 'paypal' ? 'PayPal' : `•••• •••• •••• ${subscriptionSetup?.card_last4 || '1234'}`}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[13px] text-foreground">Primary</span>
                  <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* -- Billing Details Box -- */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-foreground">Billing details</h3>
              <CustomTooltip content="Update your company name, tax IDs, and physical address for invoices.">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
              </CustomTooltip>
            </div>
            <button
              onClick={() => openModal('edit-billing')}
              className="flex items-center gap-1.5 text-[13px] text-foreground font-semibold hover:bg-muted px-2 py-1 rounded transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
              Edit
            </button>
          </div>
          <div className="p-5">
            <div className="text-[13px] text-foreground font-semibold leading-relaxed">
              {displayName ? (
                <>
                  <div>{displayName}</div>
                  {billingDetails?.company && <div>{billingDetails.company}</div>}
                  <div className="mt-1">{fullAddress}</div>
                </>
              ) : (
                <div className="text-muted-foreground">No billing details provided.</div>
              )}
            </div>
          </div>
        </div>

        {/* -- Special Offers Box -- */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-foreground">Special offers</h3>
              <CustomTooltip content="Apply referral codes or exclusive promotional discounts to your active workspace.">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
              </CustomTooltip>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => openModal('add-referral')} className="flex items-center gap-1 text-[13px] text-foreground font-semibold hover:bg-muted px-2 py-1 rounded transition-colors"><span className="text-lg leading-none mb-0.5">+</span> Add a referral code</button>
              <button onClick={() => openModal('add-promo')} className="flex items-center gap-1 text-[13px] text-foreground font-semibold hover:bg-muted px-2 py-1 rounded transition-colors"><span className="text-lg leading-none mb-0.5">+</span> Add a promo code</button>
            </div>
          </div>
        </div>

        {/* -- Confirmation Modal -- */}
        <AlertModal
          show={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeletePaymentMethod}
          title="Remove Payment Method"
          message="Are you sure you want to remove your payment method? This action cannot be undone."
          type="warning"
          showCancel={true}
          confirmText="Remove"
          cancelText="Cancel"
        />

      </div>
    );
  };

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

  const renderPricing = () => {
    // Determine dynamic CU price string based on plan (Apify style limits mapped from backend)
    // Default to 'Custom' or standard static fallback if not explicitly provided
    let cuPriceString = '$0.30 / CU';
    if (billingData?.plan?.toLowerCase() === 'growth') cuPriceString = '$0.25 / CU';
    if (billingData?.plan?.toLowerCase() === 'scale') cuPriceString = '$0.20 / CU';
    if (billingData?.plan?.toLowerCase() === 'enterprise') cuPriceString = 'Custom';

    // Same fallback mapping for proxies based on tiers
    let residentialProxy = '$8.00 / GB';
    if (billingData?.plan?.toLowerCase() === 'growth') residentialProxy = '$7.50 / GB';
    if (billingData?.plan?.toLowerCase() === 'scale') residentialProxy = '$7.00 / GB';
    if (billingData?.plan?.toLowerCase() === 'enterprise') residentialProxy = 'Custom';

    let datacenterProxy = '5 IPs included';
    if (billingData?.plan?.toLowerCase() === 'starter') datacenterProxy = '30 IPs then $1.00/IP';
    if (billingData?.plan?.toLowerCase() === 'growth') datacenterProxy = '100 IPs then $0.80/IP';
    if (billingData?.plan?.toLowerCase() === 'scale') datacenterProxy = '500 IPs then $0.60/IP';
    if (billingData?.plan?.toLowerCase() === 'enterprise') datacenterProxy = 'Custom';

    return (
      <div className="space-y-4">
        {/* Actors */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="text-base font-bold text-foreground">Actors</h3>
          </div>
          <div>
            {renderPricingRow('Compute units (CU)', cuPriceString, 'Billed per second of Actor run based on memory allocated')}
          </div>
        </div>

        {/* Proxy */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="text-base font-bold text-foreground">Proxy</h3>
          </div>
          <div>
            {renderPricingRow('Residential proxies', residentialProxy, 'Charged per GB of traffic')}
            {renderPricingRow('Datacenter proxies', datacenterProxy, 'Shared IPs included in free tier')}
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
  };

  const invoiceColumns = useMemo(() => [
    {
      header: "Number",
      accessorKey: "invoice_no",
      cell: ({ row }) => (
        <span className="text-[13px] font-medium text-foreground">#{row.invoice_no.split('-').pop()}</span>
      )
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: ({ row }) => (
        <span className="text-[13px] font-semibold text-foreground">${row.amount.toFixed(2)} USD</span>
      )
    },
    {
      header: "Issued on",
      accessorKey: "created_at",
      cell: ({ row }) => (
        <span className="text-[13px] text-foreground">
          {new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )
    },
    {
      header: "Due on",
      accessorKey: "created_at",
      cell: ({ row }) => (
        <span className="text-[13px] text-foreground">
          {new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )
    },
    {
      header: "Payment status",
      cell: () => (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 w-fit border border-emerald-100 dark:border-emerald-900/30">
          <span className="text-[11px] font-bold uppercase tracking-wider">Paid</span>
        </div>
      )
    },
    {
      header: "Payment attempts",
      cell: () => <span className="text-[13px] text-foreground">1</span>
    },
    {
      header: "Invoice type",
      accessorKey: "plan",
      cell: ({ row }) => <span className="text-[13px] text-foreground capitalize">{row.plan} Subscription</span>
    },
    {
      header: "View",
      className: "text-right pr-6",
      cellClassName: "text-right pr-6",
      cell: ({ row }) => (
        <button
          className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/billing/invoices/${row._id}`);
          }}
        >
          View
        </button>
      )
    }
  ], [navigate]);

  const renderInvoices = () => {

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
            {totalInvoices} {totalInvoices === 1 ? 'item' : 'items'}
          </span>
        </div>

        <DataTable
          columns={invoiceColumns}
          data={filteredInvoices}
          loading={isLoadingInvoices}
          onRowClick={(row) => navigate(`/billing/invoices/${row._id}`)}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          totalItems={totalInvoices}
        />
      </div>
    );
  };

  const renderLimits = () => {
    // Utility for safely calculating percentage widths
    const getPercent = (used, total) => {
      if (!total || total === 0) return 0;
      return Math.min(100, Math.max(0, (used / total) * 100));
    };

    // Extract limits with safe defaults
    const limits = billingData?.limits || {};
    const usage = billingData?.currentUsage || {};
    const planName = billingData?.plan?.toLowerCase() || 'free';

    // 1. Storage / RAM limit
    const usedRam = billingData?.ramUsage?.used_mb || 0;
    const maxRamMb = billingData?.ramUsage?.limit_mb || (limits.max_ram_gb ? limits.max_ram_gb * 1024 : 8192);
    // Convert to GB for display if clean, otherwise MB
    const formatRam = (mb) => mb >= 1024 && mb % 1024 === 0 ? `${mb / 1024} GB` : `${mb} MB`;

    // 2. Actors limit
    const usedActors = usage.actors || 0;
    const maxActors = limits.max_actors || (planName === 'free' ? 10 : 500);

    // 3. Schedules limit
    const usedSchedules = usage.schedules || 0;
    const maxSchedules = limits.max_schedules || 0;

    // 4. Tasks limit
    const usedTasks = usage.tasks || 0;
    const maxTasks = limits.max_tasks || (planName === 'free' ? 100 : 5000);

    // 5. Concurrent Runs limit
    const usedConcurrent = usage.running_concurrently || 0;
    const maxConcurrent = limits.max_concurrent_runs || 1;

    // 6. Platform Usage
    const freeUsed = billingData?.planConsumption?.freeUsed || 0;
    const freeTotal = billingData?.planConsumption?.freeTotal || 5.0;

    // Retention helper
    const retentionDays = limits.data_retention_days || 7;

    return (
      <div className="space-y-5">

        {/* Top Grid: Plan Limits & Data Retention */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Plan Limits Box (2/3 width) */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-bold text-foreground mb-1.5">Plan limits</h2>
            <p className="text-[13px] text-muted-foreground mb-6">
              These limits come from your subscription plan. To increase the limits, please <a href="#" onClick={(e) => { e.preventDefault(); handleUpgrade(); }} className="text-blue-500 hover:text-blue-600">upgrade</a> your plan or contact support.
            </p>

            <div className="space-y-4">
              {/* RAM Row */}
              <div>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    Total Actor RAM
                    <CustomTooltip content={renderTooltipContent("Total Actor RAM")}>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    </CustomTooltip>
                  </div>
                  <div className="text-foreground font-medium">{formatRam(usedRam)} of {formatRam(maxRamMb)}</div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPercent(usedRam, maxRamMb)}%` }}></div>
                </div>
              </div>

              {/* Actors Row */}
              <div>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    Number of Actors
                    <CustomTooltip content={renderTooltipContent("Number of Actors")}>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    </CustomTooltip>
                  </div>
                  <div className="text-foreground font-medium">{usedActors} of {maxActors}</div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPercent(usedActors, maxActors)}%` }}></div>
                </div>
              </div>

              {/* Schedules Row */}
              <div>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    Number of schedules
                    <CustomTooltip content={renderTooltipContent("Number of schedules")}>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    </CustomTooltip>
                  </div>
                  <div className="text-foreground font-medium">{usedSchedules} of {maxSchedules}</div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPercent(usedSchedules, maxSchedules)}%` }}></div>
                </div>
              </div>

              {/* Tasks Row */}
              <div>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    Number of Actor tasks
                    <CustomTooltip content={renderTooltipContent("Number of Actor tasks")}>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    </CustomTooltip>
                  </div>
                  <div className="text-foreground font-medium">{usedTasks} of {maxTasks}</div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPercent(usedTasks, maxTasks)}%` }}></div>
                </div>
              </div>

              {/* Concurrent Runs Row */}
              <div>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    Number of concurrent Actor runs
                    <CustomTooltip content={renderTooltipContent("Number of concurrent Actor runs")}>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    </CustomTooltip>
                  </div>
                  <div className="text-foreground font-medium">{usedConcurrent} of {maxConcurrent}</div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPercent(usedConcurrent, maxConcurrent)}%` }}></div>
                </div>
              </div>

              {/* Extra App Details: Build time & Proxy */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/50">
                <div>
                  <div className="flex items-center gap-1.5 text-[13px] text-foreground font-medium mb-1">
                    Max Actor build memory
                    <CustomTooltip content={renderTooltipContent("Max Actor build memory")}>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    </CustomTooltip>
                  </div>
                  <div className="text-[13px] font-semibold text-foreground">
                    {limits.max_ram_gb >= 8 ? 'Unlimited' : '2 GB'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[13px] text-foreground font-medium mb-1">
                    Max Actor build time
                    <CustomTooltip content={renderTooltipContent("Max Actor build time")}>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    </CustomTooltip>
                  </div>
                  <div className="text-[13px] font-semibold text-foreground">
                    {limits.max_actor_build_mins || 10} minutes
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Data Retention Box (1/3 width) */}
          <div className="rounded-lg border border-border bg-card p-5 flex flex-col">
            <h2 className="text-lg font-bold text-foreground mb-3">Data retention</h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
              Scrapi securely stores your Actor runs and datasets based on your workspace's storage policy.
              Data that exceeds the retention period below is automatically deleted to optimize platform performance.
              Upgrade your current plan to keep your valuable scraping data stored for longer periods.{' '}
              <a href="#" className="text-blue-500 hover:text-blue-600 inline-flex items-center gap-1">
                Pricing details <ExternalLink className="w-3 h-3" />
              </a>
            </p>

            <div className="mt-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-foreground">{retentionDays} days</span>
                <CustomTooltip content={renderTooltipContent("Data retention")}>
                  <HelpCircle className="w-4 h-4 text-muted-foreground/60 cursor-help" />
                </CustomTooltip>
              </div>
              <button onClick={handleUpgrade} className="px-3 py-1.5 border border-border rounded bg-muted/30 text-[13px] font-semibold hover:bg-muted text-foreground transition-colors">
                Upgrade retention
              </button>

              <div className="mt-5 pt-4 border-t border-border/50">
                <h3 className="text-[13px] font-semibold text-foreground mb-2">Included Proxies</h3>
                <div className="text-[13px] text-muted-foreground">
                  {planName === 'starter' ? '30 Shared IPs' : planName === 'growth' ? '100 Shared IPs' : planName === 'scale' ? '500 Shared IPs' : '5 Shared IPs'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Full-Width: Custom Usage Limit */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1.5">Custom usage limit</h2>
              <p className="text-[13px] text-muted-foreground">
                This hard limit helps protect your workspace against unexpected API charges and platform overuse.
                You'll receive an email notification if your monthly credit consumption approaches the maximum.
                If exceeded, Scrapi platform services will be temporarily paused to prevent billing overages.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-end mb-1.5">
              <div className="font-bold text-foreground text-[14px]">Total monthly platform usage</div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-foreground text-right w-[150px]">
                  ${freeUsed.toFixed(2)} of ${freeTotal.toFixed(2)}
                </span>
                <button onClick={handleUpgrade} className="px-3 py-1 border border-border rounded bg-muted/30 text-[12px] font-semibold hover:bg-muted transition-colors whitespace-nowrap">
                  Upgrade
                </button>
              </div>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPercent(freeUsed, freeTotal)}%` }}></div>
            </div>
          </div>
        </div>

      </div>
    );
  };

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
    <div className="flex-1 min-h-screen bg-background scrollbar-hide">
      {isLoading ? (
        <div className="flex items-center justify-center h-full pt-20">
          <LoadingScreen />
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

      {/* Modals */}
      <EditBillingModal
        modalId="edit-billing"
        initialData={billingDetails || subscriptionSetup || {}}
        onSuccess={(data) => {
          setBillingDetails(data);
        }}
      />
      <AddPaymentModal
        modalId="add-payment"
        onSuccess={(data) => {
          setSubscriptionSetup(prev => ({ ...prev, ...data }));
        }}
      />
      <AddReferralModal modalId="add-referral" onSuccess={() => { }} />
      <AddPromoModal modalId="add-promo" onSuccess={() => { }} />

    </div>
  );
};

export default Billing;