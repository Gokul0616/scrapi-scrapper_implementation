import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    CheckCircle2,
    Loader2,
    XCircle,
    ArrowRight,
    CreditCard,
    Package,
    LayoutGrid,
    User,
    FileText
} from 'lucide-react';
import './PaymentSuccess.css';
import LoadingScreen from '@/components/LoadingScreen';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const Row = ({ label, value, highlight }) => (
    <div className="flex items-center justify-between py-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold ${highlight ? 'text-blue-600' : 'text-foreground'}`}>{value}</span>
    </div>
);

const Section = ({ icon: Icon, label, children }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState('loading');
    const [details, setDetails] = useState(null);
    const [configs, setConfigs] = useState({ plans: {}, addons: {} });
    const [showConfetti, setShowConfetti] = useState(false);
    const hasCaptured = useRef(false);

    useEffect(() => {
        const capture = async () => {
            if (hasCaptured.current) return;

            const params = new URLSearchParams(location.search);
            const provider = params.get('provider');
            const token = params.get('token');

            if (provider === 'paypal' && token) {
                try {
                    hasCaptured.current = true;
                    const auth_token = localStorage.getItem('token');
                    const savedState = JSON.parse(localStorage.getItem('scrapi_paypal_checkout_state') || '{}');

                    const res = await axios.post(`${API}/billing/paypal/capture-order`, {
                        order_id: token,
                        workspace_id: savedState.workspace_id,
                        workspace_type: savedState.workspace_type,
                        plan_data: {
                            plan: savedState.plan,
                            is_annual: savedState.is_annual,
                            addons: savedState.addons,
                            proration_discount: savedState.proration_discount,
                            account_balance_used: savedState.account_balance_used
                        },
                        billing_details: savedState.billing_details
                    }, {
                        headers: { Authorization: `Bearer ${auth_token}` }
                    });

                    if (res.data.status === 'COMPLETED') {
                        setDetails(res.data);
                        setStatus('success');
                        triggerCelebration();
                        localStorage.removeItem('scrapi_paypal_checkout_state');
                    } else {
                        setStatus('error');
                    }
                } catch (err) {
                    console.error("Capture error:", err);
                    setStatus('error');
                }
            } else if (location.state) {
                setTimeout(() => {
                    setDetails(location.state);
                    setStatus('success');
                    triggerCelebration();
                }, 1500);
            } else {
                // Mock success for testing if no URL params
                setStatus('success');
                triggerCelebration();
            }
        };

        const fetchConfigs = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API}/billing/plans`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data) setConfigs(res.data);
            } catch (err) {
                console.error("Failed to fetch billing configs:", err);
            }
        };

        fetchConfigs();
        capture();
    }, [location]);

    const triggerCelebration = () => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <LoadingScreen text='Finalisisng your upgrade...' />
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                    <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-xl font-bold text-foreground mb-2">Transaction error</h1>
                <p className="text-sm text-muted-foreground max-w-sm mb-8">
                    We encountered a problem while processing your payment. Please check your billing dashboard or contact support.
                </p>
                <button onClick={() => navigate('/billing')} className="px-5 py-2 bg-foreground text-background text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
                    Go to Billing
                </button>
            </div>
        );
    }

    const getRenewalDate = () => {
        const d = new Date();
        if (details?.is_annual) d.setFullYear(d.getFullYear() + 1);
        else d.setMonth(d.getMonth() + 1);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] flex flex-col items-center relative overflow-x-hidden">
            {showConfetti && (
                <div className="confetti-container">
                    {[...Array(150)].map((_, i) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                        const size = Math.random() * 8 + 4;
                        const delay = Math.random() * 5;
                        const duration = Math.random() * 3 + 2;
                        const left = Math.random() * 100;
                        const shape = i % 3 === 0 ? '50%' : '2px'; // mix of circles and rectangles

                        return (
                            <div
                                key={i}
                                className="confetti"
                                style={{
                                    left: `${left}%`,
                                    animationDelay: `${delay}s`,
                                    animationDuration: `${duration}s`,
                                    width: `${size}px`,
                                    height: `${i % 2 === 0 ? size : size * 1.5}px`,
                                    opacity: 0.8,
                                    backgroundColor: colors[i % colors.length],
                                    borderRadius: shape,
                                    transform: `rotate(${Math.random() * 360}deg)`
                                }}
                            />
                        );
                    })}
                </div>
            )}

            {/* ─── Header ────────────────────────────────────────────────────────── */}
            <header className="w-full flex items-center h-16 px-6 border-b border-border bg-card sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <img
                        src="/logo.png"
                        alt="Scrapi Logo"
                        className="w-8 h-8 object-contain dark:invert transition-all grayscale"
                    />
                    <span className="text-xl font-semibold text-foreground">Scrapi</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <button onClick={() => navigate('/')} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50">Return home</button>
                </div>
            </header>

            <main className="w-full max-w-4xl px-6 py-10 flex flex-col items-center animate-in slide-in-from-bottom-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-1 text-center tracking-tight">Subscription confirmed</h1>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-10">
                    Your workspace has been upgraded successfully. You now have full access to your new plan's features and limits.
                </p>

                {/* Scrapi/ReviewStep Style Sections in Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-10">
                    <div className="space-y-4">
                        <Section icon={User} label="Account info">
                            <div className="flex items-center gap-3 py-1">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                    {(details?.workspace_name || 'P')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground leading-tight">{details?.workspace_name || 'Personal Workspace'}</p>
                                    <p className="text-xs text-muted-foreground">{details?.account_email || 'user@example.com'}</p>
                                </div>
                            </div>
                        </Section>

                        <Section icon={Package} label="Plan details">
                            <Row label="Current Plan" value={details?.plan?.charAt(0).toUpperCase() + details?.plan?.slice(1) || 'Starter'} />
                            <Row label="Billing Cycle" value={details?.is_annual ? 'Annual' : 'Monthly'} />
                            <Row label="Next Renewal" value={getRenewalDate()} />
                            <Row label="Status" value="Active" highlight />
                        </Section>
                    </div>
                    <div className="flex flex-col">
                        <Section icon={CreditCard} label="Transaction summary" className="h-full">
                            <Row label="Total Paid" value={`$${details?.amount?.toFixed(2) || '0.00'} USD`} highlight />
                            <Row label="Plan Subtotal" value={`$${details?.subtotal?.toFixed(2) || '0.00'}`} />
                            {typeof details?.proration_discount === 'number' && details.proration_discount > 0 && (
                                <Row label="Proration Discount" value={`-$${details.proration_discount.toFixed(2)}`} />
                            )}
                            {typeof details?.account_balance_used === 'number' && details.account_balance_used > 0 && (
                                <Row label="Credit Balance Applied" value={`-$${details.account_balance_used.toFixed(2)}`} />
                            )}
                            {typeof details?.overflow_credited === 'number' && details.overflow_credited > 0 && (
                                <Row label="Credit Balance Saved" value={`+$${details.overflow_credited.toFixed(2)}`} />
                            )}
                            {/* Detailed Addons Breakdown */}
                            {details?.addons && Object.entries(details.addons).some(([, q]) => q > 0) && (
                                <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Add-on Fees</p>
                                    {Object.entries(details.addons)
                                        .filter(([, qty]) => qty > 0)
                                        .map(([id, qty]) => {
                                            const addonConfig = configs.addons[id] || {};
                                            const label = addonConfig.label || id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                            const pricePerUnit = (addonConfig.price || 0);
                                            const totalAddon = qty * pricePerUnit;

                                            return (
                                                <div key={id} className="flex items-center justify-between text-[13px]">
                                                    <span className="text-muted-foreground">{label} (x{qty})</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-foreground">${totalAddon.toFixed(2)}</span>
                                                        <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-bold">INCL</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-border/50">
                                <Row label="Method" value={
                                    details?.payment_method === 'credit_balance' ? 'Credit Balance' :
                                        details?.payment_method === 'paypal' ? 'PayPal' :
                                            (details?.payment_method || 'Unknown').toUpperCase()
                                } />

                                {details?.payment_method === 'paypal' ? (
                                    <Row label="Order ID" value={details?.paypal_order_id?.slice(0, 12).toUpperCase() || 'TX-PENDING'} />
                                ) : details?.payment_method === 'credit_balance' ? (
                                    <Row label="Ref ID" value={`INT-${(details?.invoice_id || '').slice(0, 8).toUpperCase()}`} />
                                ) : null}

                                <Row label="Invoice" value={details?.invoice_no || 'Pending'} />

                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-3">
                                    {details?.payment_method === 'paypal' ? 'Payment secured via PayPal' :
                                        details?.payment_method === 'credit_balance' ? 'Internal Account Transfer' :
                                            'Payment Processed Successfully'}
                                </p>
                            </div>
                        </Section>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full flex items-center justify-between pt-6 border-t border-border">
                    <button
                        onClick={() => navigate(details?.invoice_id ? `/billing/invoices/${details.invoice_id}` : '/billing?tab=invoices')}
                        className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        View Invoice
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-8 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                    >
                        Go to Console
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-10 text-center text-[11px] text-muted-foreground/60 leading-relaxed uppercase tracking-widest">
                    A confirmation has been sent to your email.
                    <br />
                    Transactions processed securely by Scrapi & PayPal.
                </div>
            </main>
        </div>
    );
};

export default PaymentSuccess;
