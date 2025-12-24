import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';

/**
 * Scene3D - Main 3D rendering component
 * Replaces the 2D Fabric.js canvas with Three.js 3D scene
 */
const Scene3D = ({ children }) => {
    const controlsRef = useRef();

    return (
        <div className="w-full h-full">
            <Canvas
                shadows
                className="w-full h-full"
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: "high-performance"
                }}
            >
                {/* Camera */}
                <PerspectiveCamera
                    makeDefault
                    position={[5, 5, 10]}
                    fov={50}
                />

                {/* Controls */}
                <OrbitControls
                    ref={controlsRef}
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={2}
                    maxDistance={50}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 1.8}
                />

                {/* Lighting */}
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={0.8}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />
                <directionalLight
                    position={[-10, 5, -5]}
                    intensity={0.3}
                />

                {/* Grid Helper */}
                <Grid
                    args={[20, 20]}
                    cellSize={1}
                    cellThickness={0.5}
                    cellColor="#6f6f6f"
                    sectionSize={5}
                    sectionThickness={1}
                    sectionColor="#9d4b4b"
                    fadeDistance={25}
                    fadeStrength={1}
                    followCamera={false}
                    infiniteGrid
                />

                {/* Axes Helper */}
                <axesHelper args={[10]} />

                {/* Child components (test objects, particles, etc.) */}
                {children}
            </Canvas>
        </div>
    );
};

export default Scene3D;
