import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Check, ExternalLink } from 'lucide-react';
import axios from 'axios';
import GlobalModal from '../components/GlobalModal';

// ─── Step components ──────────────────────────────────────────────────────────
import PlanStep from './checkout/PlanStep';
import AddOnsStep from './checkout/AddOnsStep';
import BillingDetailsStep from './checkout/BillingDetailsStep';
import PaymentStep from './checkout/PaymentStep';
import ReviewStep from './checkout/ReviewStep';

const STEPS = ['Plan', 'Add-ons', 'Billing details', 'Payment', 'Review'];
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

// ─── Main shell ───────────────────────────────────────────────────────────────
const UpgradeCheckout = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { openModal, closeModal } = useModal();
    const { currentWorkspace } = useWorkspace();
    const isDark = theme === 'dark';

    // ── Shared state ──────────────────────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnnual, setIsAnnual] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [billingDetails, setBillingDetails] = useState({
        fullName: '', company: '', taxId: '',
        streetAddress: '', city: '', postalCode: '', country: '',
    });
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [paymentCard, setPaymentCard] = useState({ number: '', expiry: '' });
    const [addons, setAddons] = useState({});

    // Saved setup fetched from backend (used for restore prompt)
    const [savedSetup, setSavedSetup] = useState(null);
    const [configs, setConfigs] = useState({ plans: {}, addons: {} });

    // ── Fetch billing configuration on mount ──────────────────────────────────
    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const res = await axios.get(`${API}/billing/plans`);
                if (res.data) setConfigs(res.data);
            } catch (err) {
                console.error("Failed to fetch billing configs:", err);
            }
        };
        fetchConfigs();
    }, []);

    const goNext = () => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
    const goBack = () => setCurrentStep(s => Math.max(s - 1, 0));
    const goTo = (index) => { if (index < currentStep) setCurrentStep(index); };

    const handleClose = () => navigate(-1);

    // ── On mount: check for a previous confirmed subscription setup ───────────
    useEffect(() => {
        if (!currentWorkspace) return; // wait for workspace context to load
        const checkSavedSetup = async () => {
            try {
                const token = localStorage.getItem('token');
                const wsId = currentWorkspace.workspace_id;
                const wsType = currentWorkspace.workspace_type;
                const res = await axios.get(`${API}/billing/subscription`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { workspace_id: wsId, workspace_type: wsType },
                });
                // Only restore if the saved setup belongs to THIS workspace
                if (
                    res.data && res.data.plan &&
                    res.data.workspace_id === wsId &&
                    res.data.workspace_type === wsType
                ) {
                    setSavedSetup(res.data);
                    openModal('checkout-restore-setup');
                }
            } catch (_) {
                // Silently continue — no saved setup
            }
        };
        checkSavedSetup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentWorkspace]);

    // ── Restore previous setup → jump to Review ───────────────────────────────
    const handleRestoreSetup = () => {
        closeModal();
        if (!savedSetup) return;

        setSelectedPlan(savedSetup.plan || null);
        setIsAnnual(savedSetup.is_annual || false);
        setPaymentMethod(savedSetup.payment_method || 'card');

        // Restore card with isRestored flag — bypasses digit-length/expiry checks in PaymentStep
        const savedExpiry = savedSetup.card_expiry || '';
        const expiryDigits = savedExpiry.replace(/\D/g, '').slice(0, 4);
        setPaymentCard({
            number: savedSetup.card_last4 ? `•••• •••• •••• ${savedSetup.card_last4}` : '',
            expiry: savedExpiry,
            expiryDisplay: savedExpiry,
            expiryDigits: expiryDigits,
            isRestored: true,
        });

        setBillingDetails({
            fullName: savedSetup.billing_full_name || '',
            company: savedSetup.billing_company || '',
            taxId: '',
            streetAddress: savedSetup.billing_street_address || '',
            city: savedSetup.billing_city || '',
            postalCode: savedSetup.billing_postal_code || '',
            country: savedSetup.billing_country || '',
        });
        // Jump straight to Review
        setCurrentStep(4);
    };

    const handleStartFresh = () => {
        closeModal();
        // Keep defaults — normal flow from step 0
    };

    // ── Render the right step ─────────────────────────────────────────────────
    const renderStep = () => {
        const addonCost = Object.entries(addons).reduce((sum, [id, qty]) => {
            const price = configs.addons[id]?.price || 0;
            return sum + (qty * price);
        }, 0);

        const shared = {
            onNext: goNext,
            onBack: goBack,
            selectedPlan,
            isAnnual,
            setIsAnnual,
            configs,
            addonCost,
            addons
        };

        switch (currentStep) {
            case 0: return <PlanStep {...shared} setSelectedPlan={setSelectedPlan} />;
            case 1: return <AddOnsStep {...shared} addons={addons} setAddons={setAddons} />;
            case 2: return <BillingDetailsStep {...shared} billingDetails={billingDetails} setBillingDetails={setBillingDetails} />;
            case 3: return <PaymentStep {...shared} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} paymentCard={paymentCard} setPaymentCard={setPaymentCard} />;
            case 4: return <ReviewStep {...shared} billingDetails={billingDetails} paymentMethod={paymentMethod} paymentCard={paymentCard} addons={addons} />;
            default: return null;
        }
    };

    // ── Saved setup summary labels ────────────────────────────────────────────
    const savedPlanLabel = savedSetup?.plan ? savedSetup.plan.charAt(0).toUpperCase() + savedSetup.plan.slice(1) : '';
    const savedBillingLabel = savedSetup?.billing_city || savedSetup?.billing_country || '';
    const savedPaymentLabel = savedSetup?.payment_method === 'paypal'
        ? 'PayPal'
        : savedSetup?.card_last4 ? `Card •••• ${savedSetup.card_last4}` : 'Card';

    return (
        <div className="min-h-screen bg-background flex flex-col">

            {/* ── Sticky top bar ────────────────────────────────────────────── */}
            <div className="flex-shrink-0 sticky top-0 z-20 bg-background">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-2 select-none">
                        <img
                            src="/logo.png"
                            alt="Scrapi"
                            className={`h-6 w-auto object-contain ${isDark ? 'invert brightness-200' : ''}`}
                        />
                        <span className="text-sm font-bold text-foreground tracking-tight">Scrapi</span>
                    </div>
                    <h1 className="text-[15px] font-semibold text-foreground absolute left-1/2 -translate-x-1/2 pointer-events-none">
                        New subscription
                    </h1>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Stepper ───────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center justify-center gap-0 py-4 bg-background border-b border-border">
                {STEPS.map((step, i) => {
                    const done = i < currentStep;
                    const active = i === currentStep;
                    const clickable = i < currentStep;
                    return (
                        <React.Fragment key={step}>
                            <button
                                onClick={() => goTo(i)}
                                disabled={!clickable && !active}
                                className={`flex flex-col items-center group ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${done || active ? 'border-blue-500 bg-blue-500' : 'border-border bg-background'}`}>
                                    {done
                                        ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                        : active
                                            ? <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                            : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                    }
                                </div>
                                <span className={`text-[11px] mt-1 font-medium transition-colors ${active ? 'text-blue-500' : done ? 'text-blue-400 group-hover:text-blue-500' : 'text-muted-foreground'}`}>
                                    {step}
                                </span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <div className={`h-px w-10 mb-5 mx-1 transition-colors ${i < currentStep ? 'bg-blue-500' : 'bg-border'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* ── Step content ─────────────────────────────────────────────── */}
            {renderStep()}

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex justify-center items-center py-3 border-t border-border bg-background">
                <p className="text-sm text-muted-foreground">
                    Need help?{' '}
                    <a href="mailto:support@scrapi.io" className="text-blue-500 hover:text-blue-600 font-medium transition-colors">Contact support</a>
                </p>
            </div>

            {/* ── Restore previous setup modal ──────────────────────────────── */}
            <GlobalModal
                modalId="checkout-restore-setup"
                size="sm"
                showCloseButton
                closeOnBackdropClick={false}
            >
                <div className="px-6 py-5 space-y-5">
                    <div>
                        <h3 className="text-[15px] font-semibold text-foreground">
                            Continue with previous setup?
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            We found a previously confirmed subscription setup for your account.
                        </p>
                    </div>

                    {/* Summary of saved setup */}
                    {savedSetup && (
                        <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border text-sm">
                            {savedPlanLabel && (
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-muted-foreground">Plan</span>
                                    <span className="font-semibold text-foreground">{savedPlanLabel} · {savedSetup.is_annual ? 'Annual' : 'Monthly'}</span>
                                </div>
                            )}
                            {savedBillingLabel && (
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-muted-foreground">Billing</span>
                                    <span className="font-semibold text-foreground">{savedBillingLabel}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-muted-foreground">Payment</span>
                                <span className="font-semibold text-foreground">{savedPaymentLabel}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                        <button
                            onClick={handleRestoreSetup}
                            className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                        >
                            Yes, continue from review
                        </button>
                        <button
                            onClick={handleStartFresh}
                            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                            No, start fresh
                        </button>
                    </div>
                </div>
            </GlobalModal>
        </div>
    );
};

export default UpgradeCheckout;
