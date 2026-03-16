import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import CustomBarChart, { SERVICE_THEMES } from './CustomBarChart';
import CustomDropdown from './CustomDropdown';
import CustomTooltip from './CustomTooltip';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HistoricalUsageView = ({ currentWorkspace }) => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Controls state
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const [timeAgg, setTimeAgg] = useState('Daily'); // 'Daily' | 'Monthly'
    const [viewType, setViewType] = useState('Absolute'); // 'Absolute' | 'Cumulative'

    const creationDate = useMemo(() => {
        return user?.created_at ? new Date(user.created_at) : new Date(2025, 0, 1);
    }, [user]);

    const fetchHistoricalData = async (month, year) => {
        try {
            setIsLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API}/billing/historical`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { month, year } // e.g. month=10, year=2025
            });
            setData(response.data);
        } catch (err) {
            console.error('Error fetching historical data:', err);
            setError('Failed to load historical usage');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentWorkspace) {
            fetchHistoricalData(selectedMonth, selectedYear);
        }
    }, [currentWorkspace, selectedMonth, selectedYear]);

    const handlePrevMonth = () => {
        if (selectedYear === creationDate.getFullYear() && selectedMonth === (creationDate.getMonth() + 1)) {
            return;
        }

        let m = selectedMonth - 1;
        let y = selectedYear;
        if (m < 1) {
            m = 12;
            y -= 1;
        }
        setSelectedMonth(m);
        setSelectedYear(y);
    };

    const handleNextMonth = () => {
        if (selectedYear === currentDate.getFullYear() && selectedMonth === (currentDate.getMonth() + 1)) {
            return;
        }

        let m = selectedMonth + 1;
        let y = selectedYear;
        if (m > 12) {
            m = 1;
            y += 1;
        }
        setSelectedMonth(m);
        setSelectedYear(y);
    };

    const handleMonthChange = (val) => {
        const [y, m] = val.split('-');
        setSelectedYear(parseInt(y));
        setSelectedMonth(parseInt(m));
    };

    const keysPressed = useRef(new Set());

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            keysPressed.current.add(e.key.toLowerCase());

            const isZHeld = keysPressed.current.has('z');

            if (isZHeld && e.key === 'ArrowLeft') {
                const prevBtn = document.getElementById('prev-month-btn');
                if (prevBtn && !prevBtn.disabled) prevBtn.click();
            } else if (isZHeld && e.key === 'ArrowRight') {
                const nextBtn = document.getElementById('next-month-btn');
                if (nextBtn && !nextBtn.disabled) nextBtn.click();
            }
        };

        const handleKeyUp = (e) => {
            keysPressed.current.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const monthOptions = useMemo(() => {
        const opts = [];
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        for (let i = 0; i < 24; i++) {
            const y = date.getFullYear();
            const m = date.getMonth() + 1;

            if (y < creationDate.getFullYear() || (y === creationDate.getFullYear() && m < (creationDate.getMonth() + 1))) {
                break;
            }

            const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            const value = `${y}-${m.toString().padStart(2, '0')}`;
            opts.push({ label, value });
            date.setMonth(date.getMonth() - 1);
        }
        return opts;
    }, [creationDate]);

    const chartData = useMemo(() => {
        if (!data || !data.daily_usage) return [];

        const usageKeys = [
            'Actor compute units',
            'Actors - paid for events',
            'Proxy SERPs',
            'Proxy residential data transfer',
            'Data transfer internal',
            'Data transfer external',
            'Dataset timed storage',
            'Dataset reads',
            'Dataset writes',
            'Key-value store timed storage',
            'Key-value store reads',
            'Key-value store writes',
            'Key-value store lists',
            'Request queue timed storage',
            'Request queue reads',
            'Request queue writes',
            'Paid Actors (monthly rental)',
            'Actors - paid for results',
            'Actors - paid for events'
        ];
        let baseData = data.daily_usage;

        if (timeAgg === 'Monthly') {
            const totals = {};
            usageKeys.forEach(key => {
                totals[key] = data.daily_usage.reduce((acc, curr) => acc + (curr[key] || 0), 0);
            });
            baseData = [{
                date: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`,
                formattedDate: new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'short' }),
                ...totals
            }];
        }

        if (viewType === 'Cumulative') {
            const cumulativeTotals = {};
            usageKeys.forEach(key => {
                cumulativeTotals[key] = 0;
            });

            return baseData.map(day => {
                const dayWithCumulative = { ...day };
                usageKeys.forEach(key => {
                    cumulativeTotals[key] += (day[key] || 0);
                    dayWithCumulative[key] = cumulativeTotals[key];
                });
                return dayWithCumulative;
            });
        }

        return baseData;
    }, [data, timeAgg, viewType, selectedMonth, selectedYear]);

    // Dynamically get the services the backend returned so the legend only shows active ones
    const activeServices = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];
        const keys = new Set();
        chartData.forEach(day => {
            Object.keys(day).forEach(key => {
                if (key !== 'date' && key !== 'formattedDate' && SERVICE_THEMES[key]) {
                    keys.add(key);
                }
            });
        });

        // Define a preferred order to match Apify's UI structure
        const preferredOrder = [
            'Actor compute units',
            'Actors - paid for events',
            'Proxy SERPs',
            'Proxy residential data transfer',
            'Data transfer internal',
            'Data transfer external',
            'Dataset timed storage',
            'Dataset reads',
            'Dataset writes',
            'Key-value store timed storage',
            'Key-value store reads',
            'Key-value store writes',
            'Key-value store lists',
            'Request queue timed storage',
            'Request queue reads',
            'Request queue writes',
            'Paid Actors (monthly rental)',
            'Actors - paid for results'
        ];

        return preferredOrder.filter(k => keys.has(k));
    }, [chartData]);

    // Stable pattern-id helper matching CustomBarChart
    const pid = (key) => `stripe-${key.replace(/[\s()/-]+/g, '-').toLowerCase()}`;

    return (
        <div className="space-y-2 w-full mx-auto">
            {/* Hidden SVG defs – shared across legend + tooltip pattern dots */}
            <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
                <defs>
                    {Object.entries(SERVICE_THEMES).filter(([, t]) => t.pattern).map(([key, t]) => (
                        <pattern
                            key={key}
                            id={pid(key)}
                            patternUnits="userSpaceOnUse"
                            width="6"
                            height="6"
                            patternTransform="rotate(45)"
                        >
                            <rect width="6" height="6" fill="white" opacity="0.6" />
                            <rect width="3" height="6" fill={t.color} />
                        </pattern>
                    ))}
                </defs>
            </svg>

            {/* Info text */}
            <p className="text-sm text-muted-foreground leading-relaxed">
                Here you can view your raw platform usage, which does not reflect free Actor compute units
                or other discounts from your subscription plan. See actual billed amounts in the{' '}
                <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => navigate('/billing?tab=current')}>Current period</span> or past{' '}
                <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => navigate('/billing?tab=invoices')}>Invoices</span>.
            </p>

            {/* Month selector row – right-aligned, outside the chart card */}
            <div className="flex justify-end items-center gap-0.5">
                <CustomTooltip content="Previous Month (z + ←)">
                    <button
                        id="prev-month-btn"
                        onClick={handlePrevMonth}
                        disabled={selectedYear === creationDate.getFullYear() && selectedMonth === (creationDate.getMonth() + 1)}
                        className="p-1 border border-border rounded-l-md bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </CustomTooltip>
                <CustomTooltip content="Next Month (z + →)">
                    <button
                        id="next-month-btn"
                        onClick={handleNextMonth}
                        disabled={selectedYear === currentDate.getFullYear() && selectedMonth === (currentDate.getMonth() + 1)}
                        className="p-1 border border-border rounded-r-md bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-l-0"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </CustomTooltip>
                <div className="ml-2">
                    <CustomDropdown
                        value={`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`}
                        onChange={handleMonthChange}
                        options={monthOptions}
                    />
                </div>
            </div>

            {/* ── Main chart card ─────────────────────────────────────────────── */}
            <div
                className="bg-card rounded-lg border border-border"
                style={{ display: 'flex', flexDirection: 'column' }}
            >
                <div className="flex overflow-hidden rounded-lg ">

                    {/* ── Left: chart column ────── */}
                    <div className="flex-1 min-w-0 px-2 pt-2 pb-0 flex flex-col">
                        {/* Toggle bar: Daily/Monthly on left, Absolute/Cumulative on right */}
                        <div className="flex justify-between items-center mb-2 px-2">
                            {/* Daily / Monthly */}
                            <div className="flex items-center bg-muted rounded-md p-0.5 text-sm">
                                {['Daily', 'Monthly'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setTimeAgg(opt)}
                                        className={`px-3 py-1 rounded font-medium transition-all text-sm ${timeAgg === opt
                                            ? 'bg-white dark:bg-card text-foreground shadow-sm'
                                            : 'bg-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            {/* Absolute / Cumulative */}
                            <div className="flex items-center bg-muted rounded-md p-0.5 text-sm">
                                {['Absolute', 'Cumulative'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setViewType(opt)}
                                        className={`px-3 py-1 rounded font-medium transition-all text-sm ${viewType === opt
                                            ? 'bg-white dark:bg-card text-foreground shadow-sm'
                                            : 'bg-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Chart body – fills remaining height */}
                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center" style={{ minHeight: 400 }}>
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : error ? (
                            <div
                                className="flex-1 flex items-center justify-center text-destructive bg-destructive/10 rounded-lg p-4 border border-destructive/20 font-medium"
                                style={{ minHeight: 400 }}
                            >
                                {error}
                            </div>
                        ) : (
                            <div className="flex-1" style={{ minHeight: 400 }}>
                                <CustomBarChart data={chartData} timeAgg={timeAgg} viewType={viewType} />
                            </div>
                        )}
                    </div>

                    {/* ── Right: legend column ────── */}
                    <div className="shrink-0 border-l border-border px-3 py-3 w-52 hidden md:flex flex-col gap-2 justify-start pt-[56px]">
                        {activeServices.map(key => {
                            const theme = SERVICE_THEMES[key];
                            return (
                                <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                                    <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
                                        <circle cx="6" cy="6" r="6"
                                            fill={theme.pattern ? `url(#${pid(key)})` : theme.color} />
                                    </svg>
                                    <span className="truncate">{key}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Actors Usage Table ─────────────────────────────────────────── */}
            {!isLoading && !error && data && data.actor_usage.length > 0 && (
                <div className="border border-border rounded-lg bg-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground">Usage by Actors</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                                <th className="px-4 py-2 font-medium">Actor</th>
                                <th className="px-4 py-2 font-medium text-right">Total usage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.actor_usage.map((actor, i) => (
                                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center text-sm bg-white border border-border overflow-hidden">
                                                {actor.actor_icon
                                                    ? <img src={actor.actor_icon} alt={actor.actor_name} className="w-full h-full object-cover" />
                                                    : <span className="opacity-60">🌐</span>
                                                }
                                            </div>
                                            <div>
                                                <div className="font-medium text-[13px] text-foreground">{actor.actor_name}</div>
                                                <div className="text-[11px] text-muted-foreground hidden sm:block">
                                                    scrapi/{actor.actor_id?.toLowerCase().substring(0, 8)}…
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-semibold text-foreground text-sm">
                                        ${actor.total_usage.toFixed(5)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Actor Compute Units Row ────────────────────────────────────────── */}
            {!isLoading && !error && data && data.compute_units_cost !== undefined && (
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-lg mt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Actor compute units</span>
                        <CustomTooltip content="Total cost of platform compute resources (RAM/CPU) used by all runs.">
                            <span className="text-muted-foreground w-3.5 h-3.5 flex items-center justify-center border border-muted-foreground rounded-full text-[10px] cursor-help">?</span>
                        </CustomTooltip>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                        ${data.compute_units_cost.toFixed(5)}
                    </span>
                </div>
            )}

            {/* ── Storage Usage Table ─────────────────────────────────────────── */}
            {!isLoading && !error && data && data.storage_usage && (
                <div className="border border-border rounded-lg bg-card overflow-hidden mt-4">
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground">Usage by Storage</h3>
                            <CustomTooltip content="Includes timed storage (GB-hours) and API operations (reads/writes).">
                                <span className="text-muted-foreground w-3.5 h-3.5 flex items-center justify-center border border-muted-foreground rounded-full text-[10px] cursor-help">?</span>
                            </CustomTooltip>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                            ${data.storage_usage.total.toFixed(5)}
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                                <th className="px-4 py-2 font-medium">Service</th>
                                <th className="px-4 py-2 font-medium text-right">Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2.5 text-sm text-foreground">Timed storage</td>
                                <td className="px-4 py-2.5 text-right font-medium text-foreground text-sm">${data.storage_usage.timed_storage.toFixed(5)}</td>
                            </tr>
                            <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2.5 text-sm text-foreground">Reads</td>
                                <td className="px-4 py-2.5 text-right font-medium text-foreground text-sm">${data.storage_usage.reads.toFixed(5)}</td>
                            </tr>
                            <tr className="last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2.5 text-sm text-foreground">Writes</td>
                                <td className="px-4 py-2.5 text-right font-medium text-foreground text-sm">${data.storage_usage.writes.toFixed(5)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Proxy Usage Table ────────────────────────────────────────────── */}
            {!isLoading && !error && data && (
                <div className="border border-border rounded-lg bg-card overflow-hidden mt-4">
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground ">Usage by Proxy</h3>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                            $0.00000
                        </div>
                    </div>
                    <table className="w-full text-left font-sans">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                                <th className="px-4 py-2 font-medium">Item</th>
                                <th className="px-4 py-2 font-medium text-right">Usage / Units</th>
                                <th className="px-4 py-2 font-medium text-right">Price per unit</th>
                                <th className="px-4 py-2 font-medium text-right">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2 text-sm text-foreground">SERP</td>
                                <td className="px-4 py-2 text-right text-xs text-muted-foreground">0 requests</td>
                                <td className="px-4 py-2 text-right text-xs text-muted-foreground">-</td>
                                <td className="px-4 py-2 text-right font-medium text-foreground text-sm">$0.00000</td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2 text-sm text-foreground">Residential</td>
                                <td className="px-4 py-2 text-right text-xs text-muted-foreground">0.00 GB</td>
                                <td className="px-4 py-2 text-right text-xs text-muted-foreground">-</td>
                                <td className="px-4 py-2 text-right font-medium text-foreground text-sm">$0.00000</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Data Transfer Usage Table ─────────────────────────────────────── */}
            {!isLoading && !error && data && (
                <div className="border border-border rounded-lg bg-card overflow-hidden mt-4">
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground">Usage by Data Transfer</h3>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                            $0.00000
                        </div>
                    </div>
                    <table className="w-full text-left font-sans">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                                <th className="px-4 py-2 font-medium">Item</th>
                                <th className="px-4 py-2 font-medium text-right">Usage / Units</th>
                                <th className="px-4 py-2 font-medium text-right">Price per unit</th>
                                <th className="px-4 py-2 font-medium text-right">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2 text-sm text-foreground">Internal</td>
                                <td className="px-4 py-2 text-right text-xs text-muted-foreground">0.00 GB</td>
                                <td className="px-4 py-2 text-right text-xs text-muted-foreground">-</td>
                                <td className="px-4 py-2 text-right font-medium text-foreground text-sm">$0.00000</td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2 text-sm text-foreground">External</td>
                                <td className="px-4 py-2 text-right text-xs text-muted-foreground">0.00 GB</td>
                                <td className="px-4 py-2 text-right text-xs text-muted-foreground">-</td>
                                <td className="px-4 py-2 text-right font-medium text-foreground text-sm">$0.00000</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Total Summary Footer ────────────────────────────────────────── */}
            {!isLoading && !error && data && (
                <div className="flex justify-end p-4 bg-muted/20 border border-border rounded-lg mt-4 items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Month Usage</span>
                    <span className="text-xl font-bold text-foreground">
                        ${data.total_cost.toFixed(5)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default HistoricalUsageView;

