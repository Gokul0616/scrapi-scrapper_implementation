import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Plus, User, Building2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import CustomTooltip from '../../components/CustomTooltip';

/**
 * Shared checkout summary card used by AddOnsStep and BillingDetailsStep.
 */
const CheckoutSummary = ({ user, selectedPlan, isAnnual, setIsAnnual, addonCost = 0, addons = {}, configs }) => {
    const [promoOpen, setPromoOpen] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [addonsOpen, setAddonsOpen] = useState(false);
    const addonsPopoverRef = useRef(null);
    const { currentWorkspace } = useWorkspace();

    // Close addons popover on outside click
    useEffect(() => {
        if (!addonsOpen) return;
        const handler = (e) => {
            if (addonsPopoverRef.current && !addonsPopoverRef.current.contains(e.target)) {
                setAddonsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [addonsOpen]);

    const selectedAddons = Object.entries(addons).filter(([, qty]) => qty > 0);

    const isOrg = currentWorkspace?.workspace_type === 'organization';
    const workspaceName = currentWorkspace?.workspace_name || user?.username || 'Your account';

    const basePrice = configs.plans[selectedPlan]?.price ?? 0;
    const price = isAnnual ? Math.round(basePrice * 0.9) : basePrice;
    const annualSaving = basePrice - Math.round(basePrice * 0.9);
    const total = price + addonCost;

    return (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Summary</h3>

            {/* Account */}
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Account</p>
                <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-lg px-3 py-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isOrg
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                        {isOrg ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{workspaceName}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isOrg
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            {isOrg ? 'Organisation' : 'Personal'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Annual billing toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAnnual(v => !v)}
                        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${isAnnual ? 'bg-blue-500' : 'bg-muted border border-border'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${isAnnual ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-foreground">Annual billing</span>
                    <CustomTooltip content="Pay annually and save 10%">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                    </CustomTooltip>
                </div>
                {annualSaving > 0 && (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 px-2 py-0.5 rounded-full">
                        Save ${annualSaving}
                    </span>
                )}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{selectedPlan || 'Starter'} plan ({isAnnual ? 'annual' : 'monthly'})</span>
                    <span className="font-semibold text-foreground">${price}.00</span>
                </div>
                {addonCost > 0 && (
                    <div className="relative flex justify-between items-center">
                        <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Add-ons</span>
                            {/* ? icon — click to see breakdown */}
                            <button
                                ref={addonsPopoverRef}
                                onClick={() => setAddonsOpen(v => !v)}
                                className="text-muted-foreground/50 hover:text-blue-500 transition-colors"
                                aria-label="Show add-on breakdown"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                            {/* Popover */}
                            {addonsOpen && (
                                <div className="absolute left-0 top-6 z-50 w-64 rounded-xl border border-border bg-card shadow-xl p-3 space-y-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold text-foreground uppercase tracking-wide">Add-ons breakdown</p>
                                        {/* <button onClick={() => setAddonsOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button> */}
                                    </div>
                                    {selectedAddons.map(([id, qty]) => {
                                        const addonConfig = configs.addons[id] || {};
                                        const unit = addonConfig.unit;
                                        return (
                                            <div key={id} className="flex items-start justify-between gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {addonConfig.label || id}
                                                    {unit ? ` × ${qty} ${unit}${qty > 1 ? 's' : ''}` : ''}
                                                </span>
                                                <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                                                    +${qty * (addonConfig.price || 0)}.00
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div className="border-t border-border pt-1.5 flex justify-between">
                                        <span className="text-xs font-bold text-foreground">Total add-ons</span>
                                        <span className="text-xs font-bold text-foreground">+${addonCost}.00</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="font-semibold text-foreground">+${addonCost}.00</span>
                    </div>
                )}

                {/* Promo code */}
                {!promoOpen ? (
                    <button onClick={() => setPromoOpen(true)} className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        Enter a promo code
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={promoCode}
                            onChange={e => setPromoCode(e.target.value)}
                            placeholder="Promo code"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                        />
                        <button className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">Apply</button>
                    </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                    <span>VAT (0%)</span>
                    <span>$0.00</span>
                </div>
            </div>

            <div className="border-t border-border" />

            {/* Total */}
            <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">Total to pay</span>
                <span className="text-lg font-bold text-foreground">${total}.00</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">All prices are in U.S. dollars.</p>
        </div>
    );
};

export default CheckoutSummary;
