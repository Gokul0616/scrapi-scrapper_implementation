import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import CustomTooltip from '../../components/CustomTooltip';

// ─── Layout constants ─────────────────────────────────────────────────────────
const LEFT_W = 220;
const COL_W = 210;
const COL_GAP = 12;
const RIGHT_PAD = 24;
const BADGE_H = 30;
const PLAN_TOP = 220;
const MAIN_ROW = 54;

const MAIN_FEATURES = [
    { label: 'Monthly prepaid usage', tooltip: 'Platform credits included each month', values: ['$5 free credits', '$29', '$99', '$299', 'Custom'] },
    { label: 'Scrapi Store pricing discount', tooltip: 'Discount on paid actors in the Store', values: [null, null, null, null, 'Custom'] },
];

const SECTIONS = [
    {
        title: 'Actors',
        rows: [
            { label: 'Compute units (CU)', sublabel: '1 GB of RAM / hour', tooltip: 'Billed per second of Actor run.', values: ['$0.30 / CU', '$0.30 / CU', '$0.25 / CU', '$0.20 / CU', 'Custom'] },
            { label: 'Actor RAM', tooltip: 'Maximum RAM per Actor run', values: ['8 GB', '32 GB', '64 GB', '128 GB', 'Unlimited'] },
            { label: 'Max concurrent runs', tooltip: 'Simultaneous Actor runs', values: ['1', '10', '50', '200', 'Unlimited'] },
            { label: 'Scheduled runs', tooltip: 'Cron-based scheduled jobs', values: [null, '5', '25', 'Unlimited', 'Unlimited'] },
            { label: 'Rented Actors', tooltip: 'Premium Actors from Scrapi Store', values: [{ lim: true }, 'Deducted from\nprepaid', 'Deducted from\nprepaid', 'Deducted from\nprepaid', 'Custom'] },
        ],
    },
    {
        title: 'Proxy',
        rows: [
            { label: 'Residential proxies', tooltip: 'High-quality residential proxies / GB', values: ['$8.00 / GB', '$8.00 / GB', '$7.50 / GB', '$7.00 / GB', 'Custom'] },
            { label: 'Datacenter proxies', tooltip: 'Datacenter proxies', values: ['5 IPs included', '30 IPs\nthen $1.00/IP', '100 IPs\nthen $0.80/IP', '500 IPs\nthen $0.60/IP', 'Custom'] },
            { label: 'SERPs proxy', tooltip: 'Per 1,000 SERPs scraped', values: ['$2.50 / 1k', '$2.50 / 1k', '$2.00 / 1k', '$1.70 / 1k', 'Custom'] },
        ],
    },
    {
        title: 'Other',
        rows: [
            { label: 'AI Chat assistant', tooltip: 'AI-powered scraping assistant', values: ['Basic', 'Standard', 'Standard', 'Advanced', 'Custom'] },
            { label: 'Support level', tooltip: 'Customer support tier', values: ['Community', 'Chat', 'Priority chat', 'Account manager', 'SLA / Contract'] },
            { label: 'Single sign-on', tooltip: 'SSO via company identity', values: [null, null, null, null, 'Custom'] },
        ],
    },
];

