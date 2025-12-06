'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Database, Activity } from 'lucide-react';

interface MethodologyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MethodologyModal({ isOpen, onClose }: MethodologyModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                    >
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Brain className="w-5 h-5 text-indigo-400" />
                                System Methodology
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            <section>
                                <div className="flex items-center gap-2 mb-3 text-emerald-400 text-sm font-bold uppercase tracking-wider">
                                    <Database className="w-4 h-4" /> Data Architecture & Dataset
                                </div>

                                <div className="mb-6 p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                                    <h3 className="text-slate-200 font-semibold mb-2 text-sm">Dataset Details</h3>
                                    <p className="text-slate-400 text-xs leading-relaxed italic border-l-2 border-indigo-500 pl-3">
                                        A 36-subject EEG dataset recorded at 500 Hz across 19 cognitive-relevant 10–20 channels during an intensive mental arithmetic task (continuous serial subtraction of a 4-digit number minus a 2-digit number). The dataset originates from the MDPI/PhysioNet “eegmat” study and is provided here as artifact-free, ICA-cleaned 60-second CSV segments representing the active cognitive-load period of the experiment. Participants were 18–26 years old, healthy university students with normal or corrected vision and no neurological or psychiatric conditions.
                                    </p>
                                    <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                                        CITATION: Zyma I, Tukaev S, Seleznov I, et al. Electroencephalograms during Mental Arithmetic Task Performance. Data. 2019; 4(1):14.
                                        <a href="https://doi.org/10.3390/data4010014" target="_blank" className="text-indigo-400 hover:text-indigo-300 ml-2 underline">https://doi.org/10.3390/data4010014</a>
                                    </div>
                                </div>

                                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                    <strong>Architecture:</strong> This project utilizes a <strong>Static Lakehouse Architecture</strong> to deliver zero-latency analytics.
                                    Heavy signal processing is performed offline, creating optimized analytics marts that are queried directly in the browser via DuckDB-Wasm.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                    <div className="bg-slate-800 p-3 rounded border border-slate-700/50">
                                        <div className="font-bold text-amber-400 mb-1">Bronze Layer</div>
                                        <div className="text-slate-400">Raw EEG Segments (60s). Artifact-free, ICA-cleaned.</div>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded border border-slate-700/50">
                                        <div className="font-bold text-slate-300 mb-1">Silver Layer</div>
                                        <div className="text-slate-400">Feature Extraction (Welch's PSD, Entropy, DFA).</div>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded border border-slate-700/50">
                                        <div className="font-bold text-indigo-400 mb-1">Gold Layer</div>
                                        <div className="text-slate-400">subject_stats & features tables optimized for SQL querying.</div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center gap-2 mb-3 text-purple-400 text-sm font-bold uppercase tracking-wider">
                                    <Activity className="w-4 h-4" /> Signal Processing Pipeline
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-4 items-start">
                                        <div className="font-mono text-xs text-slate-500 min-w-[80px]">Spectral Analysis</div>
                                        <div className="text-sm text-slate-300">
                                            <strong>Welch's Method:</strong> Extracted absolute power statistics in Delta (0.5-4Hz), Theta (4-8Hz), Alpha (8-13Hz), Beta (13-30Hz), and Gamma (30-45Hz).
                                            <br />
                                            <span className="text-xs text-slate-500 italic">Window: 2s, Overlap: 50%, Hanning Taper.</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="font-mono text-xs text-slate-500 min-w-[80px]">Complexity Metrics</div>
                                        <div className="text-sm text-slate-300">
                                            <strong>Spectral Entropy:</strong> Quantifies the complexity/disorder of the power spectrum.
                                            <br />
                                            <strong>DFA (Detrended Fluctuation Analysis):</strong> Estimates long-range temporal correlations (Hurst exponent) to assess neural criticality.
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
