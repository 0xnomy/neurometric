'use client';

import Link from 'next/link';
import { ArrowLeft, CloudUpload, Brain } from 'lucide-react';
import BrainBackground from '../components/BrainBackground';

export default function UploadPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden selection:bg-indigo-500/30">

            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <BrainBackground />
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Navigation */}
                <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
                    <Link href="/" className="flex items-center gap-2 group text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>
                    <div className="flex items-center gap-2 opacity-50">
                        <Brain className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold">NeuroMetric</span>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-center mb-8 animate-bounce-slow backdrop-blur-sm">
                        <CloudUpload className="w-10 h-10 text-indigo-400" />
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                        Bring Your Own Data
                    </h1>

                    <p className="max-w-xl mx-auto text-lg text-slate-400 mb-10 leading-relaxed">
                        We are building a secure browser-based parser for EDF, BDF, and CSV EEG formats.
                        <br />
                        <span className="text-indigo-400">Coming soon to the Lakehouse.</span>
                    </p>

                    <div className="flex gap-4">
                        <Link
                            href="/workspace"
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
                        >
                            Try Demo Dataset
                        </Link>
                        <div className="px-6 py-3 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl cursor-not-allowed flex items-center gap-2">
                            <CloudUpload className="w-4 h-4" />
                            Upload (Disabled)
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
