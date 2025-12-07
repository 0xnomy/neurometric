'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain, Cpu, Database, Activity, FileText } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans selection:bg-indigo-500/30">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <Link href="/workspace" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Back to Workspace
                    </Link>
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl">
                        <Brain className="w-8 h-8" /> NeuroMetric
                    </div>
                </motion.div>

                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-6"
                >
                    <h1 className="text-4xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Understanding Your Brain on Math
                    </h1>
                    <p className="text-xl text-slate-400 leading-relaxed max-w-2xl">
                        NeuroMetric is an advanced analytics engine designed to visualize and interpret the cognitive workload of the human brain during intense mental tasks.
                    </p>
                </motion.div>

                {/* What is this project? */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid md:grid-cols-2 gap-8"
                >
                    <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6">
                            <Activity className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">What is happening here?</h2>
                        <p className="text-slate-400 leading-relaxed">
                            We are analyzing <strong>Electroencephalogram (EEG)</strong> data — which essentially records the electrical "chatter" of brain cells. By looking at these signals, we can see how hard different parts of the brain are working.
                        </p>
                        <p className="text-slate-400 leading-relaxed mt-4">
                            Think of it like a thermal camera for your mind: we can see which areas are "heating up" (active) when you are solving problems.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6">
                            <Database className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">The Data Source</h2>
                        <p className="text-slate-400 leading-relaxed">
                            This project uses a high-quality dataset recorded from <strong>36 healthy volunteers</strong>.
                        </p>
                        <p className="text-slate-400 leading-relaxed mt-4">
                            These volunteers were asked to perform "Mental Arithmetic" tasks — specifically, serial subtraction (like 3141 minus 17, repeatedly). This forces the brain into a state of high cognitive load (intense thinking), which is perfect for studying mental stress and concentration.
                        </p>
                    </div>
                </motion.div>

                {/* Why does it matter? */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl p-8 md:p-12 border border-indigo-500/10"
                >
                    <div className="md:flex gap-12 items-center">
                        <div className="flex-1 space-y-6">
                            <h2 className="text-3xl font-bold text-white">Why does this matter?</h2>
                            <p className="text-slate-300 text-lg leading-relaxed">
                                Understanding how our brains handle stress and complex tasks is the first step toward building better interfaces, improving mental health monitoring, and creating "brain-computer interfaces" (BCIs).
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs">1</div>
                                    <span>Detecting mental fatigue before it becomes dangerous.</span>
                                </li>
                                <li className="flex items-center gap-3 text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs">2</div>
                                    <span>Optimizing learning and focus strategies.</span>
                                </li>
                                <li className="flex items-center gap-3 text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs">3</div>
                                    <span>Comparing "Expert" vs "Novice" brain patterns.</span>
                                </li>
                            </ul>
                        </div>
                        <div className="hidden md:flex flex-col items-center justify-center w-64 h-64 bg-slate-900/50 rounded-full border-4 border-slate-800/50 relative">
                            <Cpu className="w-24 h-24 text-indigo-400/50 animate-pulse" />
                        </div>
                    </div>
                </motion.div>

                {/* References */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="border-t border-slate-800 pt-12"
                >
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">References & Further Reading</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <a href="https://doi.org/10.3390/data4010014" target="_blank" className="block p-4 rounded-xl bg-slate-900/30 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/30 transition-all group">
                            <h4 className="font-semibold text-indigo-300 group-hover:text-indigo-200 flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4" /> Original Dataset Paper
                            </h4>
                            <p className="text-sm text-slate-400">
                                Zyma I, Tukaev S, Seleznov I, et al. "Electroencephalograms during Mental Arithmetic Task Performance." (2019)
                            </p>
                        </a>
                        <a href="https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2014.00114/full" target="_blank" className="block p-4 rounded-xl bg-slate-900/30 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/30 transition-all group">
                            <h4 className="font-semibold text-indigo-300 group-hover:text-indigo-200 flex items-center gap-2 mb-2">
                                <Brain className="w-4 h-4" /> EEG & Cognitive Load
                            </h4>
                            <p className="text-sm text-slate-400">
                                Learn more about how EEG is used to measure mental workload in neuroscience.
                            </p>
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
