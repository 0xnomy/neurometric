import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from 'usehooks-ts';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Activity, MousePointer2, ZoomIn, RotateCcw } from 'lucide-react';

interface ClusterMapProps {
    data: any[];
    onPointSelect?: (point: any) => void;
}

export default function ClusterMap({ data, onPointSelect }: ClusterMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
    const { width = 0, height = 0 } = useResizeObserver({ ref: containerRef }) || {};

    // Zoom state tracking for reset
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const resetZoomRef = useRef<() => void>(() => { });

    // Filter valid points only
    const points = useMemo(() => data.filter(d =>
        typeof d.pca_x === 'number' &&
        typeof d.pca_y === 'number' &&
        !isNaN(d.pca_x) &&
        !isNaN(d.pca_y)
    ), [data]);

    // Calculate Cluster Stats
    const clusterStats = useMemo(() => {
        const stats: Record<string, { count: number, alpha: number, beta: number, entropy: number }> = {};
        points.forEach(p => {
            const cid = String(p.cluster_id);
            if (!stats[cid]) stats[cid] = { count: 0, alpha: 0, beta: 0, entropy: 0 };
            stats[cid].count++;
            stats[cid].alpha += Number(p.alpha_power || 0);
            stats[cid].beta += Number(p.beta_power || 0);
        });

        Object.keys(stats).forEach(k => {
            if (stats[k].count > 0) {
                stats[k].alpha /= stats[k].count;
                stats[k].beta /= stats[k].count;
            }
        });
        return stats;
    }, [points]);

    useEffect(() => {
        if (!svgRef.current || points.length === 0 || !width || !height) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous

        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Scales
        const xCallback = (d: any) => d.pca_x;
        const yCallback = (d: any) => d.pca_y;

        const xScale = d3.scaleLinear()
            .domain(d3.extent(points, xCallback) as [number, number])
            .range([0, innerWidth])
            .nice();

        const yScale = d3.scaleLinear()
            .domain(d3.extent(points, yCallback) as [number, number])
            .range([innerHeight, 0])
            .nice();

        // Color Scale for Clusters (0-3)
        const colorScale = d3.scaleOrdinal()
            .domain(['0', '1', '2', '3'])
            .range(['#10b981', '#6366f1', '#f59e0b', '#ec4899']); // Emerald, Indigo, Amber, Pink

        // Define Glow Filter
        const defs = svg.append("defs");
        const filter = defs.append("filter")
            .attr("id", "glow");
        filter.append("feGaussianBlur")
            .attr("stdDeviation", "2.5")
            .attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // Zoom Group
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const zoomGroup = g.append('g').attr("class", "zoom-layer");

        // Axes (Subtle Grid)
        const xAxis = d3.axisBottom(xScale).ticks(5).tickSize(-innerHeight).tickPadding(10);
        const yAxis = d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickPadding(10);

        const xAxisG = g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis)
            .attr('class', 'axis')
            .style('color', '#334155'); // slate-700

        const yAxisG = g.append('g')
            .call(yAxis)
            .attr('class', 'axis')
            .style('color', '#334155');

        // Initial styling for grid lines
        svg.selectAll('.domain').remove();
        svg.selectAll('.tick line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2');
        svg.selectAll('.tick text').attr('fill', '#64748b').style('font-family', 'monospace');

        // Points
        zoomGroup.selectAll('circle')
            .data(points)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.pca_x))
            .attr('cy', d => yScale(d.pca_y))
            .attr('r', 4)
            .attr('fill', d => colorScale(String(d.cluster_id)) as string)
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            //.style('filter', 'url(#glow)') // Optional: Can be heavy for many points
            .on('mouseenter', function (event, d) {
                d3.select(this)
                    .transition().duration(200)
                    .attr('r', 8)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2)
                    .attr('opacity', 1);
                setHoveredPoint(d);
            })
            .on('mouseleave', function () {
                d3.select(this)
                    .transition().duration(200)
                    .attr('r', 4)
                    .attr('stroke', 'none')
                    .attr('opacity', 0.8);
                setHoveredPoint(null);
            })
            .on('click', (event, d) => {
                if (onPointSelect) onPointSelect(d);
            });

        // Zoom Behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 5])
            .extent([[0, 0], [innerWidth, innerHeight]])
            .on("zoom", (event) => {
                const transform = event.transform;
                // Rescale axes
                const newX = transform.rescaleX(xScale);
                const newY = transform.rescaleY(yScale);

                xAxisG.call(xAxis.scale(newX));
                yAxisG.call(yAxis.scale(newY));

                // Style grid lines again after zoom update
                svg.selectAll('.domain').remove();
                svg.selectAll('.tick line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2');
                svg.selectAll('.tick text').attr('fill', '#64748b');

                // Transform points
                zoomGroup.selectAll('circle')
                    .attr('cx', (d: any) => newX(d.pca_x))
                    .attr('cy', (d: any) => newY(d.pca_y));
            });

        svg.call(zoom);

        // Save reset handler
        zoomRef.current = zoom;
        resetZoomRef.current = () => {
            svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        };

    }, [points, width, height]);

    const colorScale = d3.scaleOrdinal()
        .domain(['0', '1', '2', '3'])
        .range(['#10b981', '#6366f1', '#f59e0b', '#ec4899']);

    return (
        <div className="w-full h-full flex gap-4">
            {/* Main Chart Area */}
            <div className="flex-1 flex flex-col group min-h-[300px]">
                <div className="flex justify-between items-center mb-2 px-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Brain className="w-4 h-4 text-indigo-400" /> Cognitive State Map
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Controls */}
                        <button
                            onClick={() => resetZoomRef.current()}
                            className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors"
                            title="Reset View"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div ref={containerRef} className="flex-1 border border-slate-800 bg-slate-900/50 rounded-lg relative overflow-hidden ring-1 ring-white/5 hover:ring-indigo-500/20 transition-all">
                    <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
                    <AnimatePresence>
                        {hoveredPoint && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-4 left-4 bg-slate-900/95 border border-indigo-500/30 p-2 rounded-lg backdrop-blur-md shadow-xl pointer-events-none z-10 text-xs"
                            >
                                <div className="font-bold text-indigo-300">Cluster {hoveredPoint.cluster_id}</div>
                                <div className="text-slate-400">Subject {hoveredPoint.subject} (Win {hoveredPoint.window_idx})</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-2 text-[10px] text-slate-500 text-center flex items-center justify-center gap-3">
                    <span className="flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> Click point to sync Brain View</span>
                    <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Scroll to Zoom</span>
                </div>
            </div>

            {/* Side Panel: Cluster Intelligence */}
            <div className="w-64 bg-slate-900/50 border-l border-slate-800 p-4 overflow-y-auto custom-scrollbar">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> State Analysis
                </div>

                <div className="space-y-4">
                    {['0', '1', '2', '3'].map(cid => {
                        const s = clusterStats[cid];
                        if (!s) return null;

                        // Interpretation Logic
                        // NOTE: Alpha ~ 0.5-2.0, Beta ~ 0.1-1.0 typically in raw relative power or it varies.
                        // We use relative comparison.

                        let label = "Mixed State";
                        let desc = "Balanced spectral density.";

                        // Heuristic Rules for Labeling
                        if (s.alpha > s.beta * 1.5) {
                            label = "Relaxed / Idle";
                            desc = "High Alpha dominant. Indicates relaxation or eyes closed.";
                        } else if (s.beta > s.alpha * 1.1) {
                            label = "Active Processing";
                            desc = "High Beta activity. Indicates focus, anxiety, or calculation.";
                        } else if (s.alpha < 0.2 && s.beta < 0.2) {
                            label = "Low Signal / Noise";
                            desc = "Very low power.";
                        } else if (s.alpha > 0.8 && s.beta > 0.8) {
                            label = "High Amplitude";
                            desc = "Strong broad activation.";
                        }

                        const color = colorScale(cid) as string;

                        return (
                            <div key={cid} className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50 hover:border-slate-700 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-sm font-bold text-slate-200">Cluster {cid}</span>
                                    <span className="text-[10px] text-slate-500 ml-auto">{s.count} windows</span>
                                </div>
                                <div className="mb-2">
                                    <div className="text-xs font-semibold text-indigo-300 mb-0.5">{label}</div>
                                    <div className="text-[10px] text-slate-500 leading-tight">{desc}</div>
                                </div>
                                {/* Mini Bars */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <span className="w-8 text-slate-500">Alpha</span>
                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400" style={{ width: `${Math.min(100, s.alpha * 100)}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <span className="w-8 text-slate-500">Beta</span>
                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500/70" style={{ width: `${Math.min(100, s.beta * 100)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
