import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useModal } from '../../contexts/ModalContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Country, State, City } from 'country-state-city';
import GlobalModal from '../GlobalModal';
import CustomDropdown from '../CustomDropdown';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const EditBillingModal = ({ modalId, initialData, onSuccess }) => {
    const { closeModal } = useModal();
    const { currentWorkspace } = useWorkspace();
    const [formData, setFormData] = useState({
        full_name: '',
        company: '',
        tax_id: '',
        billing_email: '',
        street_address: '',
        custom_address_text: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        custom_goods_text: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                full_name: initialData.full_name || initialData.billing_full_name || '',
                company: initialData.company || initialData.billing_company || '',
                tax_id: initialData.tax_id || '',
                billing_email: initialData.billing_email || '',
                street_address: initialData.street_address || initialData.billing_street_address || '',
                custom_address_text: initialData.custom_address_text || '',
                city: initialData.city || initialData.billing_city || '',
                state: initialData.state || initialData.billing_state || '',
                postal_code: initialData.postal_code || initialData.billing_postal_code || '',
                country: initialData.country || initialData.billing_country || '',
                custom_goods_text: initialData.custom_goods_text || ''
            });
        }
    }, [initialData]);

    const findCountryCode = (countryName) => {
        if (!countryName) return '';
        const countries = Country.getAllCountries();
        const found = countries.find(c => c.name?.toLowerCase() === countryName.toLowerCase());
        return found ? found.isoCode : '';
    };

    const handleCountryChange = (countryName) => {
        setFormData(prev => ({
            ...prev,
            country: countryName,
            state: '',
            city: ''
        }));
    };

    const handleStateCode = (stateName, countryName) => {
        if (!stateName || !countryName) return '';
        const cCode = findCountryCode(countryName);
        if (!cCode) return '';
        const states = State.getStatesOfCountry(cCode);
        const found = states.find(s => s.name?.toLowerCase() === stateName.toLowerCase());
        return found ? found.isoCode : '';
    };

    const getCityOptions = () => {
        const cCode = findCountryCode(formData.country);
        const sCode = handleStateCode(formData.state, formData.country);
        if (!cCode || !sCode) return [];
        return City.getCitiesOfState(cCode, sCode).map(c => ({
            label: c.name,
            value: c.name
        }));
    };

    const handleStateChange = (stateName) => {
        setFormData(prev => ({
            ...prev,
            state: stateName,
            city: '' // Reset city when state changes
        }));
    };

    const handlePostalCodeChange = async (value) => {
        setFormData(prev => ({ ...prev, postal_code: value }));

        // Pincode Lookup (Only if 5 or 6 digits depending on country, but we'll try for any reasonable length)
        // Using Zippopotam for global lookup
        if (value.length >= 5) {
            try {
                // We'll try common country codes or use the currently selected country
                const countryCode = findCountryCode(formData.country) || 'IN';
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API}/billing/pincode-lookup`, {
                    params: { country_code: countryCode, pincode: value },
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.places && response.data.places.length > 0) {
                    const place = response.data.places[0];
                    setFormData(prev => ({
                        ...prev,
                        city: place['place name'],
                        state: place['state'],
                        country: response.data['country'] || prev.country
                    }));
                }
            } catch (err) {
                // Silently fail lookup
                console.debug('Pincode lookup failed:', err);
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const wsQuery = `workspace_id=${currentWorkspace.workspace_id}&workspace_type=${currentWorkspace.workspace_type}`;
            await axios.post(`${API}/billing/details?${wsQuery}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onSuccess) onSuccess(formData);
            closeModal();
        } catch (err) {
            console.error('Failed to save billing details:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
    const labelClass = "block text-[13px] font-semibold text-foreground mb-1.5";

    return (
        <GlobalModal
            modalId={modalId}
            title={<div className="flex-1 text-center font-bold text-lg">Edit billing details</div>}
            size="full"
            className="bg-gray-50 dark:bg-[#0A0A0A]"
        >
            <div className="max-w-3xl mx-auto py-6 px-6">

                <div className="mb-6">
                    <h3 className="text-[15px] font-bold text-foreground mb-3">Account</h3>
                    <div className="inline-flex items-center gap-3 p-2.5 pr-6 bg-muted/40 border border-border rounded-lg">
                        <div className="w-9 h-9 rounded-full bg-purple-500 text-white flex items-center justify-center font-semibold text-sm">
                            {(currentWorkspace?.workspace_name || currentWorkspace?.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-[14px] font-semibold text-foreground leading-tight">
                                {currentWorkspace?.workspace_name || currentWorkspace?.name || 'Personal'}
                            </div>
                            <div className="text-[12px] text-muted-foreground capitalize">
                                {currentWorkspace?.workspace_type || 'Personal'}
                            </div>
                        </div>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-3">
                        Not the right account? <button className="text-blue-600 font-semibold hover:underline" onClick={() => closeModal()}>Go back</button> and switch it in the menu.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Full name</label>
                            <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Tax ID <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <input type="text" value={formData.tax_id} onChange={e => setFormData({ ...formData, tax_id: e.target.value })} className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Company <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Billing email <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <input type="email" value={formData.billing_email} onChange={e => setFormData({ ...formData, billing_email: e.target.value })} className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Street address</label>
                            <input type="text" value={formData.street_address} onChange={e => setFormData({ ...formData, street_address: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Custom address text <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <input type="text" value={formData.custom_address_text} onChange={e => setFormData({ ...formData, custom_address_text: e.target.value })} className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Country</label>
                                <CustomDropdown
                                    value={formData.country}
                                    onChange={handleCountryChange}
                                    options={Country.getAllCountries().map(c => ({
                                        label: c.name,
                                        value: c.name
                                    }))}
                                    placeholder="Select country..."
                                    searchable={true}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>State</label>
                                <CustomDropdown
                                    value={formData.state}
                                    onChange={handleStateChange}
                                    options={formData.country ? State.getStatesOfCountry(findCountryCode(formData.country)).map(s => ({
                                        label: s.name,
                                        value: s.name
                                    })) : []}
                                    placeholder="Select state..."
                                    searchable={true}
                                    disabled={!formData.country}
                                />
                            </div>
                        </div>
                        <div className="row-span-2">
                            <label className={labelClass}>Custom goods text <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <textarea rows="4" value={formData.custom_goods_text} onChange={e => setFormData({ ...formData, custom_goods_text: e.target.value })} className={`${inputClass} resize-none h-full`} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>City</label>
                                <CustomDropdown
                                    value={formData.city}
                                    onChange={val => setFormData({ ...formData, city: val })}
                                    options={getCityOptions()}
                                    placeholder="Select city..."
                                    searchable={true}
                                    className="w-full"
                                    disabled={!formData.state}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Postal code / ZIP</label>
                                <input type="text" value={formData.postal_code} onChange={e => handlePostalCodeChange(e.target.value)} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-6 pb-6">
                        <button onClick={closeModal} className="px-5 py-2 text-[14px] font-semibold text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 text-[14px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

            </div>
        </GlobalModal>
    );
};

export default EditBillingModal;
