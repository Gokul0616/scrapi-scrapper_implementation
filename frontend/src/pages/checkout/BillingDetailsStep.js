import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, HelpCircle, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import CustomTooltip from '../../components/CustomTooltip';
import CheckoutSummary from './CheckoutSummary';
import GlobalModal from '../../components/GlobalModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

// ─── Country list ─────────────────────────────────────────────────────────────
const COUNTRIES = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua & Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia & Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts & Nevis', 'Saint Lucia', 'Samoa', 'San Marino', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad & Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'];

// ─── Key mapping helpers ──────────────────────────────────────────────────────
const fromBackend = (d) => ({
    fullName: d.full_name || '',
    company: d.company || '',
    taxId: d.tax_id || '',
    registrationNo: d.registration_no || '',
    billingContact: d.billing_contact || '',
    streetAddress: d.street_address || '',
    city: d.city || '',
    postalCode: d.postal_code || '',
    country: d.country || 'India',
    billingEmail: d.billing_email || '',
    customAddressText: d.custom_address_text || '',
    customGoodsText: d.custom_goods_text || '',
});

const toBackend = (d) => ({
    full_name: d.fullName || null,
    company: d.company || null,
    tax_id: d.taxId || null,
    registration_no: d.registrationNo || null,
    billing_contact: d.billingContact || null,
    street_address: d.streetAddress || null,
    city: d.city || null,
    postal_code: d.postalCode || null,
    country: d.country || null,
    billing_email: d.billingEmail || null,
    custom_address_text: d.customAddressText || null,
    custom_goods_text: d.customGoodsText || null,
});

