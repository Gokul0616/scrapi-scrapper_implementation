import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
    Download,
    Printer,
    ChevronLeft,
    CheckCircle2,
    CreditCard,
    Tag,
    Loader2,
    Building2,
    Mail,
    User,
    FileText,
    MapPin,
    Globe,
    Receipt
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import CustomTooltip from '../components/CustomTooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── Section card — matches ReviewStep / checkout style ────────────────────────
const Section = ({ icon: Icon, label, children }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// ── Row — label / value pair ──────────────────────────────────────────────────
const Row = ({ label, value, mono, accent, truncate }) => {
    const valueStr = value ? String(value) : '';
    const content = (
        <span className={`text-sm font-semibold ${mono ? 'font-mono text-xs' : ''} ${accent ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'} ${truncate ? 'truncate max-w-[150px] sm:max-w-[220px] text-right inline-block' : ''}`}>
            {value || '—'}
        </span>
    );

    return (
        <div className="flex items-center justify-between py-1.5 gap-4">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            {truncate && value ? (
                <CustomTooltip content={valueStr}>
                    {content}
                </CustomTooltip>
            ) : content}
        </div>
    );
};

const InvoiceDetail = () => {
    const { invoiceId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const printRef = useRef(null);
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const autoDownload = searchParams.get('download') === '1';

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState({ plans: {}, addons: {} });

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API}/billing/invoices/${invoiceId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setInvoice(response.data);
            } catch (err) {
                console.error('Error fetching invoice:', err);
                navigate('/not-found', { replace: true });
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [invoiceId, navigate]);

    // Auto-trigger download when opened via email download link
    useEffect(() => {
        if (autoDownload && invoice && !loading) {
            handleDownloadPDF();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoDownload, invoice, loading]);

    const handleDownloadPDF = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API}/billing/invoices/${invoiceId}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob' // Important for binary data
            });

            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${invoice?.invoice_no || invoiceId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading PDF:', err);
        }
    };

    const handlePrint = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API}/billing/invoices/${invoiceId}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            // Create a hidden iframe to trigger print
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                // Clean up after print dialog opens (or is closed)
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    window.URL.revokeObjectURL(url);
                }, 1000);
            };
        } catch (err) {
            console.error('Error printing PDF:', err);
            // Fallback to simple print if PDF generation fails
            window.print();
        }
    };

    const formatDate = (dateStr) =>
        new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-7 h-7 animate-spin text-blue-500 mb-3" />
                <p className="text-muted-foreground text-sm font-medium">Loading invoice...</p>
            </div>
        );
    }

    if (!invoice) return null;

    const planLabel = (invoice.plan || '').charAt(0).toUpperCase() + (invoice.plan || '').slice(1);
    const billingCycle = invoice.is_annual ? 'Annual' : 'Monthly';
    const hasBillingAddress = invoice.billing_street_address || invoice.billing_city || invoice.billing_country || invoice.billing_custom_address_text;

    const addonLabels = {
        datacenter_proxies: 'Datacenter Proxies',
        actor_memory: 'Actor RAM Extension',
        priority_support: '24/7 Priority Support',
        tech_training: 'Tech Training Module',
        concurrent_runs: 'Concurrent Runs Upgrade',
    };

    const activeAddons = invoice.addons
        ? Object.entries(invoice.addons).filter(([, qty]) => qty > 0)
        : [];

    return (
        <div className="min-h-screen bg-background">
            {/* Top bar */}
            <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md no-print">
                <div className=" mx-auto px-5 h-14 flex items-center justify-between gap-4">
                    <button
                        onClick={() => navigate('/billing?tab=invoices')}
                        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Billing History
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-bold   transition-colors"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold   transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Page content */}
            <div ref={printRef} className=" mx-auto px-5 py-8 space-y-4">

                {/* Invoice header row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2">
                    <div>
                        <h1 className="text-xl font-black text-foreground tracking-tight">Invoice #{invoice.invoice_no}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Issued {formatDate(invoice.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Payment Successful
                    </div>
                </div>

                {/* Seller — Scrapi */}
                <Section icon={Building2} label="From">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white' : 'bg-foreground'}`}>
                            <img src="/logo.png" alt="Scrapi" className={`w-5 h-5 brightness-0 ${isDark ? '' : 'invert'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">Scrapi Technologies Pvt. Ltd.</p>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Scrapi Console</p>
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <Row label={<span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />Address</span>} value="Chennai, Tamil Nadu — 600001, India" />
                        <Row label={<span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />Email</span>} value="billing@scrapi.io" />
                        <Row label={<span className="flex items-center gap-1.5"><Globe className="w-3 h-3" />Website</span>} value="scrapi.io" />
                    </div>
                </Section>

                {/* Buyer — Billing & Payment Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Manual Billing Details */}
                    <Section icon={User} label="Account & Billing Details">
                        <div className="space-y-0.5">
                            {/* Always show account email as a baseline */}
                            <Row label="Account Email" value={invoice.account_email} truncate accent />

                            {invoice.billing_full_name && invoice.billing_full_name !== invoice.paypal_payer_name && (
                                <Row label="Billed To" value={invoice.billing_full_name} truncate />
                            )}
                            {invoice.billing_company && <Row label="Company" value={invoice.billing_company} truncate />}

                            {/* Only show billing email if it's different from account email */}
                            {invoice.billing_email && invoice.billing_email !== invoice.account_email && (
                                <Row label="Billing Contact" value={invoice.billing_email} truncate />
                            )}

                            {hasBillingAddress && (
                                <Row label="Address" value={[
                                    invoice.billing_street_address,
                                    invoice.billing_city,
                                    invoice.billing_postal_code,
                                    invoice.billing_country,
                                    invoice.billing_custom_address_text
                                ].filter(Boolean).join(', ')} truncate />
                            )}

                            {invoice.billing_tax_id && <Row label="Tax ID" value={invoice.billing_tax_id} />}
                            {invoice.billing_registration_no && <Row label="Registration No" value={invoice.billing_registration_no} />}
                            {invoice.billing_contact && <Row label="Billing Contact" value={invoice.billing_contact} truncate />}
                        </div>
                    </Section>

                    {/* PayPal Payer Info (Transaction Source) */}
                    <Section icon={CreditCard} label="Payment Source (PayPal)">
                        {invoice.paypal_payer_email ? (
                            <div className="space-y-0.5">
                                {invoice.paypal_payer_name && <Row label="Payer Name" value={invoice.paypal_payer_name} truncate />}
                                {invoice.paypal_payer_email && <Row label="Payer Email" value={invoice.paypal_payer_email} truncate />}
                                {invoice.paypal_payer_country && <Row label="Country" value={invoice.paypal_payer_country} />}
                                <div className="mt-2 pt-2 border-t border-border/50">
                                    <Row label="PayPal Order ID" value={invoice.paypal_order_id} mono />
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground/40 italic py-1">
                                No PayPal payer details recorded.
                            </p>
                        )}
                    </Section>
                </div>

                {/* Payment & Plan Details */}
                <Section icon={CreditCard} label="Payment Details">
                    <div className="space-y-0.5">
                        <Row label="Payment Method" value={<span className="capitalize">{invoice.payment_method}</span>} />
                        <Row label="Plan" value={
                            <span className="flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-orange-500" />
                                {planLabel} • {billingCycle}
                            </span>
                        } />
                        <Row label="Account Type" value={<span className="capitalize">{invoice.workspace_type || 'Personal'}</span>} />
                        <Row label="Workspace ID" value={invoice.workspace_id} mono truncate />
                        <Row label="Invoice ID" value={invoice._id} mono />
                        {invoice.paypal_order_id && <Row label="PayPal Trans ID" value={invoice.paypal_order_id} mono truncate />}
                    </div>
                </Section>

                {/* Line Items */}
                <Section icon={FileText} label="Services">
                    <div className="divide-y divide-border/60">
                        {/* Main plan */}
                        <div className="flex items-center justify-between py-2.5">
                            <div>
                                <p className="text-sm font-semibold text-foreground">Scrapi {planLabel} — {billingCycle}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Full platform access included</p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">${invoice.subtotal.toFixed(2)}</span>
                        </div>

                        {/* Add-ons */}
                        {activeAddons.map(([id, qty]) => {
                            const conf = configs.addons[id] || {};
                            const label = conf.label || id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            const pricePer = conf.price || 0;
                            const totalAddon = qty * pricePer;
                            return (
                                <div key={id} className="flex items-center justify-between py-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0"></span>
                                        <p className="text-sm text-foreground/80">{label}</p>
                                        <span className="text-xs text-muted-foreground">×{qty}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-foreground">${totalAddon.toFixed(2)}</span>
                                        <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-bold uppercase">Incl</span>
                                    </div>
                                </div>
                            );
                        })}

                        {invoice.billing_custom_goods_text && (
                            <div className="py-2.5">
                                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold mb-1">Customer Note</p>
                                <p className="text-xs text-muted-foreground italic h-auto whitespace-pre-wrap">{invoice.billing_custom_goods_text}</p>
                            </div>
                        )}

                        <div className="pt-3 space-y-2">
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Plan Subtotal</span>
                                <span>${invoice.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Subtotal (Add-ons)</span>
                                <span>${(invoice.amount - invoice.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-2 border-t border-border">
                                <span className="text-sm font-bold text-foreground">Total</span>
                                <span className="text-2xl font-black text-foreground">
                                    ${invoice.amount.toFixed(2)}
                                    <span className="text-xs font-semibold text-muted-foreground ml-1">USD</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Footer note */}
                <div className="flex items-center justify-between pt-2 pb-6 no-print">
                    <p className="text-[11px] text-muted-foreground/40 uppercase tracking-widest font-medium">
                        © {new Date().getFullYear()} Scrapi Technologies Pvt. Ltd.
                    </p>
                    <p className="text-[11px] text-muted-foreground/40 font-mono">
                        {invoice._id}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetail;
