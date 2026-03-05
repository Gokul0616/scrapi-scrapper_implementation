import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GlobalModal from '../GlobalModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AddReferralModal = ({ modalId, onSuccess }) => {
    const { closeModal } = useModal();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API}/billing/promo/validate`, { code }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.valid) {
                localStorage.setItem('scrapi_active_promo', res.data.code);
                if (onSuccess) onSuccess(res.data.code);
                closeModal();
                navigate('/upgrade-checkout');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid or expired referral code.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <GlobalModal
            modalId={modalId}
            title={<div className="font-bold text-[17px]">Assign a referral code to your account</div>}
            size="xs"
        >
            <div className="px-6 py-4">
                <div className="flex gap-3 mb-4">
                    <div className="mt-0.5"><Info className="w-5 h-5 text-muted-foreground fill-muted-foreground stroke-background" /></div>
                    <p className="text-[13px] text-foreground font-semibold leading-relaxed">
                        If an affiliate partner referred you to use Scrapi, here you can enter their unique code to track the referral. They will not receive any of your personal or account data.
                    </p>
                </div>

                <input
                    type="text"
                    placeholder="Referral code"
                    value={code}
                    onChange={e => { setCode(e.target.value); setError(''); }}
                    className={`w-full px-3 py-2.5 rounded-lg border bg-background text-[14px] text-foreground mb-2 transition-all outline-none ${error ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-border focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                />
                <div className="mb-4"></div>

                <div className="flex items-center justify-end gap-3">
                    <button onClick={closeModal} className="px-4 py-2 text-[14px] font-semibold text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !code.trim()}
                        className="px-5 py-2 text-[14px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </GlobalModal>
    );
};

export default AddReferralModal;
