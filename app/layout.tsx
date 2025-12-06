import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { clsx } from 'clsx';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'NeuroMetric | Cognitive Workload Lakehouse',
  description: 'Agentic RAG for EEG Data Analytics using DuckDB-Wasm.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={clsx(inter.variable, outfit.variable, "bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500/30")}>
        {children}
      </body>
    </html>
  );
}
