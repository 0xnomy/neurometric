// @ts-nocheck
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Standard 10-20 Montage Coordinates (Approximate on Unit Sphere)
// X: Right, Y: Up, Z: Front (Nose)
const CHANNEL_COORDS: Record<string, [number, number, number]> = {
    'Fp1': [-0.3, 0.4, 0.8], 'Fp2': [0.3, 0.4, 0.8],
    'F7': [-0.8, 0.2, 0.5], 'F3': [-0.5, 0.6, 0.5], 'Fz': [0, 0.7, 0.5], 'F4': [0.5, 0.6, 0.5], 'F8': [0.8, 0.2, 0.5],
    'T3': [-0.9, 0.1, 0], 'C3': [-0.6, 0.7, 0], 'Cz': [0, 1, 0], 'C4': [0.6, 0.7, 0], 'T4': [0.9, 0.1, 0],
    'T5': [-0.8, 0.2, -0.5], 'P3': [-0.5, 0.6, -0.5], 'Pz': [0, 0.7, -0.5], 'P4': [0.5, 0.6, -0.5], 'T6': [0.8, 0.2, -0.5],
    'O1': [-0.3, 0.3, -0.9], 'O2': [0.3, 0.3, -0.9]
};

interface ThreeBrainProps {
    data: Record<string, number> | null;
    metricLabel?: string;
}

function Electrode({ position, value, name }: { position: [number, number, number], value: number, name: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const textRef = useRef<HTMLDivElement>(null);

    // Normalize value roughly 0-1 for color if unknown range, but typically spectral power is logarithmic.
    // We'll assume input is somewhat normalized or we just scale visual intensity.
    // For visualization, we'll map value to color intensity.

    // Simple heatmap color interpolation: Blue (low) -> Green -> Red (high)
    // Assuming value is relative Z-score or power. 
    // Let's implement a dynamic color scaler.

    const color = useMemo(() => {
        const clamped = Math.max(0, Math.min(1, value)); // Clamp 0-1 for demo, expects normalized
        const hue = (1 - clamped) * 240; // 240 (blue) to 0 (red)
        return new THREE.Color(`hsl(${hue}, 100%, 50%)`);
    }, [value]);

    useFrame((state) => {
        if (meshRef.current) {
            // Pulse effect based on value
            const scale = 0.05 + (value * 0.02) + (Math.sin(state.clock.elapsedTime * 3) * 0.005);
            meshRef.current.scale.setScalar(scale);
        }
    });

    return (
        <group position={position}>
            <mesh ref={meshRef}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
            </mesh>
            <Html distanceFactor={10} ref={textRef}>
                <div className="text-[8px] font-mono text-white/70 bg-black/50 px-1 rounded pointer-events-none select-none">
                    {name}
                </div>
            </Html>
        </group>
    );
}

function BrainModel() {
    // A simple wireframe brain substitute if no GLTF model is available, 
    // or we can procedurally generate a cortex shape.
    // Using a simple ellipsoid setup for the brain volume.

    return (
        <mesh scale={[1, 0.8, 1.2]}>
            <sphereGeometry args={[0.95, 32, 32]} />
            <meshStandardMaterial
                color="#303040"
                wireframe={true}
                transparent={true}
                opacity={0.1}
            />
        </mesh>
    );
}

export default function ThreeBrain({ data, metricLabel }: ThreeBrainProps) {
    // Calculate normalized values for visualization
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
        <div className="w-full h-full min-h-[400px] relative bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Live Cortex
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                    {metricLabel || 'Monitoring...'}
                </p>
            </div>

            <Canvas camera={{ position: [0, 2, 2.5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -5, -10]} color="blue" intensity={0.5} />

                <group rotation={[0, Math.PI, 0]}> {/* Face forward */}
                    <BrainModel />
                    {Object.entries(CHANNEL_COORDS).map(([name, coords]) => (
                        <Electrode
                            key={name}
                            position={coords}
                            name={name}
                            value={normalizedData[name] ?? 0}
                        />
                    ))}
                </group>

                <OrbitControls
                    enablePan={false}
                    minDistance={1.5}
                    maxDistance={5}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                />
            </Canvas>
        </div>
    );
}
