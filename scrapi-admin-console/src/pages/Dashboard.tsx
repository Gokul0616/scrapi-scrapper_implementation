import React from 'react';
import { Users, Activity, Play, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { clsx } from 'clsx';

interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: string;
    trendDirection?: 'up' | 'down';
    icon: any;
    color: 'blue' | 'green' | 'orange' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, trendDirection, icon: Icon, color }) => {
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
            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    {trendDirection === 'up' ? (
                        <ArrowUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                    ) : (
                        <ArrowDown className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                    )}
                    <span className={clsx("ml-1 font-medium", trendDirection === 'up' ? "text-green-600" : "text-red-600")}>
                        {trend}
                    </span>
                    <span className="ml-2 text-aws-text-secondary">from last month</span>
                </div>
            )}
        </div>
    );
};

export const Dashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Users"
                    value="1,234"
                    trend="12%"
                    trendDirection="up"
                    icon={Users}
                    color="blue"
                />
                <MetricCard
                    title="Active Users (7d)"
                    value="856"
                    trend="5%"
                    trendDirection="up"
                    icon={Activity}
                    color="purple"
                />
                <MetricCard
                    title="Total Runs"
                    value="45.2k"
                    trend="8%"
                    trendDirection="up"
                    icon={Play}
                    color="orange"
                />
                <MetricCard
                    title="Success Rate"
                    value="94.2%"
                    trend="2%"
                    trendDirection="down"
                    icon={CheckCircle}
                    color="green"
                />
            </div>

            <div className="bg-white shadow-sm rounded border border-aws-border p-6">
                <h3 className="text-lg leading-6 font-medium text-aws-text mb-4">Recent Activity</h3>
                <div className="flow-root">
                    <ul className="-mb-8">
                        {[1, 2, 3, 4, 5].map((item, itemIdx) => (
                            <li key={item}>
                                <div className="relative pb-8">
                                    {itemIdx !== 4 ? (
                                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                    ) : null}
                                    <div className="relative flex space-x-3">
                                        <div>
                                            <span className={clsx(
                                                "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white",
                                                item % 2 === 0 ? "bg-green-500" : "bg-aws-blue"
                                            )}>
                                                {item % 2 === 0 ? <CheckCircle className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                            <div>
                                                <p className="text-sm text-aws-text-secondary">
                                                    {item % 2 === 0 ? 'Run completed successfully' : 'New scraping run started'}
                                                    <span className="font-medium text-aws-text"> Google Maps Scraper</span>
                                                </p>
                                            </div>
                                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                <time dateTime="2020-09-20">{item}h ago</time>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};
