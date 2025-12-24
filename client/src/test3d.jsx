import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import Scene3D from './components/Scene3D/Scene3D';
import TestObject3D from './components/TestObject3D/TestObject3D';
import ShapeControls3D from './components/ShapeControls3D';
import ParticleSystem3D from './components/ParticleSystem3D/ParticleSystem3D';
import './index.css';

function Test3D() {
    const testObjectRef = useRef();

    const [shape3D, setShape3D] = useState({
        geometry: 'sphere',
        size: { radius: 1.5 },
        rotation: [0, 0, 0],
        position: [0, 0, 0],
        color: '#38bdf8',
        wireframe: false
    });

    const [flowSettings, setFlowSettings] = useState({
        windSpeed: 3,
        particleCount: 100,
        viewMode: 'velocity' // 'velocity', 'smoke', 'pressure'
    });

    const handleShapeChange = (newShape) => {
        setShape3D({ ...shape3D, ...newShape });
    };

    const handleRotationChange = (rotation) => {
        setShape3D({ ...shape3D, rotation });
    };

    const handleSizeChange = (size) => {
        setShape3D({ ...shape3D, size });
    };

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }} className="flex">
            {/* Left Sidebar - Controls */}
            <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto">
                <h1 className="text-xl font-bold bg-gradient-to-r from-aero-blue to-aero-cyan bg-clip-text text-transparent mb-4">
                    3D Wind Tunnel
                </h1>

                {/* Flow Controls */}
                <div className="mb-4 pb-4 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Flow Settings</h3>

                    <div className="mb-2">
                        <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Wind Speed</span>
                            <span className="font-mono text-aero-cyan">{flowSettings.windSpeed.toFixed(1)} m/s</span>
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="8"
                            step="0.5"
                            value={flowSettings.windSpeed}
                            onChange={(e) => setFlowSettings({ ...flowSettings, windSpeed: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                    </div>

                    <div className="mb-2">
                        <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Particle Count</span>
                            <span className="font-mono text-aero-cyan">{flowSettings.particleCount}</span>
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="500"
                            step="10"
                            value={flowSettings.particleCount}
                            onChange={(e) => setFlowSettings({ ...flowSettings, particleCount: parseInt(e.target.value) })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">View Mode</label>
                        <div className="grid grid-cols-3 gap-1">
                            {['velocity', 'smoke', 'pressure'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setFlowSettings({ ...flowSettings, viewMode: mode })}
                                    className={`px-2 py-1 text-[10px] rounded border transition-colors ${flowSettings.viewMode === mode
                                        ? 'bg-aero-blue text-slate-900 border-aero-blue'
                                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <ShapeControls3D
                    currentShape={shape3D}
                    onShapeChange={handleShapeChange}
                    onRotationChange={handleRotationChange}
                    onSizeChange={handleSizeChange}
                />

                {/* View Mode Toggle */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Rendering</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShape3D({ ...shape3D, wireframe: false })}
                            className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${!shape3D.wireframe
                                ? 'bg-aero-blue text-slate-900 border-aero-blue'
                                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                                }`}
                        >
                            Solid
                        </button>
                        <button
                            onClick={() => setShape3D({ ...shape3D, wireframe: true })}
                            className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${shape3D.wireframe
                                ? 'bg-aero-blue text-slate-900 border-aero-blue'
                                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                                }`}
                        >
                            Wireframe
                        </button>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Controls</h3>
                    <div className="text-xs text-slate-400 space-y-1">
                        <div><strong>Left Mouse:</strong> Rotate view</div>
                        <div><strong>Right Mouse:</strong> Pan view</div>
                        <div><strong>Scroll:</strong> Zoom in/out</div>
                    </div>
                </div>
            </div>

            {/* Right - 3D Scene */}
            <div className="flex-1">
                <Scene3D>
                    <TestObject3D
                        ref={testObjectRef}
                        geometry={shape3D.geometry}
                        size={shape3D.size}
                        rotation={shape3D.rotation}
                        position={shape3D.position}
                        color={shape3D.color}
                        wireframe={shape3D.wireframe}
                    />

                    <ParticleSystem3D
                        testObject={testObjectRef}
                        windSpeed={flowSettings.windSpeed}
                        particleCount={flowSettings.particleCount}
                        viewMode={flowSettings.viewMode}
                        shapeSize={shape3D.size}
                    />
                </Scene3D>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root-3d')).render(
    <React.StrictMode>
        <Test3D />
    </React.StrictMode>,
);


