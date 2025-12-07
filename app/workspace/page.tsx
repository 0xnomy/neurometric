'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Activity, Terminal, Loader2, ChevronRight, Brain, Table2, Home, Github, FileText, ExternalLink, Sparkles, Filter } from 'lucide-react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { initDuckDB, DuckDBConnection } from '../../lib/duckdb';
import MethodologyModal from '../components/MethodologyModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ThreeBrain = dynamic(() => import('../components/ThreeBrain'), { ssr: false });
const Topomap = dynamic(() => import('../components/Topomap'), { ssr: false });
const ClusterMap = dynamic(() => import('../components/ClusterMap'), { ssr: false });

// ==========================================
// DuckDB Init Helper with Extension Bundling
// ==========================================
// Helper removed (imported from lib)

// ==========================================
// Types
// ==========================================
type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sql?: string;
    data?: Record<string, unknown>[];
    insight?: string;
    timestamp: number;
};

export default function Workspace() {
    // State
    const [, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
    const [conn, setConn] = useState<duckdb.AsyncDuckDBConnection | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [loadingStep, setLoadingStep] = useState('Initializing Engine...');

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<'table' | 'raw' | 'brain' | 'topomap' | 'clusters'>('table');
    const [showMethodology, setShowMethodology] = useState(false);
    const [selectedWindowIndex, setSelectedWindowIndex] = useState<number>(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize DB on Mount
    useEffect(() => {
        let active = true;
        let dbInstance: duckdb.AsyncDuckDB | null = null;

        const startDB = async () => {
            try {
                setLoadingStep('Booting DuckDB-Wasm...');
                const database = await initDuckDB();
                if (!active) return;

                dbInstance = database;
                setDb(database);

                setLoadingStep('Connecting...');
                const connection = await database.connect();
                if (!active) {
                    await connection.close();
                    return;
                }
                setConn(connection);

                setLoadingStep('Mounting Parquet Tables...');
                // Load Tables via HTTP with parquet extension pre-loaded
                const baseUrl = window.location.origin;

                // Register parquet extension without INSTALL (use bundled version)
                await connection.query(`
          LOAD httpfs;
          CREATE TABLE features AS SELECT * FROM read_parquet('${baseUrl}/eeg_features.parquet');
          CREATE TABLE subjects AS SELECT * FROM read_parquet('${baseUrl}/eeg_subjects.parquet');
        `);

                if (active) {
                    setLoadingStep('Ready');
                    setIsReady(true);
                }
            } catch (e) {
                console.error(e);
                if (active) setLoadingStep('Error: ' + String(e));
            }
        };

        startDB();

        return () => {
            active = false;
            if (conn) {
                conn.close().catch(console.error);
            }
            if (dbInstance) {
                dbInstance.terminate().catch(console.error);
            }
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle Query
    const handleSend = async (overrideInput?: string) => {
        const userQuery = overrideInput || input;
        if (!userQuery.trim() || processing || !conn) return;

        setInput('');
        setProcessing(true);

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userQuery, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        try {
            // 1. Planner Agent (Get SQL)
            const planRes = await fetch('/api/chat', {
                method: 'POST',
                body: JSON.stringify({ query: userQuery, stage: 'plan' })
            });
            const plan = await planRes.json();

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: plan.thought || 'Executing query...',
                sql: plan.sql,
                timestamp: Date.now()
            };

            // 2. Execute SQL
            if (plan.sql) {
                try {
                    const arrowResult = await conn.query(plan.sql);

                    // Convert Arrow Table to JSON and handle BigInts early
                    const resultData = arrowResult.toArray().map((row: unknown) => {
                        const jsonRow = (row as { toJSON: () => Record<string, unknown> }).toJSON();
                        // Pre-process BigInts to Strings/Numbers for cleaner consumption
                        const processedRow: Record<string, unknown> = {};
                        Object.entries(jsonRow).forEach(([k, v]) => {
                            if (typeof v === 'bigint') {
                                // Convert to number if safe, else string
                                processedRow[k] = v <= Number.MAX_SAFE_INTEGER ? Number(v) : v.toString();
                            } else {
                                processedRow[k] = v;
                            }
                        });
                        return processedRow;
                    });

                    assistantMsg.data = resultData;

                    // 3. Insight Agent
                    if (resultData.length > 0) {
                        const insightRes = await fetch('/api/chat', {
                            method: 'POST',
                            body: JSON.stringify({ query: userQuery, stage: 'insight', sqlResults: resultData.slice(0, 20) })
                        });
                        const insightData = await insightRes.json();
                        assistantMsg.insight = insightData.insight;
                    }
                } catch (sqlErr) {
                    assistantMsg.content += `\n\nSQL Error: ${String(sqlErr)}`;
                }
            }

            setMessages(prev => [...prev, assistantMsg]);

        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: 'Agent Error: ' + String(err), timestamp: Date.now() }]);
        } finally {
            setProcessing(false);
        }
    };

    if (!isReady) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <div className="font-mono text-sm">{loadingStep}</div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 text-slate-200 flex">
            {/* Sidebar (Simple for now) */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-lg">
                    <Brain className="w-6 h-6" /> NeuroMetric
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Lakehouse Schema</div>
                    <div className="space-y-2">
                        <SchemaTable name="features" cols={['subject', 'channel', 'window_idx', 'alpha_power', 'beta_power', 'cluster_id', 'pca_x', 'pca_y']} />
                        <SchemaTable name="subjects" cols={['subject', 'n_windows', 'avg_entropy']} />
                    </div>
                </div>

                <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-400">
                    <div className="flex items-center gap-2 mb-1 text-emerald-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        DuckDB Active
                    </div>
                    Memory: WASM
                </div>

                <button
                    onClick={() => setShowMethodology(true)}
                    className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-indigo-500/20 transition-colors"
                >
                    View Methodology
                </button>

                <div className="mt-auto pt-4 border-t border-slate-800 space-y-2">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors p-2 hover:bg-slate-800 rounded">
                        <Home className="w-3 h-3" /> Back to Home
                    </Link>
                    <a href="https://github.com/0xnomy/neurometric" target="_blank" className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors p-2 hover:bg-slate-800 rounded">
                        <Github className="w-3 h-3" /> Project GitHub
                    </a>
                </div>

                {/* Paper Citation Box */}
                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg text-[10px] text-slate-500 leading-relaxed italic">
                    <div className="mb-1 not-italic font-bold text-slate-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Dataset Source
                    </div>
                    Zyma I, Tukaev S, Seleznov I, et al. Electroencephalograms during Mental Arithmetic Task Performance. Data. 2019; 4(1):14.
                    <a href="https://doi.org/10.3390/data4010014" target="_blank" className="block mt-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-2 flex items-center gap-1">
                        View Paper <ExternalLink className="w-2 h-2" />
                    </a>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <AnimatePresence mode="popLayout">
                        {messages.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8"
                            >
                                <div className="space-y-4 max-w-2xl">
                                    <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-indigo-500/30">
                                        <Brain className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 pb-2">
                                        NeuroMetric Engine
                                    </h1>
                                    <p className="text-lg text-slate-400 leading-relaxed">
                                        Your cognitive workload lakehouse is ready. I can analyze alpha/beta power,
                                        entropy patterns, and subject statistics from your 36-subject dataset.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                                    {[
                                        { label: "Alpha Power Distribution", query: "Show me the distribution of alpha power across all subjects" },
                                        { label: "Frontal vs Occipital", query: "Compare average beta power between Frontal (F3, F4) and Occipital (O1, O2) channels" },
                                        { label: "High Entropy Subjects", query: "List the top 5 subjects with the highest spectral entropy" },
                                        { label: "Workload Analysis", query: "Analyze the cognitive workload for subject s01 based on theta/alpha ratio" }
                                    ].map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(item.query)}
                                            className="group flex flex-col items-start p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl transition-all duration-200 text-left"
                                        >
                                            <span className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                                                {item.label}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-1 line-clamp-1">
                                                {item.query}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            messages.map((msg) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-3xl rounded-2xl p-5 ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-900 border border-slate-800'
                                        }`}>
                                        {msg.role === 'assistant' && (
                                            <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                                <Brain className="w-3 h-3" /> Agent Response
                                            </div>
                                        )}

                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    table: ({ node, ...props }) => <div className="overflow-x-auto my-4 border border-slate-700 rounded-lg"><table className="w-full text-sm text-left text-slate-400 bg-slate-900" {...props} /></div>,
                                                    th: ({ node, ...props }) => <th className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold border-b border-slate-700" {...props} />,
                                                    td: ({ node, ...props }) => <td className="px-4 py-2 border-b border-slate-800/50" {...props} />
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>

                                        {msg.sql && (
                                            <div className="mt-4 bg-slate-950 rounded-lg p-3 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
                                                <div className="flex items-center gap-2 mb-1 text-slate-500 select-none">
                                                    <Terminal className="w-3 h-3" /> Execute SQL
                                                </div>
                                                {msg.sql}
                                            </div>
                                        )}

                                        {msg.insight && (
                                            <div className="mt-4 pt-4 border-t border-slate-800 animate-fade-in">
                                                <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                                                    <Activity className="w-3 h-3" /> Cognitive Insight
                                                </div>
                                                <div className="prose prose-invert prose-sm max-w-none">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            table: ({ node, ...props }) => <div className="overflow-x-auto my-4 border border-slate-700 rounded-lg"><table className="w-full text-sm text-left text-slate-400 bg-slate-900" {...props} /></div>,
                                                            th: ({ node, ...props }) => <th className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold border-b border-slate-700" {...props} />,
                                                            td: ({ node, ...props }) => <td className="px-4 py-2 border-b border-slate-800/50" {...props} />
                                                        }}
                                                    >
                                                        {msg.insight}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}

                                        {msg.data && msg.data.length > 0 && (
                                            <div className="mt-4">
                                                <div className="flex gap-2 mb-2">
                                                    <button
                                                        onClick={() => setActiveTab('table')}
                                                        className={`text-xs px-2 py-1 rounded ${activeTab === 'table' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Table
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('brain')}
                                                        className={`text-xs px-2 py-1 rounded ${activeTab === 'brain' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        3D Brain
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('topomap')}
                                                        className={`text-xs px-2 py-1 rounded ${activeTab === 'topomap' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Topomap
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('clusters')}
                                                        className={`text-xs px-2 py-1 rounded ${activeTab === 'clusters' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Clusters</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('raw')}
                                                        className={`text-xs px-2 py-1 rounded ${activeTab === 'raw' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Raw
                                                    </button>
                                                </div>

                                                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden min-h-[300px]">
                                                    {activeTab === 'table' && (
                                                        <div className="overflow-x-auto max-h-96 custom-scrollbar">
                                                            <table className="w-full text-xs text-left">
                                                                <thead className="bg-slate-900 text-slate-400 sticky top-0">
                                                                    <tr>
                                                                        {Object.keys(msg.data[0]).map(k => (
                                                                            <th key={k} className="p-2 font-medium">{k}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-800 text-slate-300">
                                                                    {msg.data.slice(0, 10).map((row: Record<string, unknown>, i: number) => (
                                                                        <tr key={i} className="hover:bg-slate-900/50">
                                                                            {Object.values(row).map((v: unknown, j) => (
                                                                                <td key={j} className="p-2 whitespace-nowrap">
                                                                                    {typeof v === 'number' ? (v % 1 !== 0 ? v.toFixed(3) : v) : String(v)}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                            {msg.data.length > 10 && (
                                                                <div className="p-2 text-center text-xs text-slate-500 bg-slate-900/50">
                                                                    + {msg.data.length - 10} more rows
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {activeTab === 'brain' && (
                                                        <div className="h-[400px] relative">
                                                            <ThreeBrain data={parseChannelData([msg.data?.[selectedWindowIndex] || msg.data?.[0] || {}])} />
                                                            {msg.data && msg.data.length > 1 && (
                                                                <div className="absolute bottom-2 left-2 bg-black/50 p-1 text-[10px] rounded text-white font-mono">
                                                                    Window: {selectedWindowIndex} / {msg.data.length - 1}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {activeTab === 'topomap' && (
                                                        <div className="h-[400px] relative">
                                                            <Topomap data={parseChannelData([msg.data?.[selectedWindowIndex] || msg.data?.[0] || {}])} />
                                                        </div>
                                                    )}

                                                    {activeTab === 'clusters' && msg.data && (
                                                        <div className="h-[400px]">
                                                            <ClusterMap
                                                                data={msg.data}
                                                                onPointSelect={(point) => {
                                                                    const idx = msg.data?.indexOf(point);
                                                                    if (idx !== undefined && idx !== -1) {
                                                                        setSelectedWindowIndex(idx);
                                                                        // Optional: switch to Brain view to see it? 
                                                                        // Or just stay here. Maybe stay here is better for exploration.
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {activeTab === 'raw' && (
                                                        <pre className="p-3 text-xs text-slate-400 overflow-auto max-h-60">
                                                            {JSON.stringify(msg.data.slice(0, 5), (key, value) =>
                                                                typeof value === 'bigint' ? value.toString() : value
                                                                , 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>

                    {processing && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3 border border-slate-800">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                <span className="text-sm text-slate-400">Querying Lakehouse...</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <div className="max-w-4xl mx-auto flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Describe the analysis you want to perform..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm placeholder-slate-500"
                            disabled={processing}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={processing || !input.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 flex items-center justify-center transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showMethodology && <MethodologyModal isOpen={showMethodology} onClose={() => setShowMethodology(false)} />}
            </AnimatePresence>
        </div>
    );
}

function parseChannelData(data: Record<string, unknown>[]): Record<string, number> {
    if (!data || data.length === 0) return {};

    // Strategy 1: Row has 'channel' and numerical value column
    // e.g. [{channel: 'Fp1', alpha: 0.5}, ...]
    if ('channel' in data[0]) {
        const result: Record<string, number> = {};
        // Find the first numerical key that isn't 'channel' or 'subject' or 'window_idx'
        const valueKey = Object.keys(data[0]).find(k =>
            k !== 'channel' && k !== 'subject' && k !== 'window_idx' && (typeof data[0][k] === 'number' || typeof data[0][k] === 'bigint')
        );

        if (valueKey) {
            data.forEach(row => {
                if (typeof row.channel === 'string') {
                    result[row.channel] = Number(row[valueKey]);
                }
            });
            return result;
        }
    }

    // Strategy 2: Keys ARE channels (Wide format)
    // e.g. [{Fp1: 0.5, Fp2: 0.6, ...}]
    // We take the first row (or average if multiple?)
    // For visualization, usually we visualize one specific moment or aggregate.
    // Let's take the first row.
    const potentialChannels = ['Fp1', 'Fp2', 'F3', 'F4', 'F7', 'F8', 'T3', 'T4', 'C3', 'C4', 'T5', 'T6', 'P3', 'P4', 'O1', 'O2', 'Fz', 'Cz', 'Pz'];
    const row = data[0];
    const result: Record<string, number> = {};
    let found = false;

    potentialChannels.forEach(ch => {
        if (ch in row && (typeof row[ch] === 'number' || typeof row[ch] === 'bigint')) {
            result[ch] = Number(row[ch]);
            found = true;
        }
    });

    if (found) return result;

    return {};
}
function SchemaTable({ name, cols }: { name: string, cols: string[] }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-slate-950 rounded border border-slate-800 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-900 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Table2 className="w-3 h-3 text-slate-400" />
                    <span className="text-sm font-mono text-slate-300">{name}</span>
                </div>
                <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
            {expanded && (
                <div className="p-2 pt-0 grid gap-1">
                    {cols.map(c => (
                        <div key={c} className="text-[10px] text-slate-500 font-mono pl-6 flex items-center gap-1">
                            <div className="w-1 h-1 bg-slate-700 rounded-full" /> {c}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
