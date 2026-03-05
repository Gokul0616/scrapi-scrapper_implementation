import React, { useState, useRef } from 'react';
import { ChevronLeft, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CheckoutSummary from './CheckoutSummary';

const METHODS = { CARD: 'card', PAYPAL: 'paypal' };

// ─── Card brand logos ─────────────────────────────────────────────────────────
const CardLogos = () => (
    <div className="flex items-center gap-1">
        <svg viewBox="0 0 48 32" className="w-8 h-5 rounded" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="32" rx="4" fill="#1A1F71" />
            <text x="6" y="22" fontFamily="Arial" fontWeight="bold" fontSize="13" fill="white">VISA</text>
        </svg>
        <svg viewBox="0 0 48 32" className="w-8 h-5 rounded" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="32" rx="4" fill="#252525" />
            <circle cx="19" cy="16" r="9" fill="#EB001B" />
            <circle cx="29" cy="16" r="9" fill="#F79E1B" />
            <path d="M24 9.5a9 9 0 0 1 0 13A9 9 0 0 1 24 9.5z" fill="#FF5F00" />
        </svg>
        <svg viewBox="0 0 48 32" className="w-8 h-5 rounded" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="32" rx="4" fill="#2E77BC" />
            <text x="5" y="20" fontFamily="Arial" fontWeight="bold" fontSize="9" fill="white">AMEX</text>
        </svg>
        <svg viewBox="0 0 48 32" className="w-8 h-5 rounded" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="32" rx="4" fill="#F76F20" />
            <circle cx="30" cy="16" r="9" fill="#FFCB05" />
            <text x="4" y="14" fontFamily="Arial" fontWeight="bold" fontSize="7" fill="white">DIS</text>
            <text x="4" y="23" fontFamily="Arial" fontWeight="bold" fontSize="7" fill="white">COVER</text>
        </svg>
    </div>
);

// ─── PayPal logo ──────────────────────────────────────────────────────────────
const PayPalP = ({ size = 'sm' }) => {
    const s = size === 'lg' ? 'w-10 h-10' : 'w-4 h-4';
    return (
        <svg viewBox="0 0 24 24" className={s} xmlns="http://www.w3.org/2000/svg" fill="none">
            <path d="M7.5 21H4l1.5-9h5C13.5 12 15 13.5 14 16c0 0-1 5-6.5 5z" fill="#003087" />
            <path d="M10 16H6.5l1-6h5C15 10 16 11.5 15.5 13.5 15 15.5 13 16 10 16z" fill="#009CDE" />
            <path d="M13.5 13.5H10l.5-3h4.5C16 10.5 16.5 12 15.5 13.5z" fill="#012169" />
        </svg>
    );
};

// ─── CVC icon ─────────────────────────────────────────────────────────────────
const CvcIcon = () => (
    <svg viewBox="0 0 38 24" className="w-8 h-5 text-muted-foreground" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="37" height="23" rx="3.5" fill="currentColor" opacity="0.1" stroke="currentColor" strokeOpacity="0.3" />
        <rect y="5" width="38" height="6" fill="currentColor" opacity="0.3" />
        <rect x="6" y="16" width="16" height="3" rx="1" fill="currentColor" opacity="0.2" />
        <rect x="26" y="15" width="8" height="5" rx="1" fill="currentColor" opacity="0.5" />
        <text x="28" y="20" fontFamily="monospace" fontSize="4" fill="currentColor" opacity="0.9">123</text>
    </svg>
);

// ─── Radio indicator ──────────────────────────────────────────────────────────
const Radio = ({ checked }) => (
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'border-blue-600' : 'border-border'}`}>
        {checked && <div className="w-2 h-2 rounded-full bg-blue-600" />}
    </div>
);

// ─── Card icon ────────────────────────────────────────────────────────────────
const CardIcon = ({ active }) => (
    <svg viewBox="0 0 24 18" className={`w-6 h-[18px] ${active ? 'text-blue-600' : 'text-muted-foreground'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="23" height="17" rx="2.5" stroke="currentColor" />
        <rect y="4" width="24" height="4" fill="currentColor" opacity="0.3" />
        <rect x="2" y="12" width="6" height="2" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
);

// ─── Formatters ───────────────────────────────────────────────────────────────
const formatCardNumber = (v) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

/**
 * Stripe-style expiry formatter + auto-advance.
 * Returns { display, digits } where digits is the raw "MMYY" string.
 */
const processExpiryInput = (raw, prevRaw) => {
    // Strip everything except digits
    const digits = raw.replace(/\D/g, '').slice(0, 4);

    // If user is deleting and we had "MM / " → remove trailing slash gracefully
    if (digits.length === 0) return { display: '', digits: '' };

    // Smart month correction: first digit >1 → prepend 0 (e.g. "3" → "03")
    let mm = digits.slice(0, 2);
    const yy = digits.slice(2);

    if (mm.length === 1 && parseInt(mm, 10) > 1) {
        mm = '0' + mm;
    }

    // Combine back
    const combined = mm + yy;
    if (combined.length <= 2) {
        return { display: mm, digits: combined };
    }
    return { display: `${mm} / ${yy}`, digits: combined };
};

/**
 * Stripe-grade expiry validation.
 * Returns null if valid, error string if not.
 */
const validateExpiry = (digits) => {
    if (!digits || digits.length < 4) return 'Incomplete expiry date';

    const mm = parseInt(digits.slice(0, 2), 10);
    const yy = parseInt(digits.slice(2, 4), 10);

    if (mm < 1 || mm > 12) return 'Invalid month';

    const now = new Date();
    const curYear = now.getFullYear() % 100;   // e.g. 25 for 2025
    const curMonth = now.getMonth() + 1;         // 1–12
    const maxYear = curYear + 12;               // cap ~12 years out

    if (yy < curYear) return "Your card's expiry year is in the past";
    if (yy > maxYear) return `Expiry year must be ${2000 + curYear}–${2000 + maxYear}`;
    if (yy === curYear && mm < curMonth) return "Your card's expiry date is in the past";

    return null; // valid
};

// ─────────────────────────────────────────────────────────────────────────────
const PaymentStep = ({
    onNext, onBack,
    selectedPlan, isAnnual, setIsAnnual,
    paymentMethod, setPaymentMethod,
    paymentCard, setPaymentCard,
    addonCost = 0,
    addons = {},
    configs,
}) => {
    const { user } = useAuth();
    const [cvc, setCvc] = useState('');
    const [expiryError, setExpiryError] = useState('');
    const [cardError, setCardError] = useState('');
    const expiryRef = useRef(null);

    // Credit or Debit selection
    const cardType = paymentCard?.cardType || 'credit';
    const setCardType = (t) => setPaymentCard(p => ({ ...p, cardType: t, isRestored: false }));

    const method = paymentMethod;
    const setMethod = setPaymentMethod;

    // If card was restored from backend (isRestored flag), treat as pre-filled
    const isRestored = !!paymentCard?.isRestored;
    const cardNumber = paymentCard?.number || '';
    const expiryDisplay = paymentCard?.expiryDisplay || '';
    const expiryDigits = paymentCard?.expiryDigits || '';

    const setCardNumber = (v) => setPaymentCard(p => ({ ...p, number: v, isRestored: false }));
    const setExpiry = ({ display, digits }) =>
        setPaymentCard(p => ({ ...p, expiryDisplay: display, expiryDigits: digits, expiry: display, isRestored: false }));

    // ── Validation checks ─────────────────────────────────────────────────────
    const cardDigits = cardNumber.replace(/\s/g, '').replace(/•/g, '');
    const cardNumberComplete = isRestored
        ? true  // restored masked number — trust it
        : cardDigits.length === 16;

    const expiryValid = isRestored
        ? true  // restored expiry — trust it
        : validateExpiry(expiryDigits) === null;

    const cvcComplete = isRestored
        ? true  // CVC not stored for security — bypass
        : cvc.length >= 3;

    const cardComplete = cardNumberComplete && expiryValid && cvcComplete;
    // Disabling card payment progression temporarily
    const canContinue = method === METHODS.PAYPAL;

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleCardNumberChange = (e) => {
        const formatted = formatCardNumber(e.target.value);
        setCardNumber(formatted);
        if (cardError) setCardError('');
    };

    const handleExpiryChange = (e) => {
        const raw = e.target.value;
        const result = processExpiryInput(raw, expiryDisplay);
        setExpiry(result);

        // Clear error while typing
        if (expiryError) setExpiryError('');
    };

    const handleExpiryBlur = () => {
        if (!expiryDigits) return;
        const err = validateExpiry(expiryDigits);
        setExpiryError(err || '');
    };

    const handleCardNumberBlur = () => {
        if (!isRestored && cardDigits.length > 0 && cardDigits.length < 16) {
            setCardError('Card number is incomplete');
        }
    };

    const handleNext = () => {
        if (method === METHODS.CARD && !isRestored) {
            // Run full validation on submit attempt
            let hasError = false;
            if (!cardNumberComplete) { setCardError('Card number is incomplete'); hasError = true; }
            const expErr = validateExpiry(expiryDigits);
            if (expErr) { setExpiryError(expErr); hasError = true; }
            if (hasError) return;
        }
        // Persist expiry in the shared paymentCard state as display string
        setPaymentCard(p => ({ ...p, expiry: expiryDisplay }));
        onNext();
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const baseInput = 'w-full px-3 py-2.5 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors';
    const okInput = `${baseInput} border-border focus:ring-blue-500/40 focus:border-blue-500`;
    const errInput = `${baseInput} border-red-400 bg-red-50 dark:bg-red-950/20 focus:ring-red-400/30 focus:border-red-400`;

    const FieldError = ({ msg }) => msg
        ? <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />{msg}
        </p>
        : null;

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col lg:flex-row lg:gap-8 max-w-5xl mx-auto px-6 py-8 w-full">

                    {/* ── LEFT ─────────────────────────────────────────────── */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-foreground mb-5">Payment method</h2>

                        <div className="rounded-xl border border-border overflow-hidden">

                            {/* Card option */}
                            <div
                                className={`flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer hover:bg-muted/50 ${method === METHODS.CARD ? 'bg-blue-600/5' : ''}`}
                                onClick={() => setMethod(METHODS.CARD)}
                            >
                                <Radio checked={method === METHODS.CARD} />
                                <CardIcon active={method === METHODS.CARD} />
                                <span className={`text-sm font-medium transition-colors ${method === METHODS.CARD ? 'text-blue-600' : 'text-foreground'}`}>Card</span>
                            </div>

                            <div className={`grid transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${method === METHODS.CARD ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="border-t border-border px-4 py-5 space-y-4 bg-muted/20 dark:bg-muted/10">

                                        {/* ── Temporary Card Unavailability Notice ── */}
                                        <div className="rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-50 to-red-50/50 dark:border-rose-500/20 dark:from-rose-500/10 dark:to-red-500/5 p-3 shadow-sm mx-1">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-rose-100 dark:bg-rose-500/20 p-1.5 rounded-full text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200/50 dark:border-rose-500/30">
                                                    <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                </div>
                                                <div className="flex-1 pt-0.5">
                                                    <h4 className="text-[13px] font-semibold text-rose-900 dark:text-rose-200 tracking-tight">Card processing temporarily paused</h4>
                                                    <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-1 leading-relaxed">
                                                        We are optimizing our secure payment gateways. Please use <button type="button" onClick={() => setMethod(METHODS.PAYPAL)} className="font-semibold underline decoration-rose-300 hover:decoration-rose-500 dark:decoration-rose-600 dark:hover:decoration-rose-400 underline-offset-4 hover:text-rose-950 dark:hover:text-rose-100 transition-all">PayPal</button> to complete your checkout today (Credit & Debit cards are fully supported).
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Credit / Debit toggle ──────────── */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Card type</label>
                                            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
                                                {['credit', 'debit'].map(type => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setCardType(type); }}
                                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${cardType === type
                                                            ? 'bg-background text-foreground shadow-sm border border-border'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                            }`}
                                                    >
                                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Card number */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1.5">{cardType === 'credit' ? 'Credit card number' : 'Debit card number'}</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="1234 1234 1234 1234"
                                                    value={cardNumber}
                                                    onChange={handleCardNumberChange}
                                                    onBlur={handleCardNumberBlur}
                                                    className={`${cardError ? errInput : okInput} pr-36`}
                                                    maxLength={19}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <CardLogos />
                                                </div>
                                            </div>
                                            <FieldError msg={cardError} />
                                        </div>

                                        {/* Expiry + CVC */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1.5">Expiration date</label>
                                                <input
                                                    ref={expiryRef}
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="MM / YY"
                                                    value={expiryDisplay}
                                                    onChange={handleExpiryChange}
                                                    onBlur={handleExpiryBlur}
                                                    className={expiryError ? errInput : okInput}
                                                    maxLength={7}
                                                />
                                                <FieldError msg={expiryError} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1.5">Security code</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="CVC"
                                                        maxLength={4}
                                                        value={isRestored ? '•••' : cvc}
                                                        readOnly={isRestored}
                                                        onChange={e => !isRestored && setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                        className={`${okInput} pr-12`}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <CvcIcon />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            By providing your card information, you allow Scrapi to charge your card for future payments in accordance with their terms.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border" />

                            {/* PayPal option */}
                            {/* PayPal option */}
                            <div className="rounded-b-xl border-t-0 overflow-hidden">
                                <div
                                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer hover:bg-muted/50 ${method === METHODS.PAYPAL ? 'bg-blue-600/5' : ''}`}
                                    onClick={() => setMethod(METHODS.PAYPAL)}
                                >
                                    <Radio checked={method === METHODS.PAYPAL} />
                                    <PayPalP size="sm" />
                                    <span className={`text-sm font-medium transition-colors ${method === METHODS.PAYPAL ? 'text-blue-600' : 'text-foreground'}`}>PayPal</span>
                                </div>

                                <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${method === METHODS.PAYPAL ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="border-t border-border px-4 py-5 space-y-4 bg-muted/20 dark:bg-muted/10">
                                            <div className="rounded-lg border border-border bg-background p-4 space-y-4">
                                                <div>
                                                    <PayPalP size="lg" />
                                                    <p className="text-sm font-medium text-foreground mt-2">PayPal selected.</p>
                                                </div>
                                                <div className="border-t border-border pt-3 flex items-center gap-2.5">
                                                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                    <p className="text-xs text-muted-foreground">
                                                        After submission, you will be redirected to securely complete next steps.
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                By confirming your payment with PayPal, you allow Scrapi to charge your PayPal account for future payments in accordance with their terms.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between mt-6">
                            <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                                Previous step
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!canContinue}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${canContinue ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                            >
                                Save &amp; Continue
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

export default PaymentStep;
