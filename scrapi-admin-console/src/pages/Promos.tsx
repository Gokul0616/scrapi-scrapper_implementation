import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Tag, Trash2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useAlert } from '../context/AlertContext';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface AttachedOffer {
    type: string; // 'limit' or 'addon'
    id: string;   // 'max_ram_gb', 'concurrent_runs', 'platform_credits', etc.
    qty: number;
}

interface PromoCode {
    id: string;
    code: string;
    owner_user_id: string;
    commission_rate: number;
    clicks: number;
    conversions: number;
    attached_offers: AttachedOffer[];
    applicable_plans: string[];
    expiry_date: string | null;
    created_at: string;
}

const AVAILABLE_PLANS = ['Starter', 'Growth', 'Scale', 'Enterprise'];
const LIMIT_OPTIONS = ['platform_credits', 'max_ram_gb', 'max_concurrent_runs', 'data_retention_days'];
const ADDON_OPTIONS = ['concurrent_runs', 'actor_memory', 'storage_gb', 'shared_datacenter_proxies', 'residential_proxies_gb'];

export const PromosPage: React.FC = () => {
    const { showAlert } = useAlert();
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Promo State
    const [newCode, setNewCode] = useState('');
    const [newCommissionRate, setNewCommissionRate] = useState<number>(0);
    const [newOffers, setNewOffers] = useState<AttachedOffer[]>([]);
    const [newPlans, setNewPlans] = useState<string[]>([]);
    const [newExpiry, setNewExpiry] = useState('');

    useEffect(() => {
        fetchPromos();
    }, []);

    const fetchPromos = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const response = await fetch(`${BACKEND_URL}/api/admin/promo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch promo codes');
            const data = await response.json();
            setPromos(data);
        } catch (err: any) {
            showAlert('Failed to load promo codes', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (code: string) => {
        if (!window.confirm(`Are you sure you want to delete promo code: ${code}?`)) return;

        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const response = await fetch(`${BACKEND_URL}/api/admin/promo/${code}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to delete promo code');
            showAlert('Promo code deleted successfully', 'success');
            fetchPromos();
        } catch (err: any) {
            showAlert(err.message, 'error');
        }
    };

    const handleCreate = async () => {
        if (!newCode) {
            showAlert('Code is required', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const payload = {
                code: newCode.toUpperCase(),
                commission_rate: Number(newCommissionRate),
                attached_offers: newOffers,
                applicable_plans: newPlans,
                expiry_date: newExpiry ? new Date(newExpiry).toISOString() : null
            };

            const response = await fetch(`${BACKEND_URL}/api/admin/promo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to create promo code');
            }

            showAlert('Promo code created successfully', 'success');
            setIsCreateModalOpen(false);
            setNewCode('');
            setNewCommissionRate(0);
            setNewOffers([]);
            setNewPlans([]);
            setNewExpiry('');
            fetchPromos();
        } catch (err: any) {
            showAlert(err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addOffer = () => {
        setNewOffers([...newOffers, { type: 'limit', id: 'platform_credits', qty: 0 }]);
    };

    const updateOffer = (index: number, field: string, value: any) => {
        const updated = [...newOffers];
        updated[index] = { ...updated[index], [field]: value };
        setNewOffers(updated);
    };

    const removeOffer = (index: number) => {
        setNewOffers(newOffers.filter((_, i) => i !== index));
    };

    const togglePlan = (plan: string) => {
        if (newPlans.includes(plan)) {
            setNewPlans(newPlans.filter(p => p !== plan));
        } else {
            setNewPlans([...newPlans, plan]);
        }
    };

    const filteredPromos = promos.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()));

    const columns: Column<PromoCode>[] = [
        {
            header: 'Code',
            accessorKey: 'code',
            cell: ({ row }) => (
                <div className="flex items-center space-x-2">
                    <Tag size={16} className="text-blue-500" />
                    <span className="font-bold text-foreground">{row.code}</span>
                </div>
            ),
        },
        {
            header: 'Comm. Rate',
            accessorKey: 'commission_rate',
            cell: ({ row }) => <span>{row.commission_rate}%</span>,
        },
        {
            header: 'Clicks / Conv.',
            id: 'stats',
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">{row.clicks}</span> / <span className="text-green-600 font-semibold">{row.conversions}</span>
                </span>
            ),
        },
        {
            header: 'Attached Offers',
            id: 'offers',
            cell: ({ row }) => row.attached_offers.length === 0 ? (
                <span className="text-xs text-muted-foreground">None</span>
            ) : (
                <div className="flex flex-col space-y-1">
                    {row.attached_offers.map((offer, idx) => (
                        <span key={idx} className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground inline-block w-max">
                            {offer.type}:{offer.id} = {offer.qty}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            header: 'Valid Plans',
            id: 'plans',
            cell: ({ row }) => <span>{row.applicable_plans?.length > 0 ? row.applicable_plans.join(', ') : 'All'}</span>,
        },
        {
            header: 'Expiry',
            accessorKey: 'expiry_date',
            cell: ({ row }) => <span className="text-muted-foreground">{row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : 'Never'}</span>,
        },
        {
            header: 'Created At',
            accessorKey: 'created_at',
            cell: ({ row }) => <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
        },
        {
            header: '',
            id: 'actions',
            cellClassName: 'text-right',
            cell: ({ row }) => (
                <button onClick={() => handleDelete(row.code)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete Promo">
                    <Trash2 size={16} />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-foreground">Promo Codes</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-sm font-medium shadow-sm transition-colors"
                >
                    <Plus size={16} />
                    <span>Create Promo</span>
                </button>
            </div>

            <div className="bg-card shadow-sm rounded border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-1.5 border border-border rounded-sm bg-card placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                            placeholder="Search by code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={filteredPromos}
                    loading={loading}
                    emptyState="No promo codes found."
                />
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onConfirm={handleCreate}
                title="Create Promo Code"
                confirmText="Create"
                isLoading={isSubmitting}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Code Name</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded text-sm uppercase bg-card"
                            placeholder="e.g. SUMMER20"
                            value={newCode}
                            onChange={e => setNewCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Commission Rate (%)</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 border border-border rounded text-sm bg-card"
                            placeholder="e.g. 20"
                            value={newCommissionRate}
                            onChange={e => setNewCommissionRate(parseFloat(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Percentage of payments credited to the owner.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Applicable Plans</label>
                            <div className="space-y-1 mt-2">
                                {AVAILABLE_PLANS.map(plan => (
                                    <label key={plan} className="flex items-center space-x-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border text-blue-600 focus:ring-blue-500"
                                            checked={newPlans.includes(plan)}
                                            onChange={() => togglePlan(plan)}
                                        />
                                        <span>{plan}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Leave all unchecked to apply to any plan.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Expiry Date</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-border rounded text-sm bg-card"
                                value={newExpiry}
                                onChange={e => setNewExpiry(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Leave blank for no expiration.</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-foreground">Attached Offers</label>
                            <button
                                onClick={addOffer}
                                className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded text-foreground transition-colors border border-border"
                            >
                                + Add Offer
                            </button>
                        </div>
                        {newOffers.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No offers attached. This code will only track commissions.</p>
                        ) : (
                            <div className="space-y-2">
                                {newOffers.map((offer, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 border border-border rounded bg-muted/20">
                                        <select
                                            className="flex-1 px-2 py-1.5 text-xs border border-border rounded bg-card"
                                            value={offer.type}
                                            onChange={e => updateOffer(idx, 'type', e.target.value)}
                                        >
                                            <option value="limit">Limit Override</option>
                                            <option value="addon">Add-on Item</option>
                                        </select>
                                        <select
                                            className="flex-[2] px-2 py-1.5 text-xs border border-border rounded bg-card"
                                            value={offer.id}
                                            onChange={e => updateOffer(idx, 'id', e.target.value)}
                                        >
                                            <option value="" disabled>Select feature</option>
                                            {offer.type === 'limit' && LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            {offer.type === 'addon' && ADDON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            className="w-20 px-2 py-1.5 text-xs border border-border rounded bg-card"
                                            placeholder="Qty"
                                            value={offer.qty}
                                            onChange={e => updateOffer(idx, 'qty', parseFloat(e.target.value))}
                                        />
                                        <button
                                            onClick={() => removeOffer(idx)}
                                            className="text-muted-foreground hover:text-red-500 p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};
