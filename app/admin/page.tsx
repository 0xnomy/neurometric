'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, Globe, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface Stats {
    totalQueries: number;
    uniqueVisitors: number;
    countries: Record<string, number>;
    topQueries: Array<{ query: string; count: number }>;
    recentQueries: Array<{
        timestamp: string;
        query: string;
        ip: string;
        country: string;
        city: string;
        success: boolean;
    }>;
    errorRate: number;
    timeRange: { first: string; last: string } | null;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [secret, setSecret] = useState('');
    const [authenticated, setAuthenticated] = useState(false);

    const fetchStats = async (token: string) => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                setError('Invalid admin secret');
                setAuthenticated(false);
                return;
            }

            const data = await response.json();
            setStats(data);
            setAuthenticated(true);
            setError('');
        } catch (err) {
            setError('Failed to fetch stats');
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        fetchStats(secret);
    };

    useEffect(() => {
        // Auto-refresh every 30 seconds if authenticated
        if (authenticated && secret) {
            const interval = setInterval(() => fetchStats(secret), 30000);
            return () => clearInterval(interval);
        }
    }, [authenticated, secret]);

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-8 max-w-md w-full">
                    <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-400" />
                        Admin Dashboard
                    </h1>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Admin Secret</label>
                            <input
                                type="password"
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter admin secret"
                            />
                        </div>
                        {error && (
                            <div className="text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition-colors"
                        >
                            Access Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading || !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-indigo-400" />
                        NeuroMetric Analytics Dashboard
                    </h1>
                    <p className="text-slate-400 mt-2">Real-time query analytics and visitor tracking</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            <span className="text-2xl font-bold text-white">{stats.uniqueVisitors}</span>
                        </div>
                        <div className="text-sm text-slate-400">Unique Visitors</div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <span className="text-2xl font-bold text-white">{stats.totalQueries}</span>
                        </div>
                        <div className="text-sm text-slate-400">Total Queries</div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Globe className="w-5 h-5 text-blue-400" />
                            <span className="text-2xl font-bold text-white">{Object.keys(stats.countries).length}</span>
                        </div>
                        <div className="text-sm text-slate-400">Countries</div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-2xl font-bold text-white">{stats.errorRate}%</span>
                        </div>
                        <div className="text-sm text-slate-400">Error Rate</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Top Queries */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                            Top Queries
                        </h2>
                        <div className="space-y-3">
                            {stats.topQueries.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="text-sm text-slate-300 truncate flex-1 mr-4">{item.query}</div>
                                    <div className="text-xs font-mono bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded">
                                        {item.count}x
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Countries */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-indigo-400" />
                            Visitor Countries
                        </h2>
                        <div className="space-y-3">
                            {Object.entries(stats.countries)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 10)
                                .map(([country, count], idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="text-sm text-slate-300">{country}</div>
                                        <div className="text-xs font-mono bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                                            {count}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Recent Queries */}
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        Recent Queries
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-slate-400 border-b border-slate-800">
                                    <th className="pb-3">Time</th>
                                    <th className="pb-3">Query</th>
                                    <th className="pb-3">Location</th>
                                    <th className="pb-3">IP</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-slate-300">
                                {stats.recentQueries.map((q, idx) => (
                                    <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                        <td className="py-3 text-xs text-slate-500">
                                            {new Date(q.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="py-3 max-w-xs truncate">{q.query}</td>
                                        <td className="py-3 text-xs">
                                            {q.city}, {q.country}
                                        </td>
                                        <td className="py-3 text-xs font-mono text-slate-500">{q.ip}</td>
                                        <td className="py-3">
                                            {q.success ? (
                                                <span className="text-green-400 text-xs">✓</span>
                                            ) : (
                                                <span className="text-red-400 text-xs">✗</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
