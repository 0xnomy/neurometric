// @ts-nocheck
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

// Standard 10-20 Montage Coordinates (Approximate on Unit Sphere)
const CHANNEL_COORDS: Record<string, [number, number, number]> = {
    'Fp1': [-0.3, 0.4, 0.8], 'Fp2': [0.3, 0.4, 0.8],
    'F7': [-0.8, 0.2, 0.5], 'F3': [-0.5, 0.6, 0.5], 'Fz': [0, 0.7, 0.5], 'F4': [0.5, 0.6, 0.5], 'F8': [0.8, 0.2, 0.5],
    'T3': [-0.9, 0.1, 0], 'C3': [-0.6, 0.7, 0], 'Cz': [0, 1, 0], 'C4': [0.6, 0.7, 0], 'T4': [0.9, 0.1, 0],
    'T5': [-0.8, 0.2, -0.5], 'P3': [-0.5, 0.6, -0.5], 'Pz': [0, 0.7, -0.5], 'P4': [0.5, 0.6, -0.5], 'T6': [0.8, 0.2, -0.5],
    'O1': [-0.3, 0.3, -0.9], 'O2': [0.3, 0.3, -0.9]
};

// Structural connections for visualization
const CONNECTIONS = [
    // Longitudinal (Left)
    ['Fp1', 'F3'], ['F3', 'C3'], ['C3', 'P3'], ['P3', 'O1'],
    ['Fp1', 'F7'], ['F7', 'T3'], ['T3', 'T5'], ['T5', 'O1'],

    // Longitudinal (Right)
    ['Fp2', 'F4'], ['F4', 'C4'], ['C4', 'P4'], ['P4', 'O2'],
    ['Fp2', 'F8'], ['F8', 'T4'], ['T4', 'T6'], ['T6', 'O2'],

    // Longitudinal (Center)
    ['Fz', 'Cz'], ['Cz', 'Pz'],

    // Transverse (Front)
    ['F7', 'F3'], ['F3', 'Fz'], ['Fz', 'F4'], ['F4', 'F8'],

    // Transverse (Center)
    ['T3', 'C3'], ['C3', 'Cz'], ['Cz', 'C4'], ['C4', 'T4'],

    // Transverse (Back)
    ['T5', 'P3'], ['P3', 'Pz'], ['Pz', 'P4'], ['P4', 'T6'],

    // Frontal Pole
    ['Fp1', 'Fp2']
];

const REGION_DESCRIPTIONS = {
    'Fp': 'Frontal Pole: Planning, Impulse Control',
    'F': 'Frontal: Reasoning, Movement',
    'C': 'Central: Sensorimotor Integration',
    'T': 'Temporal: Auditory, Memory, Language',
    'P': 'Parietal: Spatial Awareness',
    'O': 'Occipital: Visual Processing'
};

interface ThreeBrainProps {
    data: Record<string, number> | null;
    metricLabel?: string;
}

