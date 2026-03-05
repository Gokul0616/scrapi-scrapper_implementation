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

  const renderInvoices = () => {
    const invoiceColumns = [
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
    ];

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

  const renderLimits = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold mb-3 text-foreground">Usage Limits</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Platform credits per month</span>
            <span className="text-sm font-semibold text-foreground">${billingData?.limits?.platform_credits?.toFixed(2) || '5.00'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Concurrent Actor runs</span>
            <span className="text-sm font-semibold text-foreground">
              {billingData?.limits?.max_concurrent_runs >= 9999 ? 'Unlimited' : (billingData?.limits?.max_concurrent_runs || 1)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Maximum RAM per Actor</span>
            <span className="text-sm font-semibold text-foreground">
              {billingData?.limits?.max_ram_gb >= 9999 ? 'Unlimited' : `${billingData?.limits?.max_ram_gb || 2} GB`}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-foreground">Data Retention Duration</span>
            <span className="text-sm font-semibold text-foreground">
              {billingData?.limits?.data_retention_days || 7} days
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-foreground">Scheduled Runs</span>
            <span className="text-sm font-semibold text-foreground">
              {billingData?.limits?.max_schedules === 0
                ? '0 (Upgrade Required)'
                : billingData?.limits?.max_schedules >= 9999
                  ? 'Unlimited'
                  : billingData?.limits?.max_schedules}
            </span>
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
    <div className="flex-1 min-h-screen bg-background scrollbar-hide">
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