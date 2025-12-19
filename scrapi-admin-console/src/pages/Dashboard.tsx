import React, { useEffect, useState } from 'react';
import { Users, Activity, Play, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: string;
    trendDirection?: 'up' | 'down';
    icon: any;
    color: 'blue' | 'green' | 'orange' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        blue: 'text-aws-blue',
        green: 'text-green-600',
        orange: 'text-aws-orange',
        purple: 'text-purple-600',
    };

    return (
        <div className="bg-white rounded shadow-sm p-6 border border-aws-border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-aws-text-secondary truncate">{title}</p>
                    <div className="mt-1 flex items-baseline">
                        <p className="text-3xl font-semibold text-aws-text">{value}</p>
                    </div>
                </div>
                <div className={clsx("p-3 rounded-full bg-gray-50", colorClasses[color])}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
};

// Dashboard Skeleton Loader
const DashboardSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded shadow-sm p-6 border border-aws-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                        </div>
                        <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    </div>
                </div>
            ))}
        </div>

        {/* Recent Activity Skeleton */}
        <div className="bg-white shadow-sm rounded border border-aws-border p-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex space-x-3">
                        <div className="h-8 w-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between">
                                <div className="h-4 w-64 bg-gray-200 rounded"></div>
                                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-3 w-32 bg-gray-100 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

interface DashboardStats {
    total_users: number;
    active_users_7d: number;
    total_runs: number;
    success_rate: number;
    recent_activity: Array<{
        id: string;
        type: string;
        status: string;
        actor_name: string;
        hours_ago: number;
    }>;
}

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('scrapi_admin_token');
                if (!token) throw new Error('No token found');

                const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch stats');
                }

                const data = await response.json();
                setStats(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <DashboardSkeleton />;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Users"
                    value={stats.total_users.toLocaleString()}
                    icon={Users}
                    color="blue"
                />
                <MetricCard
                    title="Active Users (7d)"
                    value={stats.active_users_7d.toLocaleString()}
                    icon={Activity}
                    color="purple"
                />
                <MetricCard
                    title="Total Runs"
                    value={stats.total_runs.toLocaleString()}
                    icon={Play}
                    color="orange"
                />
                <MetricCard
                    title="Success Rate"
                    value={`${stats.success_rate}%`}
                    icon={CheckCircle}
                    color="green"
                />
            </div>

            <div className="bg-white shadow-sm rounded border border-aws-border p-6">
                <h3 className="text-lg leading-6 font-medium text-aws-text mb-4">Recent Activity</h3>
                <div className="flow-root">
                    <ul className="-mb-8">
                        {stats.recent_activity.map((item, itemIdx) => (
                            <li key={item.id}>
                                <div className="relative pb-8">
                                    {itemIdx !== stats.recent_activity.length - 1 ? (
                                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                    ) : null}
                                    <div className="relative flex space-x-3">
                                        <div>
                                            <span className={clsx(
                                                "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white",
                                                item.status === 'succeeded' ? "bg-green-500" : 
                                                item.status === 'failed' ? "bg-red-500" : "bg-aws-blue"
                                            )}>
                                                {item.status === 'succeeded' ? <CheckCircle className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                            <div>
                                                <p className="text-sm text-aws-text-secondary">
                                                    {item.status === 'succeeded' ? 'Run completed successfully' : `Run ${item.status}`}
                                                    <span className="font-medium text-aws-text"> {item.actor_name}</span>
                                                </p>
                                            </div>
                                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                <time>{item.hours_ago === 0 ? 'Just now' : `${item.hours_ago}h ago`}</time>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {stats.recent_activity.length === 0 && (
                            <p className="text-sm text-gray-500 italic">No recent activity found.</p>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};