const STORAGE = {
    groups: [
        {
            groupTitle: 'Storage', subs: [
                { name: 'Dataset', rows: [{ label: 'Timed storage 1,000 GB-hours', tooltip: 'Per 1,000 GB-hours', values: ['$1.00', '$1.00', '$0.90', '$0.80', 'Custom'] }, { label: '1,000 reads', values: ['$0.0004', '$0.0004', '$0.00036', '$0.00032', 'Custom'] }, { label: '1,000 writes', values: ['$0.005', '$0.005', '$0.0045', '$0.004', 'Custom'] }] },
                { name: 'Key-value store', rows: [{ label: 'Timed storage 1,000 GB-hours', tooltip: 'Per 1,000 GB-hours', values: ['$1.00', '$1.00', '$0.90', '$0.80', 'Custom'] }, { label: '1,000 reads', values: ['$0.005', '$0.005', '$0.0045', '$0.004', 'Custom'] }, { label: '1,000 writes', values: ['$0.05', '$0.05', '$0.045', '$0.04', 'Custom'] }, { label: '1,000 lists', values: ['$0.05', '$0.05', '$0.045', '$0.04', 'Custom'] }] },
                { name: 'Request queue', rows: [{ label: 'Timed storage 1,000 GB-hours', tooltip: 'Per 1,000 GB-hours', values: ['$4.00', '$4.00', '$3.60', '$3.20', 'Custom'] }, { label: '1,000 reads', values: ['$0.004', '$0.004', '$0.0036', '$0.0032', 'Custom'] }, { label: '1,000 writes', values: ['$0.02', '$0.02', '$0.018', '$0.016', 'Custom'] }] },
            ]
        },
        { groupTitle: 'Data transfer', subs: [{ name: null, rows: [{ label: 'External / GB', tooltip: 'Outside Scrapi network', values: ['$0.20', '$0.20', '$0.19', '$0.18', 'Custom'] }, { label: 'Internal / GB', tooltip: 'Within Scrapi network', values: ['$0.05', '$0.05', '$0.045', '$0.04', 'Custom'] }] }] },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Tip = ({ tooltip }) => (
    <CustomTooltip content={tooltip}>
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 cursor-help" />
    </CustomTooltip>
);

const CellVal = ({ value }) => {
    if (value === null || value === undefined) return <X className="w-3.5 h-3.5 text-muted-foreground/40" />;
    if (typeof value === 'object' && value.lim) return <span className="flex items-center gap-1 text-sm font-semibold text-foreground">Limited <Tip tooltip="Limited access" /></span>;
    const s = String(value);
    if (s.includes('\n')) {
        const [a, ...b] = s.split('\n');
        return <span className="text-sm leading-snug"><span className="font-semibold text-foreground block">{a}</span><span className="text-xs text-muted-foreground">{b.join(' ')}</span></span>;
    }
    return <span className="text-sm font-semibold text-foreground">{s}</span>;
};

// ─── PlanStep ─────────────────────────────────────────────────────────────────
const PlanStep = ({ selectedPlan, setSelectedPlan, isAnnual, setIsAnnual, onNext, configs }) => {
    const [storageOpen, setStorageOpen] = useState(false);

    // Derive PLANS from configs
    const PLANS = Object.entries(configs.plans || {}).map(([id, p]) => ({
        id,
        name: p.name,
        monthlyPrice: p.price,
        isCurrent: id === 'free', // Minimal default logic
        gradient: p.gradient,
        payg: p.payg,
        tier: p.tier
    }));

    const totalCols = PLANS.length * COL_W + (PLANS.length - 1) * COL_GAP;
    const TOTAL_CONTENT_W = LEFT_W + COL_GAP + totalCols + RIGHT_PAD;

    const getPrice = p => {
        if (p.monthlyPrice === null) return null;
        if (p.monthlyPrice === 0) return 0;
        return isAnnual ? Math.round(p.monthlyPrice * 0.9) : p.monthlyPrice;
    };

    const Row = ({ label, sublabel, tooltip, values }) => (
        <div className="flex" style={{ minHeight: 52 }}>
            <div className="flex-shrink-0 flex flex-col justify-center py-2 bg-background border-r border-border" style={{ width: LEFT_W, position: 'sticky', left: 0, zIndex: 2, paddingLeft: 24, paddingRight: 12 }}>
                <div className="flex items-start gap-1.5">
                    <span className="text-sm text-foreground leading-snug">{label}</span>
                    {tooltip && <Tip tooltip={tooltip} />}
                </div>
                {sublabel && <span className="text-xs text-muted-foreground mt-0.5">{sublabel}</span>}
            </div>
            <div className="flex flex-shrink-0" style={{ paddingLeft: COL_GAP, paddingRight: RIGHT_PAD, gap: COL_GAP }}>
                {values.map((val, i) => (
                    <div key={i} className={`flex items-center py-2 ${PLANS[i] && selectedPlan === PLANS[i].id && !PLANS[i].isCurrent ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`} style={{ width: COL_W, flexShrink: 0 }}>
                        <CellVal value={val} />
                    </div>
                ))}
            </div>
        </div>
    );

    const SectionHdr = ({ title }) => (
        <div className="flex" style={{ minHeight: 50 }}>
            <div className="flex-shrink-0 flex items-center bg-[#f0f0f0] dark:bg-[#202020] border-r border-border" style={{ width: LEFT_W, position: 'sticky', left: 0, zIndex: 2, paddingLeft: 24, paddingRight: 12 }}>
                <span className="text-sm font-semibold text-foreground">{title}</span>
            </div>
            <div className="flex-1 bg-[#f0f0f0] dark:bg-[#202020]" />
        </div>
    );

    const SubGroup = ({ title }) => (
        <div className="flex" style={{ minHeight: 36 }}>
            <div className="flex-shrink-0 flex items-center bg-muted/30 border-r border-border" style={{ width: LEFT_W, position: 'sticky', left: 0, zIndex: 2, paddingLeft: 24, paddingRight: 12 }}>
                <span className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</span>
            </div>
            <div className="flex-1 bg-muted/30" />
        </div>
    );

    const SubName = ({ name }) => (
        <div className="flex" style={{ minHeight: 34 }}>
            <div className="flex-shrink-0 flex items-center bg-card border-r border-border" style={{ width: LEFT_W, position: 'sticky', left: 0, zIndex: 2, paddingLeft: 24, paddingRight: 12 }}>
                <span className="text-sm font-bold text-foreground">{name}</span>
            </div>
            <div className="flex-1 bg-card" />
        </div>
    );

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3 py-4 bg-background">
                <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly billing</span>
                <button onClick={() => setIsAnnual(v => !v)} className={`relative w-10 h-5 rounded-full transition-colors ${isAnnual ? 'bg-blue-500' : 'bg-muted border border-border'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${isAnnual ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Annual billing</span>
                <Tip tooltip="Annual billing reduces cost by 10%" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">Save 10%</span>
            </div>

            {/* Plan grid */}
            <div className="flex-1 overflow-x-auto overflow-y-auto px-5 pb-2">
                <div style={{ width: TOTAL_CONTENT_W }}>

                    {/* Plan cards row */}
                    <div className="flex mb-5">
                        {/* Left label column (scrolls with cards) */}
                        <div className="flex-shrink-0 bg-background" style={{ width: LEFT_W, paddingLeft: 24 }}>
                            <div style={{ height: BADGE_H + PLAN_TOP }} />
                            <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ marginRight: 12 }}>
                                {MAIN_FEATURES.map((f, i) => (
                                    <div key={i} className="px-4 flex items-center gap-2" style={{ height: MAIN_ROW }}>
                                        <span className="text-sm text-foreground leading-snug">{f.label}</span>
                                        {f.tooltip && <Tip tooltip={f.tooltip} />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Plan cards */}
                        <div className="flex" style={{ paddingLeft: COL_GAP, paddingRight: RIGHT_PAD, gap: COL_GAP }}>
                            {PLANS.map((plan, pi) => {
                                const price = getPrice(plan);
                                const isEnt = plan.id === 'enterprise';
                                const isSel = selectedPlan === plan.id;
                                return (
                                    <div key={plan.id} style={{ width: COL_W, flexShrink: 0 }}>
                                        {/* Badge */}
                                        <div className="flex justify-center items-end" style={{ height: BADGE_H }}>
                                            {plan.isCurrent && (
                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-2.5 py-0.5 rounded-full">
                                                    CURRENT PLAN
                                                </span>
                                            )}
                                        </div>
                                        {/* Card */}
                                        <div className={`rounded-xl border bg-card flex flex-col transition-all ${isSel && !plan.isCurrent ? 'border-blue-400 ring-2 ring-blue-400 ring-offset-1' : 'border-border'}`}>
                                            <div className="h-[3px] rounded-t-xl" style={{ background: plan.gradient }} />
                                            <div className="px-4 pt-3 flex flex-col" style={{ minHeight: PLAN_TOP }}>
                                                <h3 className="text-xl font-bold text-foreground mb-0.5">{plan.name}</h3>
                                                {isEnt ? (
                                                    <p className="text-sm font-semibold text-foreground">Custom</p>
                                                ) : (
                                                    <p className="flex items-baseline gap-0.5 mb-3">
                                                        <span className="text-lg font-bold text-foreground">${price}</span>
                                                        <span className="text-xs text-muted-foreground">/ month</span>
                                                    </p>
                                                )}
                                                <div className="mb-2">
                                                    {plan.isCurrent ? (
                                                        <button disabled className="w-full py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border cursor-default">Current plan</button>
                                                    ) : isEnt ? (
                                                        <button className="w-full py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">Contact us</button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPlan(plan.id === selectedPlan ? null : plan.id);
                                                                onNext();
                                                            }}
                                                            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${isSel ? 'bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                                        >
                                                            Choose plan
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="min-h-[36px]">
                                                    {plan.payg && <p className="text-xs text-muted-foreground whitespace-pre-line leading-snug">{plan.payg}</p>}
                                                    {plan.isCurrent && <p className="text-sm font-semibold text-foreground">$5 free credits</p>}
                                                    {isEnt && <p className="text-xs text-muted-foreground">Custom</p>}
                                                </div>
                                                <div className="mt-auto pt-1 min-h-[22px]">
                                                    {plan.tier && <p className="text-xs text-muted-foreground">{plan.tier}</p>}
                                                    {isEnt && <p className="text-xs text-muted-foreground">Custom</p>}
                                                </div>
                                            </div>
                                            <div className="border-t border-border">
                                                {MAIN_FEATURES.map((f, fi) => (
                                                    <div key={fi} className={`px-4 flex items-center ${isSel && !plan.isCurrent ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`} style={{ height: MAIN_ROW }}>
                                                        <CellVal value={f.values[pi]} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Feature comparison sections */}
                    {SECTIONS.map(section => (
                        <div key={section.title} className="border border-border rounded-xl overflow-hidden mb-4">
                            <SectionHdr title={section.title} />
                            {section.rows.map((row, ri) => <Row key={ri} {...row} />)}
                        </div>
                    ))}

                    {/* Storage accordion */}
                    <div className="border border-border rounded-xl overflow-hidden mb-4">
                        <button onClick={() => setStorageOpen(v => !v)} className="w-full flex items-center justify-between bg-muted/50 hover:bg-muted/70 transition-colors px-4" style={{ minHeight: 44 }}>
                            <span className="text-sm font-semibold text-foreground">Storage and data transfer</span>
                            {storageOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        {storageOpen && STORAGE.groups.map(g => (
                            <React.Fragment key={g.groupTitle}>
                                <SubGroup title={g.groupTitle} />
                                {g.subs.map(sub => (
                                    <React.Fragment key={sub.name || 'sub'}>
                                        {sub.name && <SubName name={sub.name} />}
                                        {sub.rows.map((row, ri) => <Row key={ri} {...row} />)}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>


        </div>
    );
};

export default PlanStep;
