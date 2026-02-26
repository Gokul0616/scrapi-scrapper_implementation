import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, CreditCard, Package, User, FileText, Loader2, ExternalLink, Building2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import CheckoutSummary from './CheckoutSummary';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

// ── PayPal P logo ─────────────────────────────────────────────────────────────
const PayPalP = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none">
        <path d="M7.5 21H4l1.5-9h5C13.5 12 15 13.5 14 16c0 0-1 5-6.5 5z" fill="#003087" />
        <path d="M10 16H6.5l1-6h5C15 10 16 11.5 15.5 13.5 15 15.5 13 16 10 16z" fill="#009CDE" />
        <path d="M13.5 13.5H10l.5-3h4.5C16 10.5 16.5 12 15.5 13.5z" fill="#012169" />
    </svg>
);

// ── Card brand detection + dynamic badge ──────────────────────────────────────
const detectBrand = (number = '') => {
    const n = number.replace(/\D/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    if (/^6/.test(n)) return 'discover';
    return 'unknown';
};
const BRAND_META = {
    visa: { label: 'VISA', color: '#1A1F71' },
    mastercard: { label: 'MC', color: '#252525' },
    amex: { label: 'AMEX', color: '#2E77BC' },
    discover: { label: 'DISC', color: '#F76F20' },
    unknown: { label: 'CARD', color: '#6B7280' },
};
const CardBrandBadge = ({ number }) => {
    const brand = detectBrand(number || '');
    const { label, color } = BRAND_META[brand];
    return (
        <svg viewBox="0 0 48 30" className="w-10 h-6 rounded flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="30" rx="4" fill={color} />
            <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle"
                fontFamily="Arial" fontWeight="bold" fontSize="10" fill="white">{label}</text>
        </svg>
    );
};


// ── Section card ─────────────────────────────────────────────────────────────
const Section = ({ icon: Icon, label, children }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

const Row = ({ label, value, highlight }) => (
    <div className="flex items-center justify-between py-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold ${highlight ? 'text-blue-600' : 'text-foreground'}`}>{value}</span>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const ReviewStep = ({
    onNext, onBack,
    selectedPlan, isAnnual, setIsAnnual,
    billingDetails = {},
    paymentMethod = 'card',
    paymentCard = {},
    addons = {},
    addonCost = 0,
    configs,
}) => {
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspace();
    const [confirming, setConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const isOrg = currentWorkspace?.workspace_type === 'organization';
    const workspaceName = currentWorkspace?.workspace_name || user?.username || 'Your account';
    const roleLabel = currentWorkspace?.role
        ? currentWorkspace.role.charAt(0).toUpperCase() + currentWorkspace.role.slice(1)
        : null;
    const avatarChar = workspaceName.charAt(0).toUpperCase();

    const planData = configs.plans[selectedPlan] || { name: selectedPlan, price: 0, features: [] };
    const planName = planData.name || (selectedPlan ? selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1) : '—');
    const basePrice = planData.price ?? 0;
    const price = isAnnual ? Math.round(basePrice * 0.9) : basePrice;
    const features = planData.features ?? [];

    // Extract last 4 from raw digits or masked restored number (e.g. "•••• •••• •••• 4242")
    const rawNum = (paymentCard.number || '').replace(/[\s•]/g, '');
    const last4 = rawNum.length >= 4 ? rawNum.slice(-4) : null;
    const expiryDisplay = paymentCard.expiry || paymentCard.expiryDisplay || '';

    const totalAmount = price + addonCost;

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // ── Handle PayPal flow ───────────────────────────────────────
            if (paymentMethod === 'paypal') {
                // Save current state for capture on return
                const checkoutState = {
                    plan: selectedPlan,
                    is_annual: isAnnual,
                    addons,
                    billing_details: billingDetails,
                    workspace_id: currentWorkspace?.workspace_id,
                    workspace_type: currentWorkspace?.workspace_type
                };
                localStorage.setItem('scrapi_paypal_checkout_state', JSON.stringify(checkoutState));

                const res = await axios.post(`${API}/billing/paypal/create-order`, {
                    amount: totalAmount
                }, { headers });

                if (res.data && res.data.approval_url) {
                    window.location.href = res.data.approval_url;
                    return; // Stop here, redirecting
                }
            }

            // ── Handle Card / Default flow ───────────────────────────────
            await axios.post(`${API}/billing/subscription`, {
                plan: selectedPlan,
                is_annual: isAnnual,
                payment_method: paymentMethod,
                card_last4: last4 || null,
                card_expiry: paymentCard.expiry || null,
                billing_full_name: billingDetails.fullName || null,
                billing_company: billingDetails.company || null,
                billing_street_address: billingDetails.streetAddress || null,
                billing_city: billingDetails.city || null,
                billing_postal_code: billingDetails.postalCode || null,
                billing_country: billingDetails.country || null,
                workspace_id: currentWorkspace?.workspace_id || null,
                workspace_type: currentWorkspace?.workspace_type || null,
            }, { headers });
        } catch (err) {
            console.error("Confirmation error:", err);
            // In a real app, show an error toast here
        }

        // Simulate processing delay
        await new Promise(r => setTimeout(r, 800));
        setConfirming(false);
        setConfirmed(true);
        setTimeout(() => onNext(), 900);
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col lg:flex-row lg:gap-8 max-w-5xl mx-auto px-6 py-8 w-full">

                    {/* ── LEFT: Review details ───────────────────────────── */}
                    <div className="flex-1 min-w-0 space-y-5">

                        <div>
                            <h2 className="text-xl font-semibold text-foreground">Review your order</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Please review everything before confirming your subscription.
                            </p>
                        </div>

                        {/* Plan */}
                        <Section icon={Package} label="Plan">
                            <div className="space-y-0.5">
                                <Row label="Plan" value={planName} />
                                <Row label="Billing cycle" value={isAnnual ? 'Annual (10% off)' : 'Monthly'} />
                                <Row label="Price" value={`$${price}.00 / month`} highlight />
                                {features.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                                        {features.map(f => (
                                            <div key={f} className="flex items-center gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                                <span className="text-xs text-muted-foreground">{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Selected add-ons */}
                                {Object.entries(addons).some(([, q]) => q > 0) && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add-ons</p>
                                        <div className="space-y-1.5">
                                            {Object.entries(addons)
                                                .filter(([, qty]) => qty > 0)
                                                .map(([id, qty]) => {
                                                    const addonInfo = configs.addons[id] || {};
                                                    const label = addonInfo.label || id;
                                                    const pricePer = addonInfo.price || 0;
                                                    const unit = addonInfo.unit;
                                                    return (
                                                        <div key={id} className="flex items-center justify-between">
                                                            <span className="text-xs text-muted-foreground">
                                                                {label}
                                                                {unit ? ` (${qty} ${unit}${qty > 1 ? 's' : ''})` : ''}
                                                            </span>
                                                            <span className="text-xs font-semibold text-foreground">
                                                                +${qty * pricePer}.00
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* Account */}
                        <Section icon={isOrg ? Building2 : User} label="Account">
                            <div className="flex items-start gap-3">
                                {/* Avatar icon */}
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isOrg
                                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                    {isOrg
                                        ? <Building2 className="w-5 h-5" />
                                        : <User className="w-5 h-5" />
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Name + badge */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-foreground truncate">{workspaceName}</p>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isOrg
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            }`}>
                                            {isOrg ? 'Organisation' : 'Personal'}
                                        </span>
                                    </div>

                                    {/* Email */}
                                    {user?.email && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                                    )}

                                    {/* Role (only for orgs) */}
                                    {isOrg && roleLabel && (
                                        <p className="text-xs text-muted-foreground mt-0.5">Role: <span className="font-medium text-foreground">{roleLabel}</span></p>
                                    )}
                                </div>
                            </div>
                        </Section>

                        {/* Billing details */}
                        {billingDetails?.fullName && (
                            <Section icon={FileText} label="Billing details">
                                <div className="space-y-0.5">
                                    {billingDetails.fullName && <Row label="Name" value={billingDetails.fullName} />}
                                    {billingDetails.company && <Row label="Company" value={billingDetails.company} />}
                                    {billingDetails.streetAddress && <Row label="Address" value={billingDetails.streetAddress} />}
                                    {(billingDetails.city || billingDetails.postalCode) && (
                                        <Row label="City / ZIP" value={[billingDetails.city, billingDetails.postalCode].filter(Boolean).join(', ')} />
                                    )}
                                    {billingDetails.country && <Row label="Country" value={billingDetails.country} />}
                                </div>
                            </Section>
                        )}

                        {/* Payment method */}
                        <Section icon={CreditCard} label="Payment method">
                            {paymentMethod === 'paypal' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <PayPalP />
                                        <span className="text-sm font-medium text-foreground">PayPal</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                        After submission, you will be redirected to securely complete next steps.
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <CardBrandBadge number={paymentCard.number} />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground font-mono tracking-wider">
                                            {last4 ? `•••• •••• •••• ${last4}` : 'Card on file'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {paymentCard.cardType && (
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    {paymentCard.cardType} card
                                                </span>
                                            )}
                                            {expiryDisplay && (
                                                <span className="text-xs text-muted-foreground">
                                                    {paymentCard.cardType ? '·' : ''} Expires {expiryDisplay}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* Legal */}
                        <p className="text-xs text-muted-foreground leading-relaxed px-1">
                            By confirming, you agree to our{' '}
                            <a href="/legal/terms" className="text-blue-500 hover:underline">Terms of Service</a>
                            {' '}and{' '}
                            <a href="/legal/privacy" className="text-blue-500 hover:underline">Privacy Policy</a>.
                            Your subscription will renew automatically unless cancelled.
                        </p>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                            <button
                                onClick={onBack}
                                disabled={confirming}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous step
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={confirming || confirmed}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${confirmed
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-70'
                                    }`}
                            >
                                {confirmed ? (
                                    <><CheckCircle2 className="w-4 h-4" />Confirmed!</>
                                ) : confirming ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Confirming…</>
                                ) : (
                                    'Confirm subscription'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT: Summary sidebar ─────────────────────────── */}
                    <div className="w-full lg:w-80 flex-shrink-0 mt-8 lg:mt-0">
                        <div className="lg:sticky lg:top-4">
                            <CheckoutSummary user={user} selectedPlan={selectedPlan} isAnnual={isAnnual} setIsAnnual={setIsAnnual} addonCost={addonCost} addons={addons} configs={configs} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewStep;
