// @ts-nocheck
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
// @ts-ignore
import { tricontour } from 'd3-tricontour';

// 2D Projection of 10-20 Montage (Top-down view)
// Center (Cz) is 0,0. Nose is positive Y.
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
    const { points, values, min, max } = useMemo(() => {
        if (!data) return { points: [], values: [], min: 0, max: 1 };

        const validChannels = Object.keys(data).filter(k => CHANNEL_COORDS[k]);
        if (validChannels.length === 0) return { points: [], values: [], min: 0, max: 1 };

        const vals = validChannels.map(k => data[k]);
        const minVal = Math.min(...vals);
        const maxVal = Math.max(...vals);

        const pts = validChannels.map(k => {
            const [x, y] = CHANNEL_COORDS[k];
            // Invert Y for SVG coordinates if needed, but we'll map scale later
            return [x, y];
        });

        return { points: pts, values: vals, min: minVal, max: maxVal };
    }, [data]);

    useEffect(() => {
        if (!svgRef.current || points.length < 3) return;

        const width = 400;
        const height = 400;
        const radius = 180;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`); // Center 0,0

        // Head Outline
        g.append('circle')
            .attr('r', radius)
            .attr('fill', 'none')
            .attr('stroke', '#475569') // slate-600
            .attr('stroke-width', 2);

        // Nose
        g.append('path')
            .attr('d', `M -15 -${radius} L 0 -${radius + 20} L 15 -${radius}`)
            .attr('fill', 'none')
            .attr('stroke', '#475569')
            .attr('stroke-width', 2);

        // Color Scale
        const colorScale = d3.scaleSequential(d3.interpolateTurbo)
            .domain([min, max]);

        try {
            // Tri-contour method
            const contour = tricontour()
                .x((d: any, i: number) => points[i][0] * radius)
                .y((d: any, i: number) => -points[i][1] * radius) // Flip Y for screen coords
                .value((d: any, i: number) => values[i]);

            const contours = contour(points);

            // Draw Contours (clipped to circle)
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
                .attr('d', (d: any) => {
                    const geojson = d3.geoPath()(d);
                    return geojson;
                })
                .attr('fill', (d: any) => colorScale(d.value))
                .attr('stroke', 'none')
                .attr('opacity', 0.8);

        } catch (e) {
            console.warn("Contour generation failed", e);
        }

        // Draw Channels
        points.forEach((p, i) => {
            const cx = p[0] * radius;
            const cy = -p[1] * radius;

            g.append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 3)
                .attr('fill', 'white')
                .attr('stroke', 'black');
        });

    }, [points, values, min, max]);

    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="w-full h-[400px] flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="text-center">
                    <p>No Channel Data Available</p>
                    <p className="text-xs">Run a query like "Alpha power by channel"</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-950 rounded-xl shadow-2xl border border-slate-800 overflow-hidden relative">
            <svg ref={svgRef} width={400} height={400} className="max-w-full h-auto" />

            <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-black/50 p-2 rounded text-[10px] text-white">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div> High ({max.toFixed(2)})
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Low ({min.toFixed(2)})
                </div>
            </div>
        </div>
    );
}
