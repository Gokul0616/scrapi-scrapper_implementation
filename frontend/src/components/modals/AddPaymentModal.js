import React, { useState } from 'react';
import axios from 'axios';
import { useModal } from '../../contexts/ModalContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import GlobalModal from '../GlobalModal';
import ActionButton from '../ui/ActionButton';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AddPaymentModal = ({ modalId, onSuccess }) => {
    const { closeModal } = useModal();
    const { currentWorkspace } = useWorkspace();
    const [method, setMethod] = useState('card');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            // For mock purposes, directly updating subscription setup via API
            let newSetupData = { payment_method: method };
            if (method === 'card' && cardNumber) {
                const digitsOnly = cardNumber.replace(/\D/g, '');
                newSetupData.card_last4 = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : '1234';
            }

            const wsQuery = `workspace_id=${currentWorkspace.workspace_id}&workspace_type=${currentWorkspace.workspace_type}`;
            await axios.post(`${API}/billing/subscription?${wsQuery}`, newSetupData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onSuccess) onSuccess(newSetupData);
            closeModal();
        } catch (err) {
            console.error('Failed to save payment method:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const isFormValid = method === 'paypal' || (method === 'card' && cardNumber.length > 14 && expiry.length > 4 && cvc.length >= 3);

    // Logo Helpers
    const VisaIcon = () => <div className="flex items-center gap-1"><svg viewBox="0 0 48 32" className="w-8 h-5 rounded"><rect width="48" height="32" rx="4" fill="#1A1F71" /><text x="6" y="22" fontFamily="Arial" fontWeight="bold" fontSize="13" fill="white">VISA</text></svg><svg viewBox="0 0 48 32" className="w-8 h-5 rounded"><rect width="48" height="32" rx="4" fill="#252525" /><circle cx="19" cy="16" r="9" fill="#EB001B" /><circle cx="29" cy="16" r="9" fill="#F79E1B" /><path d="M24 9.5a9 9 0 0 1 0 13A9 9 0 0 1 24 9.5z" fill="#FF5F00" /></svg></div>;
    const PayPalIcon = ({ size = 'sm' }) => {
        const s = size === 'lg' ? 'w-10 h-10' : 'w-4 h-4';
        return <svg viewBox="0 0 24 24" className={s}><path d="M7.5 21H4l1.5-9h5C13.5 12 15 13.5 14 16c0 0-1 5-6.5 5z" fill="#003087" /><path d="M10 16H6.5l1-6h5C15 10 16 11.5 15.5 13.5 15 15.5 13 16 10 16z" fill="#009CDE" /><path d="M13.5 13.5H10l.5-3h4.5C16 10.5 16.5 12 15.5 13.5z" fill="#012169" /></svg>;
    };

    const CvcIcon = () => (
        <svg viewBox="0 0 38 24" className="w-8 h-5 text-muted-foreground" fill="none">
            <rect x="0.5" y="0.5" width="37" height="23" rx="3.5" fill="currentColor" opacity="0.1" stroke="currentColor" strokeOpacity="0.3" />
            <rect y="5" width="38" height="6" fill="currentColor" opacity="0.3" />
            <rect x="6" y="16" width="16" height="3" rx="1" fill="currentColor" opacity="0.2" />
            <rect x="26" y="15" width="8" height="5" rx="1" fill="currentColor" opacity="0.5" />
            <text x="28" y="20" fontFamily="monospace" fontSize="4" fill="currentColor" opacity="0.9">123</text>
        </svg>
    );

    const Radio = ({ checked }) => (
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'border-blue-600' : 'border-border'}`}>
            {checked && <div className="w-2 h-2 rounded-full bg-blue-600" />}
        </div>
    );

    const CardIcon = ({ active }) => (
        <svg viewBox="0 0 24 18" className={`w-6 h-[18px] ${active ? 'text-blue-600' : 'text-muted-foreground'}`} fill="none">
            <rect x="0.5" y="0.5" width="23" height="17" rx="2.5" stroke="currentColor" />
            <rect y="4" width="24" height="4" fill="currentColor" opacity="0.3" />
            <rect x="2" y="12" width="6" height="2" rx="1" fill="currentColor" opacity="0.5" />
        </svg>
    );

    return (
        <GlobalModal
            modalId={modalId}
            title={<div className="flex-1 text-center font-bold text-lg">Add payment method</div>}
            size="full"
        >
            <div className="p-6 pb-2">
                <div className="rounded-xl border border-border overflow-hidden mb-6 max-w-lg mx-auto bg-card">

                    {/* Card Option */}
                    <div className="rounded-t-xl overflow-hidden border-b border-border">
                        <div
                            className={`flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer hover:bg-muted/50 ${method === 'card' ? 'bg-blue-600/5' : ''}`}
                            onClick={() => setMethod('card')}
                        >
                            <Radio checked={method === 'card'} />
                            <CardIcon active={method === 'card'} />
                            <span className={`text-[15px] font-medium transition-colors ${method === 'card' ? 'text-blue-600' : 'text-foreground'}`}>Card</span>
                        </div>

                        <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${method === 'card' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="border-t border-border px-4 py-5 space-y-4 bg-muted/20 dark:bg-muted/10">

                                    {/* Temporary Card Unavailability Notice */}
                                    <div className="rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-50 to-red-50/50 dark:border-rose-500/20 dark:from-rose-500/10 dark:to-red-500/5 p-3 shadow-sm mx-1">
                                        <div className="flex items-start gap-3">
                                            <div className="bg-rose-100 dark:bg-rose-500/20 p-1.5 rounded-full text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200/50 dark:border-rose-500/30 flex-shrink-0">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                            </div>
                                            <div className="flex-1 pt-0.5">
                                                <h4 className="text-[13px] font-semibold text-rose-900 dark:text-rose-200 tracking-tight">Card processing temporarily paused</h4>
                                                <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-1 leading-relaxed">
                                                    We are optimizing our secure payment gateways. Please use <button type="button" onClick={() => setMethod('paypal')} className="font-semibold underline decoration-rose-300 hover:decoration-rose-500 underline-offset-4 hover:text-rose-950 dark:hover:text-rose-100 transition-all">PayPal</button> to complete your action today (Credit & Debit cards are fully supported).
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Form fields */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Card number</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="1234 1234 1234 1234"
                                                value={cardNumber}
                                                onChange={e => setCardNumber(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 pr-36"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <VisaIcon />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1.5">Expiration date</label>
                                            <input
                                                type="text"
                                                placeholder="MM / YY"
                                                value={expiry}
                                                onChange={e => setExpiry(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1.5">Security code</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="CVC"
                                                    value={cvc}
                                                    onChange={e => setCvc(e.target.value)}
                                                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 pr-12"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <CvcIcon />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">
                                        By providing your card information, you allow Scrapi to charge your card for future payments in accordance with their terms.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PayPal Option */}
                    <div className="rounded-b-xl overflow-hidden">
                        <div
                            className={`flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer hover:bg-muted/50 ${method === 'paypal' ? 'bg-blue-600/5' : ''}`}
                            onClick={() => setMethod('paypal')}
                        >
                            <Radio checked={method === 'paypal'} />
                            <PayPalIcon />
                            <span className={`text-[15px] font-medium transition-colors ${method === 'paypal' ? 'text-blue-600' : 'text-foreground'}`}>PayPal</span>
                        </div>

                        <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${method === 'paypal' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="border-t border-border px-4 py-5 space-y-4 bg-muted/20 dark:bg-muted/10">
                                    <div className="rounded-lg border border-border bg-background p-4 space-y-4">
                                        <div>
                                            <PayPalIcon size="lg" />
                                            <p className="text-sm font-medium text-foreground mt-2">PayPal selected.</p>
                                        </div>
                                        <div className="border-t border-border pt-3 flex items-center gap-2.5">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-muted-foreground flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                            <p className="text-xs text-muted-foreground">
                                                After submission, you will be redirected to securely complete next steps.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">
                                        By confirming your payment with PayPal, you allow Scrapi to charge your PayPal account for future payments in accordance with their terms.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="flex items-center justify-center gap-3 pb-4">
                    <ActionButton
                        label="Cancel"
                        onClick={closeModal}
                        variant="danger"
                    />
                    <ActionButton
                        label={isSaving ? 'Saving...' : 'Save'}
                        onClick={handleSave}
                        disabled={isSaving || !isFormValid}
                        variant="secondary"
                    />
                </div>
            </div>
        </GlobalModal>
    );
};

export default AddPaymentModal;
