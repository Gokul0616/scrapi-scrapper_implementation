import React, { useRef } from 'react';
import {
    Download,
    Printer,
    X,
    CheckCircle2,
    FileText,
    Building2,
    CreditCard,
    ExternalLink
} from 'lucide-react';

const InvoiceDetailsModal = ({ invoice, onClose }) => {
    const printRef = useRef(null);

    if (!invoice) return null;

    const handlePrint = () => {
        const printContent = printRef.current;
        const WindowPrt = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        WindowPrt.document.write(`
            <html>
                <head>
                    <title>Invoice ${invoice.invoice_no}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body class="p-8">
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        WindowPrt.document.close();
        WindowPrt.focus();
        setTimeout(() => {
            WindowPrt.print();
            WindowPrt.close();
        }, 500);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const planLabel = (invoice.plan || '').charAt(0).toUpperCase() + invoice.plan.slice(1);
    const billingCycle = invoice.is_annual ? 'Annual' : 'Monthly';

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Invoice #{invoice.invoice_no}</h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(invoice.created_at)}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                            <span className="text-emerald-500 font-medium">Status: Paid</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        title="Print Invoice"
                    >
                        <Printer className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6" ref={printRef}>
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Top Branding & Addresses */}
                    <div className="flex flex-col sm:flex-row justify-between gap-6 pb-8 border-b border-border border-dashed">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-lg">S</div>
                                <span className="text-xl font-black tracking-tight text-foreground">Scrapi</span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-0.5">
                                <p>123 Tech Avenue</p>
                                <p>San Francisco, CA 94105</p>
                                <p>United States</p>
                                <p className="pt-2">billing@scrapi.io</p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Billed To</p>
                            <p className="text-base font-bold text-foreground">{invoice.workspace_name || 'Personal Account'}</p>
                            <p className="text-sm text-muted-foreground">{invoice.workspace_type === 'organization' ? 'Organization' : 'Personal'}</p>
                            <p className="text-sm text-muted-foreground">ID: {invoice.workspace_id}</p>
                        </div>
                    </div>

                    {/* Order Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Order Date</p>
                            <p className="text-sm font-medium text-foreground">{formatDate(invoice.created_at)}</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Payment Method</p>
                            <div className="flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                <p className="text-sm font-medium text-foreground capitalize">{invoice.payment_method}</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Subscription</p>
                            <p className="text-sm font-medium text-foreground">{planLabel} ({billingCycle})</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="space-y-4">
                        <div className="w-full text-left">
                            <div className="grid grid-cols-12 gap-4 pb-2 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                                <div className="col-span-8">Description</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-2 text-right">Amount</div>
                            </div>
                            <div className="divide-y divide-border">
                                {/* Base Plan */}
                                <div className="grid grid-cols-12 gap-4 py-4 px-2 items-center">
                                    <div className="col-span-8">
                                        <p className="text-sm font-semibold text-foreground">Scrapi {planLabel} Plan ({billingCycle})</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Recurring subscription fee</p>
                                    </div>
                                    <div className="col-span-2 text-center text-sm">1</div>
                                    <div className="col-span-2 text-right text-sm font-semibold">${(invoice.subtotal).toFixed(2)}</div>
                                </div>

                                {/* Add-ons */}
                                {invoice.addons && Object.entries(invoice.addons).filter(([, q]) => q > 0).map(([id, qty]) => {
                                    const ADDON_LABELS = {
                                        datacenter_proxies: 'Shared datacenter proxies',
                                        actor_memory: 'Max Actor memory',
                                        priority_support: 'Priority chat support',
                                        tech_training: 'Personal tech training',
                                        concurrent_runs: 'Max Actor concurrent runs',
                                    };
                                    return (
                                        <div key={id} className="grid grid-cols-12 gap-4 py-4 px-2 items-center">
                                            <div className="col-span-8">
                                                <p className="text-sm font-medium text-foreground">{ADDON_LABELS[id] || id}</p>
                                            </div>
                                            <div className="col-span-2 text-center text-sm">{qty}</div>
                                            <div className="col-span-2 text-right text-sm font-medium">Included</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="flex justify-end pt-4 border-t border-border">
                        <div className="w-full max-w-xs space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium text-foreground">${invoice.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Tax</span>
                                    <span className="px-1 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground">10%</span>
                                </div>
                                <span className="font-medium text-foreground">${invoice.tax_amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-border">
                                <span className="font-bold text-foreground">Total</span>
                                <span className="text-xl font-black text-blue-600">${invoice.amount.toFixed(2)} USD</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Notes */}
                    <div className="pt-12 text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 text-emerald-500 font-bold text-sm">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Payment Completed</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This is a computer-generated invoice. No signature is required. <br />
                            If you have any questions, please contact our support at support@scrapi.io
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-border bg-muted/10 flex justify-center">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <Download className="w-4 h-4" />
                    Download PDF Invoice
                </button>
            </div>
        </div>
    );
};

export default InvoiceDetailsModal;
