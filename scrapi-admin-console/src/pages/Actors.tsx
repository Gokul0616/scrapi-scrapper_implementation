import React, { useEffect, useState } from 'react';
import { Search, Star, CheckCircle, Box, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import type { Actor } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Card Grid Skeleton
const ActorsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded"></div>
        <div className="h-4 w-64 bg-muted/50 rounded"></div>

        {/* Filters */}
        <div className="flex space-x-4 bg-card p-4 rounded shadow-sm border border-border">
            <div className="flex-1 h-10 bg-muted rounded"></div>
            <div className="w-48 h-10 bg-muted rounded"></div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-lg shadow-sm border border-border p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                            <div className="h-12 w-12 bg-muted rounded"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-40 bg-muted rounded"></div>
                                <div className="h-4 w-full bg-muted/50 rounded"></div>
                                <div className="h-4 w-3/4 bg-muted/50 rounded"></div>
                                <div className="flex space-x-4 mt-3">
                                    <div className="h-3 w-16 bg-muted rounded"></div>
                                    <div className="h-3 w-24 bg-muted rounded"></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <div className="h-8 w-8 bg-muted rounded-full"></div>
                            <div className="h-8 w-8 bg-muted rounded-full"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const ActorsPage: React.FC = () => {
    const [actors, setActors] = useState<Actor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [error, setError] = useState<string | null>(null);

    // Fetch actors
    const fetchActors = async () => {
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            if (!token) throw new Error('No token found');

            const queryParams = new URLSearchParams();
            if (search) queryParams.append('search', search);
            if (categoryFilter !== 'All') queryParams.append('category', categoryFilter);

            const response = await fetch(`${BACKEND_URL}/api/admin/actors?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch actors');
            const data = await response.json();
            setActors(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load actors');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(fetchActors, 300);
        return () => clearTimeout(debounce);
    }, [search, categoryFilter]);

    // Actions
    const toggleVerify = async (actorId: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            await fetch(`${BACKEND_URL}/api/admin/actors/${actorId}/verify?verified=${!currentStatus}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Optimistic update
            setActors(actors.map(a => a.id === actorId ? { ...a, is_verified: !currentStatus } : a));
        } catch (err) {
            console.error('Failed to update verification', err);
        }
    };

    const toggleFeature = async (actorId: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem('scrapi_admin_token');
            const res = await fetch(`${BACKEND_URL}/api/admin/actors/${actorId}/feature?featured=${!currentStatus}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.detail || 'Failed to update feature status');
                return;
            }

            // Optimistic update
            setActors(actors.map(a => a.id === actorId ? { ...a, is_featured: !currentStatus } : a));
        } catch (err) {
            console.error('Failed to update feature status', err);
        }
    };

    if (loading && actors.length === 0) return <ActorsSkeleton />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Actor Marketplace</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage, verify, and feature scrapers.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-4 bg-card p-4 rounded shadow-sm border border-border">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-card placeholder-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        placeholder="Search actors..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="w-48">
                    <select
                        className="block w-full pl-3 pr-10 py-2 text-base bg-card text-foreground border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        <option value="Maps & Location">Maps & Location</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="Social Media">Social Media</option>
                        <option value="General">General</option>
                    </select>
                </div>
            </div>

            {/* Actors List */}
            {error ? (
                <div className="text-center py-12 text-destructive">{error}</div>
            ) : actors.length === 0 ? (
                <div className="text-center py-12 bg-card rounded shadow-sm border border-dashed border-border">
                    <Box className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No actors found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {actors.map((actor) => (
                        <div key={actor.id} className="bg-card rounded-lg shadow-sm border border-border p-5 hover:shadow-md hover:-translate-y-1 transition-all">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4">
                                    <div className="text-3xl">{actor.icon || '📦'}</div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-lg font-medium text-foreground">{actor.name}</h3>
                                            {actor.is_verified && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Verified
                                                </span>
                                            )}
                                            {actor.is_featured && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                                    <Star className="w-3 h-3 mr-1 fill-current" /> Featured
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{actor.description}</p>
                                        <div className="flex items-center space-x-4 mt-3 text-[12px] text-muted-foreground/80">
                                            <span>Runs: {actor.runs_count}</span>
                                            <span>Author: {actor.author_name || 'Unknown'}</span>
                                            <span>Updated: {actor.updated_at ? new Date(actor.updated_at).toLocaleDateString() : 'Unknown'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => toggleFeature(actor.id, actor.is_featured)}
                                        className={clsx(
                                            "p-2 rounded-full hover:bg-muted/50 transition-colors",
                                            actor.is_featured ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        title={actor.is_featured ? "Remove from Featured" : "Add to Featured"}
                                    >
                                        <Star className={clsx("w-5 h-5", actor.is_featured && "fill-current")} />
                                    </button>
                                    <button
                                        onClick={() => toggleVerify(actor.id, actor.is_verified)}
                                        className={clsx(
                                            "p-2 rounded-full hover:bg-muted/50 transition-colors",
                                            actor.is_verified ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        title={actor.is_verified ? "Revoke Verification" : "Verify Actor"}
                                    >
                                        <Shield className={clsx("w-5 h-5", actor.is_verified && "fill-current")} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
