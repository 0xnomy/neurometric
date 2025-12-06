'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Cpu, Database, Activity, Zap, Layers, Upload, Github } from 'lucide-react';
import BrainBackground from './components/BrainBackground';
import MethodologyModal from './components/MethodologyModal';

export default function LandingPage() {
  const [showDocumentation, setShowDocumentation] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden selection:bg-indigo-500/30">

      {/* Background Gradients & Canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <BrainBackground />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 backdrop-blur-sm">
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              NeuroMetric
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <Link href="/upload" className="flex items-center gap-2 hover:text-white transition-colors">
              <Upload className="w-4 h-4" /> Upload Data
            </Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <button onClick={() => setShowDocumentation(true)} className="hover:text-white transition-colors">Methodology</button>
            <a href="https://github.com/0xnomy/neurometric" target="_blank" className="flex items-center gap-2 hover:text-white transition-colors">
              <Github className="w-4 h-4" /> GitHub
            </a>
          </div>
          <Link
            href="/workspace"
            className="group flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 rounded-full font-semibold hover:bg-slate-200 transition-all hover:scale-105 active:scale-95"
          >
            Launch Workspace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500 font-display">
            The Future of <br />
            <span className="text-indigo-400">Cognitive Analytics</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-12 leading-relaxed">
            A client-side Agentic RAG Lakehouse for EEG data.
            Analyze 36 subjects and 19 channels directly in your browser using DuckDB-Wasm and Llama 3 70B.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/workspace"
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Start Analysis
            </Link>
            <button
              onClick={() => setShowDocumentation(true)}
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-all border border-slate-700"
            >
              View Documentation
            </button>
          </div>

          {/* Stats / Tech Stack */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 border-y border-white/5 py-8 backdrop-blur-sm bg-white/5">

            <div className="text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="text-3xl font-bold text-white mb-1">36</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Subjects</div>
              <div className="text-[10px] text-slate-600 max-w-[120px] mx-auto leading-tight">Mental Arithmetic Task (PhysioNet)</div>
            </div>
            <div className="text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="text-3xl font-bold text-white mb-1">19</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">EEG Channels</div>
              <div className="text-[10px] text-slate-600 max-w-[120px] mx-auto leading-tight">Standard 10-20 Montage</div>
            </div>
            <div className="text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="text-3xl font-bold text-white mb-1">RAG</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Agentic SQL</div>
              <div className="text-[10px] text-slate-600 max-w-[120px] mx-auto leading-tight">Llama 3 70B via Groq</div>
            </div>
            <div className="text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="text-3xl font-bold text-white mb-1">0ms</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Server Latency</div>
              <div className="text-[10px] text-slate-600 max-w-[120px] mx-auto leading-tight">In-Browser DuckDB Wasm</div>
            </div>
          </div>


        </main>

        {/* Feature Grid */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Database className="w-6 h-6 text-emerald-400" />}
              title="DuckDB Lakehouse"
              description="High-performance SQL analytics running entirely in your browser via WebAssembly. No server required."
            />
            <FeatureCard
              icon={<Cpu className="w-6 h-6 text-amber-400" />}
              title="Agentic RAG"
              description="Natural language to SQL conversion powered by Groq & Llama 3. Ask questions, get data."
            />
            <FeatureCard
              icon={<Activity className="w-6 h-6 text-rose-400" />}
              title="Real-time Insights"
              description="Visualize cognitive workload, alpha/beta power ratios, and engagement metrics instantly."
            />
          </div>
        </section>

        <footer className="py-8 text-center text-sm text-slate-500 border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm">
          <p>Developed with 🧠 by <a href="https://github.com/0xnomy" target="_blank" className="text-indigo-400 hover:text-white transition-colors font-semibold">0xnomy</a></p>
        </footer>

        <MethodologyModal isOpen={showDocumentation} onClose={() => setShowDocumentation(false)} />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-slate-100">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