const detailsChanged = (current, saved) => {
    if (!saved) return false;
    const keys = ['fullName', 'company', 'taxId', 'registrationNo', 'billingContact',
        'streetAddress', 'city', 'postalCode', 'country',
        'billingEmail', 'customAddressText', 'customGoodsText'];
    return keys.some(k => (current[k] || '') !== (saved[k] || ''));
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BillingDetailsStep = ({
    onNext, onBack,
    selectedPlan, isAnnual, setIsAnnual,
    billingDetails, setBillingDetails,
    addonCost = 0,
    addons = {},
    configs,
}) => {
    const { user } = useAuth();
    const { openModal, closeModal } = useModal();
    const { currentWorkspace } = useWorkspace();
    const isOrg = currentWorkspace?.workspace_type === 'organization';

    const [invoicingOpen, setInvoicingOpen] = useState(false);
    const [errors, setErrors] = useState({});
    const [savedDetails, setSavedDetails] = useState(null);  // what's on backend
    const [saveChecked, setSaveChecked] = useState(true);  // "save for next time" checkbox
    const [saving, setSaving] = useState(false);

    // Track whether we already loaded+filled data this checkout mount
    const filledRef = useRef(false);

    // ── On mount: fetch profile + silently pre-fill saved details (scoped per workspace) ──
    useEffect(() => {
        if (filledRef.current) return; // already ran this checkout session
        filledRef.current = true;

        const init = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                const wsId = currentWorkspace?.workspace_id;
                const wsType = currentWorkspace?.workspace_type;

                // 1. Profile name + saved billing details (parallel)
                const [profileRes, detailsRes] = await Promise.all([
                    axios.get(`${API}/settings/profile`, { headers }),
                    axios.get(`${API}/billing/details`, {
                        headers,
                        params: wsId ? { workspace_id: wsId, workspace_type: wsType } : {},
                    }),
                ]);

                const p = profileRes.data;
                const profileName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || '';

                const saved = detailsRes.data;
                const hasSaved = saved && Object.keys(saved).length > 0;

                if (hasSaved) {
                    // ── Silent pre-fill (Stripe/Apify style — no banner) ──
                    const mapped = fromBackend(saved);
                    setSavedDetails(mapped);
                    setBillingDetails(prev => ({
                        ...mapped,
                        // Keep any in-progress edits from earlier in the session
                        ...Object.fromEntries(
                            Object.entries(prev).filter(([, v]) => v && v.toString().trim())
                        ),
                    }));
                } else {
                    // No saved data — auto-fill from workspace / profile
                    const orgName = currentWorkspace?.workspace_name || '';
                    setBillingDetails(prev => ({
                        ...prev,
                        fullName: prev.fullName || (isOrg ? orgName : profileName),
                        company: prev.company || (isOrg ? orgName : ''),
                        country: prev.country || 'India',
                    }));
                }
            } catch (_) {
                // Non-fatal — continue with defaults
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (field, value) => {
        setBillingDetails(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = () => {
        const e = {};
        if (!billingDetails.fullName?.trim()) e.fullName = isOrg ? 'Organisation name is required' : 'Full name is required';
        if (!billingDetails.streetAddress?.trim()) e.streetAddress = 'Street address is required';
        if (!billingDetails.city?.trim()) e.city = 'City is required';
        if (!billingDetails.postalCode?.trim()) e.postalCode = 'Postal code / ZIP is required';
        if (!billingDetails.country?.trim()) e.country = 'Country is required';
        // Org-required
        if (isOrg && !billingDetails.company?.trim()) e.company = 'Company name is required for organisations';
        if (isOrg && !billingDetails.taxId?.trim()) e.taxId = 'Tax ID is required for organisations';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Save to backend ───────────────────────────────────────────────────────
    const saveToBackend = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API}/billing/details`, {
                ...toBackend(billingDetails),
                workspace_id: currentWorkspace?.workspace_id || null,
                workspace_type: currentWorkspace?.workspace_type || null,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSavedDetails({ ...billingDetails });
        } catch (_) { /* Non-critical */ }
        finally { setSaving(false); }
    };

    // ── Save & Continue flow ────────────────────────────────────────────────
    const handleNext = () => {
        if (!validate()) return;

        const hasChanges = detailsChanged(billingDetails, savedDetails);
        const isExisting = savedDetails !== null;

        // If checkbox off and no saved data → just proceed
        if (!saveChecked && !isExisting) { onNext(); return; }

        // If checkbox off and existing → just proceed (don't update)
        if (!saveChecked && isExisting) { onNext(); return; }

        // Checkbox on + values changed from what's saved → show update modal
        if (saveChecked && isExisting && hasChanges) {
            openModal('billing-update-confirm');
            return;
        }

        // Checkbox on + new data (no existing) → save silently and proceed
        if (saveChecked && !isExisting) {
            saveToBackend().then(onNext);
            return;
        }

        // Checkbox on + no changes → just proceed
        onNext();
    };

    const handleUpdateConfirm = async () => {
        closeModal();
        await saveToBackend();
        onNext();
    };

    const handleUpdateSkip = () => {
        closeModal();
        onNext();
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const baseInput = 'w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors';
    const okInput = `${baseInput} border-border focus:ring-blue-500/40 focus:border-blue-500`;
    const errInput = `${baseInput} border-red-400 bg-red-50 dark:bg-red-950/20 focus:ring-red-400/30 focus:border-red-400`;
    const lbl = 'block text-sm font-medium text-foreground mb-1.5';

    const inp = (f) => errors[f] ? errInput : okInput;
    const FieldError = ({ field }) => errors[field]
        ? <p className="mt-1 text-xs text-red-500">{errors[field]}</p>
        : null;

    return (
        <>
            <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col lg:flex-row lg:gap-8 max-w-5xl mx-auto px-6 py-8 w-full">

                        {/* ── LEFT: Form ──────────────────────────────────── */}
                        <div className="flex-1 min-w-0 space-y-5">

                            {/* Full name / Org name */}
                            <div>
                                <label className={lbl}>
                                    {isOrg ? 'Organisation name' : 'Full name'}
                                    {isOrg && <span className="ml-1 text-xs text-blue-500 font-normal">(auto-filled)</span>}
                                </label>
                                <input
                                    type="text"
                                    value={billingDetails.fullName || ''}
                                    onChange={e => handleChange('fullName', e.target.value)}
                                    placeholder={isOrg ? 'Organisation legal name' : 'Your full name'}
                                    className={inp('fullName')}
                                />
                                <FieldError field="fullName" />
                            </div>

                            {/* Company + Tax ID */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>
                                        Company name
                                        {!isOrg && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
                                    </label>
                                    <input type="text" value={billingDetails.company || ''} onChange={e => handleChange('company', e.target.value)} className={inp('company')} placeholder={isOrg ? 'Registered company name' : ''} />
                                    <FieldError field="company" />
                                </div>
                                <div>
                                    <label className={`${lbl} flex items-center gap-1.5`}>
                                        Tax ID
                                        {!isOrg && <span className="text-muted-foreground font-normal">(optional)</span>}
                                        <CustomTooltip content="GST, VAT ID, or equivalent tax identification number">
                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                                        </CustomTooltip>
                                    </label>
                                    <input type="text" value={billingDetails.taxId || ''} onChange={e => handleChange('taxId', e.target.value)} className={inp('taxId')} placeholder={isOrg ? 'e.g. GST12345678' : ''} />
                                    <FieldError field="taxId" />
                                </div>
                            </div>

                            {/* Org-only: Registration number */}
                            {isOrg && (
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className={`${lbl} flex items-center gap-1.5`}>
                                            Company reg. no.
                                            <span className="text-muted-foreground font-normal">(optional)</span>
                                            <CustomTooltip content="Company registration / incorporation number">
                                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                                            </CustomTooltip>
                                        </label>
                                        <input type="text" value={billingDetails.registrationNo || ''} onChange={e => handleChange('registrationNo', e.target.value)} className={okInput} placeholder="e.g. 12345678" />
                                    </div>
                                </div>
                            )}

                            {/* Org-only: Billing contact person */}
                            {isOrg && (
                                <div>
                                    <label className={`${lbl} flex items-center gap-1.5`}>
                                        Billing contact person
                                        <span className="text-muted-foreground font-normal">(optional)</span>
                                        <CustomTooltip content="Name of the person responsible for billing queries">
                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                                        </CustomTooltip>
                                    </label>
                                    <input type="text" value={billingDetails.billingContact || ''} onChange={e => handleChange('billingContact', e.target.value)} className={okInput} placeholder="e.g. Jane Smith, Finance Team" />
                                </div>
                            )}

                            {/* Street address */}
                            <div>
                                <label className={lbl}>Street address</label>
                                <input type="text" value={billingDetails.streetAddress || ''} onChange={e => handleChange('streetAddress', e.target.value)} className={inp('streetAddress')} />
                                <FieldError field="streetAddress" />
                            </div>

                            {/* City + Postal */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>City</label>
                                    <input type="text" value={billingDetails.city || ''} onChange={e => handleChange('city', e.target.value)} className={inp('city')} />
                                    <FieldError field="city" />
                                </div>
                                <div>
                                    <label className={lbl}>Postal code / ZIP</label>
                                    <input type="text" value={billingDetails.postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} className={inp('postalCode')} />
                                    <FieldError field="postalCode" />
                                </div>
                            </div>

                            {/* Country */}
                            <div>
                                <label className={lbl}>Country</label>
                                <select value={billingDetails.country || 'India'} onChange={e => handleChange('country', e.target.value)} className={inp('country')}>
                                    <option value="">Select country…</option>
                                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <FieldError field="country" />
                            </div>

                            {/* Customize invoicing */}
                            <div>
                                <button type="button" onClick={() => setInvoicingOpen(v => !v)} className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                                    Customize invoicing details
                                    {invoicingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {invoicingOpen && (
                                    <div className="mt-4 space-y-4 pl-1">
                                        <div>
                                            <label className={`${lbl} flex items-center gap-1.5`}>
                                                Billing email <span className="text-muted-foreground font-normal">(optional)</span>
                                                <CustomTooltip content="Invoices will be sent to this email">
                                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                                                </CustomTooltip>
                                            </label>
                                            <input type="email" value={billingDetails.billingEmail || ''} onChange={e => handleChange('billingEmail', e.target.value)} className={okInput} />
                                        </div>
                                        <div>
                                            <label className={`${lbl} flex items-center gap-1.5`}>
                                                Custom address text <span className="text-muted-foreground font-normal">(optional)</span>
                                                <CustomTooltip content="Additional address shown on invoices">
                                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                                                </CustomTooltip>
                                            </label>
                                            <input type="text" value={billingDetails.customAddressText || ''} onChange={e => handleChange('customAddressText', e.target.value)} className={okInput} />
                                        </div>
                                        <div>
                                            <label className={`${lbl} flex items-center gap-1.5`}>
                                                Custom goods text <span className="text-muted-foreground font-normal">(optional)</span>
                                                <CustomTooltip content="Goods/services description on invoices">
                                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                                                </CustomTooltip>
                                            </label>
                                            <textarea rows={3} value={billingDetails.customGoodsText || ''} onChange={e => handleChange('customGoodsText', e.target.value)} className={`${okInput} resize-none`} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Save for next time (Stripe-style checkbox) ─ */}
                            <label className="flex items-start gap-3 cursor-pointer group select-none py-1">
                                <div className="relative flex-shrink-0 mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={saveChecked}
                                        onChange={e => setSaveChecked(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-4 h-4 rounded border-2 border-border peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-colors flex items-center justify-center">
                                        {saveChecked && (
                                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 9" fill="none">
                                                <path d="M1 4.5L4.5 8L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-foreground">
                                        {savedDetails ? 'Update saved billing details' : 'Save billing details for future use'}
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {savedDetails
                                            ? 'Your account has saved billing details — update them with your current entries.'
                                            : 'Skip re-entering this information on your next subscription or upgrade.'}
                                    </p>
                                </div>
                            </label>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-1 border-t border-border">
                                <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous step
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="px-6 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                >
                                    Save &amp; Continue
                                </button>
                            </div>

                            {/* Security note */}
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                                Your billing information is encrypted and stored securely.
                            </p>
                        </div>

                        {/* ── RIGHT: Summary sidebar ────────────────────── */}
                        <div className="w-full lg:w-80 flex-shrink-0 mt-8 lg:mt-0">
                            <div className="lg:sticky lg:top-4">
                                <CheckoutSummary user={user} selectedPlan={selectedPlan} isAnnual={isAnnual} setIsAnnual={setIsAnnual} addonCost={addonCost} addons={addons} configs={configs} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Update confirmation modal (only when values changed) ─────── */}
            <GlobalModal
                modalId="billing-update-confirm"
                size="sm"
                showCloseButton
                closeOnBackdropClick
            >
                <div className="px-6 py-5 space-y-5">
                    <div>
                        <h3 className="text-[15px] font-semibold text-foreground">
                            Update billing details?
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            Your billing information has changed from what's saved on your account. Would you like to update it?
                        </p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <button
                            onClick={handleUpdateConfirm}
                            disabled={saving}
                            className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                        >
                            {saving ? 'Updating…' : 'Yes, update my details'}
                        </button>
                        <button
                            onClick={handleUpdateSkip}
                            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                            No, keep existing details
                        </button>
                    </div>
                </div>
            </GlobalModal>
        </>
    );
};

export default BillingDetailsStep;