function Electrode({ position, value, rawValue, name, setHovered }: { position: [number, number, number], value: number, rawValue: number, name: string, setHovered: (s: string) => void }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [isHovered, setIsHovered] = useState(false);

    const color = useMemo(() => {
        const clamped = Math.max(0, Math.min(1, value));
        // Heatmap: Blue (0) -> Green -> Red (1)
        const hue = (1 - clamped) * 240;
        return new THREE.Color(`hsl(${hue}, 100%, 50%)`);
    }, [value]);

    useFrame((state) => {
        if (meshRef.current) {
            // Scale correlates with normalized value (0-1)
            const baseScale = 0.08 + (value * 0.1);
            const scale = isHovered ? baseScale * 1.5 : baseScale;
            meshRef.current.scale.setScalar(scale);
            
            // Intensity also correlates with normalized value
            const material = meshRef.current.material as THREE.MeshStandardMaterial;
            if (material) {
                material.emissiveIntensity = isHovered ? 0.8 : (0.3 + value * 0.4);
            }
        }
    });

    const handlePointerOver = (e) => {
        e.stopPropagation();
        setIsHovered(true);

        // Determine region description
        let desc = 'Unknown Region';
        if (name.startsWith('Fp')) desc = REGION_DESCRIPTIONS['Fp'];
        else if (name.startsWith('F')) desc = REGION_DESCRIPTIONS['F'];
        else if (name.startsWith('C')) desc = REGION_DESCRIPTIONS['C'];
        else if (name.startsWith('T')) desc = REGION_DESCRIPTIONS['T'];
        else if (name.startsWith('P')) desc = REGION_DESCRIPTIONS['P'];
        else if (name.startsWith('O')) desc = REGION_DESCRIPTIONS['O'];

        // Smart formatting for small numbers
        let valStr = rawValue.toFixed(3);
        if (Math.abs(rawValue) < 0.01 && rawValue !== 0) {
            valStr = rawValue.toExponential(2);
        }

        setHovered(`Channel ${name} | Value: ${valStr} | ${desc}`);
    };

    return (
        <group position={position}>
            <mesh
                ref={meshRef}
                onPointerOver={handlePointerOver}
                onPointerOut={() => { setIsHovered(false); setHovered(''); }}
            >
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.2} metalness={0.8} />
            </mesh>
            {isHovered && (
                <Html distanceFactor={8}>
                    <div className="bg-slate-900/95 text-white text-[11px] px-3 py-1.5 rounded-lg border border-indigo-500 shadow-lg z-50 pointer-events-none">
                        <div className="font-bold text-indigo-300">{name}</div>
                        <div className="text-[10px] text-slate-300 mt-0.5">
                            Value: <span className="text-yellow-400 font-mono">{rawValue.toFixed(3)}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                            Intensity: {(value * 100).toFixed(0)}%
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}

function BrainModel() {
    return (
        <mesh scale={[1, 0.8, 1.2]}>
            <sphereGeometry args={[0.95, 32, 32]} />
            <meshStandardMaterial
                color="#303040"
                wireframe={true}
                transparent={true}
                opacity={0.05}
            />
        </mesh>
    );
}

function BrainConnections() {
    return (
        <group>
            {CONNECTIONS.map(([start, end], i) => {
                const startPos = CHANNEL_COORDS[start];
                const endPos = CHANNEL_COORDS[end];
                if (!startPos || !endPos) return null;

                return (
                    <Line
                        key={i}
                        points={[startPos, endPos]}
                        color="white"
                        opacity={0.3}
                        transparent
                        lineWidth={1}
                    />
                );
            })}
        </group>
    );
}

export default function ThreeBrain({ data, metricLabel }: ThreeBrainProps) {
    const [hoverInfo, setHoverInfo] = useState('');

    const normalizedData = useMemo(() => {
        if (!data) return {};
        const values = Object.values(data);
        if (values.length === 0) return {};

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const norm: Record<string, number> = {};
        Object.keys(data).forEach(key => {
            norm[key] = (data[key] - min) / range;
        });
        return norm;
    }, [data]);

    return (
        <div className="w-full h-full min-h-[400px] relative bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex">
            {/* 3D Canvas */}
            <div className="flex-1 relative">
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Live Cortex
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                        {metricLabel || 'Interactive 3D View'}
                    </p>
                </div>

                {/* Information Overlay */}
                <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                    <p className="text-sm text-indigo-300 font-semibold h-6">
                        {hoverInfo}
                    </p>
                </div>

                <div className="absolute top-4 right-4 z-10 pointer-events-none flex flex-col gap-1 items-end">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        Low <div className="w-20 h-2 bg-gradient-to-r from-blue-600 via-green-500 to-red-600 rounded-full"></div> High
                    </div>
                </div>

                <Canvas camera={{ position: [0, 2, 2.5], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <pointLight position={[-10, -5, -10]} color="blue" intensity={0.5} />

                    <group rotation={[0, -Math.PI / 2, 0]}>
                        <BrainModel />
                        <BrainConnections />
                        {Object.entries(CHANNEL_COORDS).map(([name, coords]) => (
                            <Electrode
                                key={name}
                                position={coords}
                                name={name}
                                value={normalizedData[name] ?? 0}
                                rawValue={data ? data[name] : 0}
                                setHovered={setHoverInfo}
                            />
                        ))}
                    </group>


                    <OrbitControls
                        enablePan={false}
                        minDistance={1.5}
                        maxDistance={5}
                        autoRotate={true}
                        autoRotateSpeed={1}
                    />
                </Canvas>
            </div>

            {/* Side Panel Legend */}
            <div className="w-48 bg-slate-900 border-l border-slate-800 p-4 text-xs space-y-4 overflow-y-auto">
                <div className="font-bold text-indigo-400 uppercase tracking-wider mb-2">Brain Regions</div>

                <div className="space-y-3">
                    <div>
                        <div className="font-bold text-white mb-1">Frontal (F)</div>
                        <p className="text-slate-500 leading-tight">Executive function, planning, voluntary movement.</p>
                    </div>
                    <div>
                        <div className="font-bold text-white mb-1">Central (C)</div>
                        <p className="text-slate-500 leading-tight">Motor sensorimotor integration.</p>
                    </div>
                    <div>
                        <div className="font-bold text-white mb-1">Parietal (P)</div>
                        <p className="text-slate-500 leading-tight">Sensory perception, spatial awareness.</p>
                    </div>
                    <div>
                        <div className="font-bold text-white mb-1">Temporal (T)</div>
                        <p className="text-slate-500 leading-tight">Memory accumulation, language processing.</p>
                    </div>
                    <div>
                        <div className="font-bold text-white mb-1">Occipital (O)</div>
                        <p className="text-slate-500 leading-tight">Visual processing center.</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <div className="font-bold text-slate-300 mb-1">Interpretation</div>
                    <ul className="list-disc pl-3 text-slate-500 space-y-1">
                        <li><span className="text-red-400">Red</span>: High Activity Relative to other channels.</li>
                        <li><span className="text-blue-400">Blue</span>: Low Activity.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
