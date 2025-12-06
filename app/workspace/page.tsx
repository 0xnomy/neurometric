'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Database, Activity, Terminal, Play, Loader2, ChevronRight, Layout, Brain, Table2, BarChart3, AlertCircle } from 'lucide-react';
import * as duckdb from '@duckdb/duckdb-wasm';
import MethodologyModal from '../components/MethodologyModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Home, Github, FileText, ExternalLink } from 'lucide-react';

// ==========================================
// DuckDB Init Helper with Extension Bundling
// ==========================================
async function initDuckDB() {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
    );

    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);

    // Instantiate with extensions pre-bundled
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    URL.revokeObjectURL(worker_url);
    return db;
}

// ==========================================
// Types
// ==========================================
type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sql?: string;
    data?: any[];
    insight?: string;
    timestamp: number;
};

export default function Workspace() {
    // State
    const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
    const [conn, setConn] = useState<duckdb.AsyncDuckDBConnection | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [loadingStep, setLoadingStep] = useState('Initializing Engine...');

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'assistant',
            content: '### **EEG Cognitive Workload Lakehouse Ready**\n\nI specialize in analyzing your 36-subject mental arithmetic EEG dataset (s00–s35).\n\n**Available Tables:**\n- `features` - 84k windowed features (alpha/beta/theta/delta/gamma, DFA, entropy)\n- `subjects` - Subject-level statistics\n\n**Channels:** Fp1, Fp2, F3, F4, F7, F8, T3, T4, C3, C4, T5, T6, P3, P4, O1, O2, Fz, Cz, Pz\n\n**Ask me:**\n- Statistical queries (I\'ll generate SQL)\n- Neuroscience interpretations (no SQL needed)\n- Channel roles and cognitive workload patterns\n',
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
    const [showMethodology, setShowMethodology] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize DB on Mount
    useEffect(() => {
        const startDB = async () => {
            try {
                setLoadingStep('Booting DuckDB-Wasm...');
                const database = await initDuckDB();
                setDb(database);

                setLoadingStep('Connecting...');
                const connection = await database.connect();
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

                setLoadingStep('Ready');
                setIsReady(true);
            } catch (e) {
                console.error(e);
                setLoadingStep('Error: ' + String(e));
            }
        };

        startDB();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle Query
    const handleSend = async () => {
        if (!input.trim() || processing || !conn) return;

        const userQuery = input;
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
                    const resultData = arrowResult.toArray().map((row: any) => row.toJSON());
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
                        <SchemaTable name="features" cols={['subject', 'channel', 'window_idx', 'alpha_power', 'beta_power']} />
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
                    {messages.map((msg) => (
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

                                <div className="prose prose-invert prose-sm max-w-none [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                                        <p className="text-slate-300 text-sm leading-relaxed">{msg.insight}</p>
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
                                                onClick={() => setActiveTab('chart')}
                                                className={`text-xs px-2 py-1 rounded ${activeTab === 'chart' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                Raw View
                                            </button>
                                        </div>

                                        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                                            {activeTab === 'table' ? (
                                                <div className="overflow-x-auto max-h-60 custom-scrollbar">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-slate-900 text-slate-400 sticky top-0">
                                                            <tr>
                                                                {Object.keys(msg.data[0]).map(k => (
                                                                    <th key={k} className="p-2 font-medium">{k}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800 text-slate-300">
                                                            {msg.data.slice(0, 10).map((row: any, i: number) => (
                                                                <tr key={i} className="hover:bg-slate-900/50">
                                                                    {Object.values(row).map((v: any, j) => (
                                                                        <td key={j} className="p-2 whitespace-nowrap">
                                                                            {typeof v === 'number' ? (v % 1 !== 0 ? v.toExponential(2) : v) : String(v)}
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
                                            ) : (
                                                <pre className="p-3 text-xs text-slate-400 overflow-auto max-h-60">
                                                    {JSON.stringify(msg.data.slice(0, 5), null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

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
                            onClick={handleSend}
                            disabled={processing || !input.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 flex items-center justify-center transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="max-w-4xl mx-auto mt-2 flex gap-4 text-xs text-slate-500 justify-center">
                        <span>Try: "Subject s01 alpha power"</span>
                        <span>•</span>
                        <span>"Highest beta channel"</span>
                        <span>•</span>
                        <span>"Correlate entropy and theta"</span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showMethodology && <MethodologyModal isOpen={showMethodology} onClose={() => setShowMethodology(false)} />}
            </AnimatePresence>
        </div>
    );
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
