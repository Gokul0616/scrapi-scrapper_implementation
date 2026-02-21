import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Controls state
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const [timeAgg, setTimeAgg] = useState('Daily'); // 'Daily' | 'Monthly'
    const [viewType, setViewType] = useState('Absolute'); // 'Absolute' | 'Cumulative'

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

    const monthOptions = useMemo(() => {
        const opts = [];
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        for (let i = 0; i < 24; i++) { // Generate past 24 months
            const y = date.getFullYear();
            const m = date.getMonth() + 1;
            const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            const value = `${y}-${m.toString().padStart(2, '0')}`;
            opts.push({ label, value });
            date.setMonth(date.getMonth() - 1);
        }
        return opts;
    }, []);

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
                <div className="flex items-center bg-muted rounded-md border border-border p-1">
                    <button
                        onClick={() => setTimeAgg('Daily')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeAgg === 'Daily' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setTimeAgg('Monthly')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeAgg === 'Monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Monthly
                    </button>
                </div>

                {/* Right Side: Month Selection & View Type Tab */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-end">
                        <div className="flex items-center">
                            <button onClick={handlePrevMonth} className="p-1 border border-border border-r-0 rounded-l-md hover:bg-muted text-foreground bg-card">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={handleNextMonth} className="p-1 border border-border border-r-0 hover:bg-muted text-foreground bg-card">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <select
                                value={`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`}
                                onChange={handleMonthChange}
                                className="pl-3 pr-8 py-1.5 text-sm font-medium border border-border rounded-r-md bg-card focus:outline-none appearance-none cursor-pointer"
                                style={{ backgroundPosition: 'right 0.5rem center' }}
                            >
                                {monthOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center bg-muted rounded-md border border-border p-1">
                        <button
                            onClick={() => setViewType('Absolute')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewType === 'Absolute' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Absolute
                        </button>
                        <button
                            onClick={() => setViewType('Cumulative')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewType === 'Cumulative' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
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
                    <div className="flex items-center justify-center h-full min-h-[400px] text-red-500">
                        {error}
                    </div>
                ) : (
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 30, left: 0, bottom: 50 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => {
                                        if (timeAgg === 'Monthly') return val.split('-').slice(0, 2).join('-');
                                        return val;
                                    }}
                                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                    tickMargin={10}
                                    angle={-45}
                                    textAnchor="end"
                                />
                                <YAxis
                                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    wrapperStyle={{ paddingLeft: '20px', fontSize: '13px' }}
                                />
                                <Bar
                                    dataKey="Actor compute units"
                                    stackId="a"
                                    fill={COLORS[0]}
                                    style={{ fill: `url(#stripePattern)` }}
                                />
                                <defs>
                                    <pattern id="stripePattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                                        <rect width="4" height="8" fill={COLORS[4]} />
                                        <rect x="4" width="4" height="8" fill="#fff" fillOpacity="0.2" />
                                    </pattern>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Actors Usage Table */}
            {!isLoading && !error && data && data.actor_usage.length > 0 && (
                <div className="border border-border rounded-lg bg-card overflow-hidden mt-6">
                    <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-foreground">Usage by Actors</h3>
                        <span className="text-muted-foreground w-4 h-4 rounded-full border border-current inline-flex items-center justify-center text-[10px]">?</span>
                    </div>
                    <div className="w-full">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-sm text-foreground">
                                    <th className="px-5 py-3 font-medium text-foreground">Actor</th>
                                    <th className="px-5 py-3 font-medium text-right text-foreground">Total usage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.actor_usage.map((actor, i) => (
                                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-xl bg-white relative">
                                                    {actor.actor_icon ? (
                                                        <img src={actor.actor_icon} alt={actor.actor_name} className="w-full h-full object-cover rounded" />
                                                    ) : (
                                                        <span>🌐</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-foreground">{actor.actor_name}</div>
                                                    <div className="text-xs text-muted-foreground hidden sm:block">compass/{actor.actor_id.toLowerCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium text-foreground text-sm">
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
