import React from 'react';
import { ChevronLeft, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CustomTooltip from '../../components/CustomTooltip';
import CheckoutSummary from './CheckoutSummary';

// ─── Spinner control ──────────────────────────────────────────────────────────
const Spinner = ({ value, onChange, min, max }) => (
    <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
        <input
            type="number"
            value={value}
            onChange={e => {
                const v = Math.max(min, Math.min(max, parseInt(e.target.value) || 0));
                onChange(v);
            }}
            className="w-12 text-center text-sm font-semibold text-foreground bg-transparent border-none outline-none py-1.5"
            min={min}
            max={max}
        />
        <div className="flex flex-col border-l border-border">
            <button
                onClick={() => onChange(Math.min(max, value + 1))}
                className="px-1.5 py-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
                <ChevronUp className="w-3 h-3" />
            </button>
            <button
                onClick={() => onChange(Math.max(min, value - 1))}
                className="px-1.5 py-0.5 hover:bg-muted transition-colors border-t border-border text-muted-foreground hover:text-foreground"
            >
                <ChevronDown className="w-3 h-3" />
            </button>
        </div>
    </div>
);

// ─── Toggle control ───────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }) => (
    <button
        onClick={() => onChange(value ? 0 : 1)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-blue-500' : 'bg-muted border border-border'}`}
    >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
);

// ─── AddOnsStep ───────────────────────────────────────────────────────────────
const AddOnsStep = ({ onNext, onBack, selectedPlan, isAnnual, setIsAnnual, addons, setAddons, configs }) => {
    const { user } = useAuth();

    // Derive ADDONS from configs
    const ADDONS = Object.entries(configs.addons || {}).map(([id, a]) => ({
        id,
        title: a.title,
        description: a.description,
        tooltip: a.tooltip,
        price: a.displayPrice,
        pricePerUnit: a.price,
        type: a.type,
        unit: a.unit,
        min: a.min,
        max: a.max
    }));

    // Lifted state — addons is { id: quantity } from UpgradeCheckout
    const quantities = Object.fromEntries(ADDONS.map(a => [a.id, addons[a.id] ?? 0]));
    const setQty = (id, val) => setAddons(prev => ({ ...prev, [id]: val }));

    // Total add-on cost
    const addonCost = ADDONS.reduce((sum, a) => sum + (quantities[a.id] * a.pricePerUnit), 0);

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                {/* Two-column on lg+, single-column on mobile */}
                <div className="flex flex-col lg:flex-row lg:gap-8 max-w-5xl mx-auto px-6 py-8 w-full">

                    {/* ── LEFT: Add-ons list ────────────────────────────────── */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-foreground mb-5">
                            Expand your plan with add-ons
                        </h2>

                        {/* Add-on rows */}
                        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                            {ADDONS.map(addon => (
                                <div key={addon.id} className="flex items-center gap-4 px-5 py-4">
                                    {/* Text */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-sm font-semibold text-foreground">{addon.title}</span>
                                            <CustomTooltip content={addon.tooltip}>
                                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help flex-shrink-0" />
                                            </CustomTooltip>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-snug">{addon.description}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="flex-shrink-0 text-sm font-semibold text-foreground w-28 text-right pr-4">
                                        {addon.price}
                                    </div>

                                    {/* Control */}
                                    <div className="flex-shrink-0">
                                        {addon.type === 'spinner' ? (
                                            <Spinner
                                                value={quantities[addon.id]}
                                                onChange={val => setQty(addon.id, val)}
                                                min={addon.min}
                                                max={addon.max}
                                            />
                                        ) : (
                                            <Toggle
                                                value={quantities[addon.id]}
                                                onChange={val => setQty(addon.id, val)}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action row */}
                        <div className="flex items-center justify-between mt-6">
                            <button
                                onClick={onBack}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous step
                            </button>
                            <button
                                onClick={onNext}
                                className="px-6 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT: Summary sidebar (sticky on lg, below on mobile) ── */}
                    <div className="w-full lg:w-80 flex-shrink-0 mt-8 lg:mt-0">
                        <div className="lg:sticky lg:top-4">
                            <CheckoutSummary
                                user={user}
                                selectedPlan={selectedPlan}
                                isAnnual={isAnnual}
                                setIsAnnual={setIsAnnual}
                                addonCost={addonCost}
                                addons={addons}
                                configs={configs}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddOnsStep;
