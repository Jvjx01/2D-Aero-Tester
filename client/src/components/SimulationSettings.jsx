import React, { useState } from 'react';

const SimulationSettings = ({ settings, onSettingsChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (key, value) => {
        onSettingsChange({ ...settings, [key]: parseFloat(value) });
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-700 rounded-t-lg transition"
            >
                <span className="font-semibold text-slate-200">Simulation Settings</span>
                <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="px-4 py-3 space-y-4 border-t border-slate-700">
                    {/* Damping Factor */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            Damping Factor
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0.01"
                                max="0.99"
                                step="0.01"
                                value={settings.dampingFactor}
                                onChange={(e) => handleChange('dampingFactor', e.target.value)}
                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <input
                                type="number"
                                min="0.01"
                                max="0.99"
                                step="0.01"
                                value={settings.dampingFactor}
                                onChange={(e) => handleChange('dampingFactor', e.target.value)}
                                className="w-16 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-sky-400 font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Controls how quickly particles return to horizontal flow</p>
                    </div>

                    {/* Influence Radius */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            Influence Radius (px)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="5"
                                max="100"
                                step="1"
                                value={settings.influenceRadius}
                                onChange={(e) => handleChange('influenceRadius', e.target.value)}
                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <input
                                type="number"
                                min="5"
                                max="100"
                                step="1"
                                value={settings.influenceRadius}
                                onChange={(e) => handleChange('influenceRadius', e.target.value)}
                                className="w-16 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-sky-400 font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Distance at which particles sense the object</p>
                    </div>

                    {/* Steering Strength */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            Steering Strength
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0.1"
                                max="5.0"
                                step="0.1"
                                value={settings.steeringStrength}
                                onChange={(e) => handleChange('steeringStrength', e.target.value)}
                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <input
                                type="number"
                                min="0.1"
                                max="5.0"
                                step="0.1"
                                value={settings.steeringStrength}
                                onChange={(e) => handleChange('steeringStrength', e.target.value)}
                                className="w-16 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-sky-400 font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Force applied to deflect particles around objects</p>
                    </div>

                    {/* Max Vertical Velocity */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            Max Vertical Velocity
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0.5"
                                max="10.0"
                                step="0.5"
                                value={settings.maxVerticalVelocity}
                                onChange={(e) => handleChange('maxVerticalVelocity', e.target.value)}
                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <input
                                type="number"
                                min="0.5"
                                max="10.0"
                                step="0.5"
                                value={settings.maxVerticalVelocity}
                                onChange={(e) => handleChange('maxVerticalVelocity', e.target.value)}
                                className="w-16 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-sky-400 font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Limits how far particles can deflect vertically</p>
                    </div>

                    {/* Particle Count */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            Particle Count
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="50"
                                max="2000"
                                step="50"
                                value={settings.particleCount}
                                onChange={(e) => handleChange('particleCount', e.target.value)}
                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <input
                                type="number"
                                min="50"
                                max="2000"
                                step="50"
                                value={settings.particleCount}
                                onChange={(e) => handleChange('particleCount', e.target.value)}
                                className="w-16 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-sky-400 font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Number of flow particles</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimulationSettings;
