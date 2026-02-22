import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import CustomBarChart from './CustomBarChart';
import CustomDropdown from './CustomDropdown';
import CustomTooltip from './CustomTooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = [
    '#10b981', // emerald-500 (Actor compute units)
    '#f97316', // orange-500 (Proxy)
    '#8b5cf6', // violet-500 (Data transfer)
    '#06b6d4', // cyan-500 (Storage)
    '#f43f5e', // rose-500
    '#3b82f6', // blue-500
];

const HistoricalUsageView = ({ currentWorkspace }) => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
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
        // Prevent navigating past the account creation month/year
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
        // Prevent navigating past the current actual month/year
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

    const handleMonthChange = (e) => {
        const val = e.target.value;
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

            // Stop generating options before the account was created
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

        // Time aggregation: Daily vs Monthly
        // For now, if "Monthly" is selected, we just sum up the whole month to a single bar.
        // In Apify, "Monthly" spans the whole year, but since our API returns data per month, we will just show 1 bar.
        let baseData = data.daily_usage;
        if (timeAgg === 'Monthly') {
            const totalUnits = baseData.reduce((acc, curr) => acc + (curr['Actor compute units'] || 0), 0);
            baseData = [{
                date: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`,
                'Actor compute units': totalUnits
            }];
        }

        // Amount type: Absolute vs Cumulative
        if (viewType === 'Cumulative') {
            let cumulativeSum = 0;
            return baseData.map(day => {
                cumulativeSum += (day['Actor compute units'] || 0);
                return {
                    ...day,
                    'Actor compute units': cumulativeSum
                };
            });
        }

        return baseData;
    }, [data, timeAgg, viewType, selectedMonth, selectedYear]);

    return (
        <div className="space-y-6">
            <div className="text-sm text-foreground">
                Here you can view your raw platform usage, which does not reflect free Actor compute units or other discounts from your subscription plan. See actual billed amounts in the <span className="text-blue-500 cursor-pointer hover:underline">Current period</span> or past <span className="text-blue-500 cursor-pointer hover:underline">Invoices</span>.
            </div>

            {/* Controls Container */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-card rounded-t-lg border-t border-l border-r border-border p-4 gap-4">
                {/* Left Side: Time Aggregation Tab */}
                <div className="flex items-center bg-muted rounded-md border border-border p-0.5">
                    <button
                        onClick={() => setTimeAgg('Daily')}
                        className={`px-3.5 py-1 text-sm font-medium rounded-md transition-colors ${timeAgg === 'Daily' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setTimeAgg('Monthly')}
                        className={`px-3.5 py-1 text-sm font-medium rounded-md transition-colors ${timeAgg === 'Monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Monthly
                    </button>
                </div>

                {/* Right Side: Month Selection & View Type Tab */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-end">
                        <div className="flex items-center">
                            <CustomTooltip content="Previous Month (z + ←)">
                                <button
                                    id="prev-month-btn"
                                    onClick={handlePrevMonth}
                                    className={`p-1 border border-border border-r-0 rounded-l-md text-foreground m-0.5 bg-card ${selectedYear === creationDate.getFullYear() && selectedMonth === (creationDate.getMonth() + 1) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`}
                                    disabled={selectedYear === creationDate.getFullYear() && selectedMonth === (creationDate.getMonth() + 1)}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            </CustomTooltip>
                            <CustomTooltip content="Next Month (z + →)">
                                <button
                                    id="next-month-btn"
                                    onClick={handleNextMonth}
                                    className={`p-1 border border-border border-r-0 text-foreground m-0.5 bg-card ${selectedYear === currentDate.getFullYear() && selectedMonth === (currentDate.getMonth() + 1) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`}
                                    disabled={selectedYear === currentDate.getFullYear() && selectedMonth === (currentDate.getMonth() + 1)}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </CustomTooltip>
                            <div className="ml-3 flex h-9">
                                <CustomDropdown
                                    value={`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`}
                                    onChange={handleMonthChange}
                                    options={monthOptions}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center bg-muted rounded-md border border-border p-0.5">
                        <button
                            onClick={() => setViewType('Absolute')}
                            className={`px-3.5 py-1 text-sm font-medium rounded-md transition-colors ${viewType === 'Absolute' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Absolute
                        </button>
                        <button
                            onClick={() => setViewType('Cumulative')}
                            className={`px-3.5 py-1 text-sm font-medium rounded-md transition-colors ${viewType === 'Cumulative' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Cumulative
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile View Type Tab (wrap under) */}
            <div className="sm:hidden flex items-center justify-center bg-muted rounded-md border border-border p-1 w-full mx-auto max-w-sm mt-[-10px] mb-4">
                <button
                    onClick={() => setViewType('Absolute')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${viewType === 'Absolute' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Absolute
                </button>
                <button
                    onClick={() => setViewType('Cumulative')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${viewType === 'Cumulative' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Cumulative
                </button>
            </div>

            {/* Chart Section */}
            <div className="bg-card border-x border-b border-border rounded-b-lg p-6 min-h-[400px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full min-h-[400px] text-destructive bg-destructive/10 rounded-lg max-w-sm mx-auto my-auto p-4 border border-destructive/20 font-medium">
                        {error}
                    </div>
                ) : (
                    <div className="h-[400px] w-full">
                        <CustomBarChart data={chartData} timeAgg={timeAgg} viewType={viewType} />
                    </div>
                )}
            </div>

            {/* Actors Usage Table */}
            {!isLoading && !error && data && data.actor_usage.length > 0 && (
                <div className="border border-border rounded-lg bg-card overflow-hidden mt-4">
                    <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                        <h3 className="font-semibold text-[14px] text-foreground">Usage by Actors</h3>
                    </div>
                    <div className="w-full">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-[12px] text-foreground">
                                    <th className="px-3 py-1.5 font-medium text-foreground">Actor</th>
                                    <th className="px-3 py-1.5 font-medium text-right text-foreground">Total usage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.actor_usage.map((actor, i) => (
                                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center text-sm bg-white relative">
                                                    {actor.actor_icon ? (
                                                        <img src={actor.actor_icon} alt={actor.actor_name} className="w-full h-full object-cover rounded" />
                                                    ) : (
                                                        <span>🌐</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-[13px] text-foreground">{actor.actor_name}</div>
                                                    <div className="text-[10px] text-muted-foreground hidden sm:block">compass/{actor.actor_id.toLowerCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-foreground text-[13px]">
                                            ${actor.total_usage.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricalUsageView;
