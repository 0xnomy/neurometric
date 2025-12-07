// @ts-nocheck
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { tricontour } from 'd3-tricontour';

const CHANNEL_COORDS: Record<string, [number, number]> = {
    'Fp1': [-0.3, 0.8], 'Fp2': [0.3, 0.8],
    'F7': [-0.8, 0.5], 'F3': [-0.4, 0.5], 'Fz': [0, 0.5], 'F4': [0.4, 0.5], 'F8': [0.8, 0.5],
    'T3': [-0.9, 0], 'C3': [-0.5, 0], 'Cz': [0, 0], 'C4': [0.5, 0], 'T4': [0.9, 0],
    'T5': [-0.8, -0.5], 'P3': [-0.4, -0.5], 'Pz': [0, -0.5], 'P4': [0.4, -0.5], 'T6': [0.8, -0.5],
    'O1': [-0.3, -0.8], 'O2': [0.3, -0.8]
};

interface TopomapProps {
    data: Record<string, number> | null;
}

export default function Topomap({ data }: TopomapProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    // Normalize Data
    const { points, values, min, max, hasData } = useMemo(() => {
        if (!data) return { points: [], values: [], min: 0, max: 1, hasData: false };

        const validChannels = Object.keys(data).filter(k => CHANNEL_COORDS[k]);
        if (validChannels.length < 3) return { points: [], values: [], min: 0, max: 1, hasData: false };

        const vals = validChannels.map(k => data[k]);
        const minVal = Math.min(...vals);
        const maxVal = Math.max(...vals);

        const pts = validChannels.map(k => {
            const [x, y] = CHANNEL_COORDS[k];
            return [x, y];
        });

        return { points: pts, values: vals, min: minVal, max: maxVal, hasData: true };
    }, [data]);

    useEffect(() => {
        if (!svgRef.current || !hasData) return;

        const width = 400;
        const height = 400;
        const radius = 180;

        try {
            const svg = d3.select(svgRef.current);
            svg.selectAll('*').remove();

            const g = svg.append('g')
                .attr('transform', `translate(${width / 2}, ${height / 2})`); // Center 0,0

            // 1. Definition for Contour Generator
            // Important: tricontour expects [x,y,value] or separate accessors
            const contour = tricontour()
                .x((d: any, i: number) => points[i][0] * radius)
                .y((d: any, i: number) => -points[i][1] * radius) // Flip Y
                .value((d: any, i: number) => values[i]);

            // Triangulate and generate contours
            // We pass points array itself because accessors use index
            const contours = contour(points);

            // Color Scale
            const colorScale = d3.scaleSequential(d3.interpolateSpectral)
                .domain([max, min]); // Invert spectral so Blue=Low, Red=High

            // 2. Base Circle of Head
            g.append('circle')
                .attr('r', radius)
                .attr('fill', '#0f172a') // slate-900 background
                .attr('stroke', '#cbd5e1')
                .attr('stroke-width', 2);

            // Nose
            g.append('path')
                .attr('d', `M -15 -${radius} L 0 -${radius + 20} L 15 -${radius}`)
                .attr('fill', 'none')
                .attr('stroke', '#cbd5e1')
                .attr('stroke-width', 2);

            // Ears
            g.append('path')
                .attr('d', `M -${radius} -15 C -${radius + 15} -15, -${radius + 15} 15, -${radius} 15`)
                .attr('fill', 'none')
                .attr('stroke', '#cbd5e1')
                .attr('stroke-width', 2);
            g.append('path')
                .attr('d', `M ${radius} -15 C ${radius + 15} -15, ${radius + 15} 15, ${radius} 15`)
                .attr('fill', 'none')
                .attr('stroke', '#cbd5e1')
                .attr('stroke-width', 2);

            // 3. Draw Contours
            g.append('clipPath')
                .attr('id', 'head-clip')
                .append('circle')
                .attr('r', radius);

            g.append('g')
                .attr('clip-path', 'url(#head-clip)')
                .selectAll('path')
                .data(contours)
                .enter()
                .append('path')
                .attr('d', (d: any) => d3.geoPath()(d))
                .attr('fill', (d: any) => colorScale(d.value))
                .attr('stroke', 'none')
                .attr('opacity', 0.9);

            // 4. Draw Channel Points
            g.selectAll('.channel')
                .data(points)
                .enter()
                .append('circle')
                .attr('cx', (d, i) => d[0] * radius)
                .attr('cy', (d, i) => -d[1] * radius)
                .attr('r', 4)
                .attr('fill', 'white')
                .attr('stroke', 'black');

        } catch (e) {
            console.error("Topomap render error:", e);
            const svg = d3.select(svgRef.current);
            svg.append('text')
                .attr('x', 200)
                .attr('y', 200)
                .attr('text-anchor', 'middle')
                .attr('fill', 'red')
                .text('Visualization Error');
        }

    }, [points, values, min, max, hasData]);

    if (!hasData) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-center p-6">
                    <p className="font-bold mb-2">Unavailable</p>
                    <p className="text-xs max-w-xs mx-auto">
                        This query didn't return channel-specific numeric data.
                        Try: "Alpha power by channel"
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[400px] flex bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
            {/* Main Visualization Area */}
            <div className="flex-1 relative flex items-center justify-center p-4">
                <h3 className="absolute top-4 left-4 text-emerald-400 font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Topographic Map
                </h3>

                <svg ref={svgRef} width={400} height={400} className="max-w-full h-auto z-10" />

                {/* Min/Max indicators overlay */}
                <div className="absolute bottom-4 left-4 text-[10px] text-slate-500 font-mono">
                    Range: {min.toFixed(2)} - {max.toFixed(2)}
                </div>
            </div>

            {/* Interpretation Side Panel */}
            <div className="w-48 bg-slate-900 border-l border-slate-800 p-4 text-xs space-y-4 overflow-y-auto">
                <div className="font-bold text-emerald-400 uppercase tracking-wider mb-2">How to Read</div>

                <div className="space-y-3">
                    <div>
                        <div className="font-bold text-white mb-1">Orientation</div>
                        <p className="text-slate-500 leading-tight">
                            Viewing the head from above.
                            <br />Nose ▲ = Front
                            <br />Ears ◀ ▶ = Left/Right
                        </p>
                    </div>

                    <div>
                        <div className="font-bold text-white mb-1">Color Scale</div>
                        <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <div className="w-3 h-3 bg-red-500 rounded-sm"></div> High Activity
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div> Moderate
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> Low Activity
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="font-bold text-white mb-1">10-20 System</div>
                        <p className="text-slate-500 leading-tight">
                            The dots represent standard electrode positions (e.g., Fz, Cz, Pz).
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <div className="font-bold text-slate-300 mb-1">Interpretation</div>
                        <ul className="list-disc pl-3 text-slate-500 space-y-1 leading-tight">
                            <li>Focus on <span className="text-red-400">Red</span> zones.</li>
                            <li>Frontal (Top) = Executive function.</li>
                            <li>Occipital (Bottom) = Visual/Relaxation.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
