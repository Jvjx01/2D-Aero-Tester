import React from 'react';

/**
 * ShapeControls3D - UI controls for manipulating 3D test objects
 */
const ShapeControls3D = ({
    currentShape,
    onShapeChange,
    onRotationChange,
    onSizeChange
}) => {
    const shapes = [
        { id: 'sphere', label: 'Sphere', icon: '⚫' },
        { id: 'box', label: 'Box', icon: '◼️' },
        { id: 'cylinder', label: 'Cylinder', icon: '⬭' },
        { id: 'cone', label: 'Cone', icon: '🔺' },
        { id: 'torus', label: 'Torus', icon: '⭕' },
    ];

    const handleShapeSelect = (shapeId) => {
        const defaultSizes = {
            sphere: { radius: 1.5 },
            box: { width: 2, height: 2, depth: 2 },
            cylinder: { radiusTop: 0.5, radiusBottom: 0.5, height: 2 },
            cone: { radius: 1, height: 2 },
            torus: { radius: 1, tube: 0.4 },
        };

        onShapeChange({
            geometry: shapeId,
            size: defaultSizes[shapeId],
            rotation: [0, 0, 0],
            position: [0, 0, 0]
        });
    };

    return (
        <div className="space-y-4">
            {/* Shape Selector */}
            <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">3D Shape</h3>
                <div className="grid grid-cols-3 gap-2">
                    {shapes.map(shape => (
                        <button
                            key={shape.id}
                            onClick={() => handleShapeSelect(shape.id)}
                            className={`px-3 py-2 text-xs rounded border transition-colors ${currentShape.geometry === shape.id
                                    ? 'bg-aero-blue text-slate-900 border-aero-blue'
                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                                }`}
                        >
                            <div className="text-lg mb-1">{shape.icon}</div>
                            <div>{shape.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Rotation Controls */}
            <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Rotation (degrees)</h3>

                {/* Pitch */}
                <div className="mb-2">
                    <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Pitch (X-axis)</span>
                        <span className="font-mono text-aero-cyan">{currentShape.rotation[0]}°</span>
                    </label>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        value={currentShape.rotation[0]}
                        onChange={(e) => onRotationChange([
                            parseInt(e.target.value),
                            currentShape.rotation[1],
                            currentShape.rotation[2]
                        ])}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                </div>

                {/* Yaw */}
                <div className="mb-2">
                    <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Yaw (Y-axis)</span>
                        <span className="font-mono text-aero-cyan">{currentShape.rotation[1]}°</span>
                    </label>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        value={currentShape.rotation[1]}
                        onChange={(e) => onRotationChange([
                            currentShape.rotation[0],
                            parseInt(e.target.value),
                            currentShape.rotation[2]
                        ])}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                </div>

                {/* Roll */}
                <div className="mb-2">
                    <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Roll (Z-axis)</span>
                        <span className="font-mono text-aero-cyan">{currentShape.rotation[2]}°</span>
                    </label>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        value={currentShape.rotation[2]}
                        onChange={(e) => onRotationChange([
                            currentShape.rotation[0],
                            currentShape.rotation[1],
                            parseInt(e.target.value)
                        ])}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                </div>

                {/* Reset Button */}
                <button
                    onClick={() => onRotationChange([0, 0, 0])}
                    className="w-full px-3 py-1 text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                >
                    Reset Rotation
                </button>
            </div>

            {/* Size Controls */}
            <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Size</h3>
                {currentShape.geometry === 'sphere' && (
                    <div>
                        <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Radius</span>
                            <span className="font-mono text-aero-cyan">{currentShape.size.radius.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={currentShape.size.radius}
                            onChange={(e) => onSizeChange({ radius: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                    </div>
                )}

                {currentShape.geometry === 'box' && (
                    <>
                        <div className="mb-2">
                            <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Width</span>
                                <span className="font-mono text-aero-cyan">{currentShape.size.width.toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="4"
                                step="0.1"
                                value={currentShape.size.width}
                                onChange={(e) => onSizeChange({ ...currentShape.size, width: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                        <div className="mb-2">
                            <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Height</span>
                                <span className="font-mono text-aero-cyan">{currentShape.size.height.toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="4"
                                step="0.1"
                                value={currentShape.size.height}
                                onChange={(e) => onSizeChange({ ...currentShape.size, height: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                        <div>
                            <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Depth</span>
                                <span className="font-mono text-aero-cyan">{currentShape.size.depth.toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="4"
                                step="0.1"
                                value={currentShape.size.depth}
                                onChange={(e) => onSizeChange({ ...currentShape.size, depth: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                    </>
                )}

                {(currentShape.geometry === 'cylinder' || currentShape.geometry === 'cone') && (
                    <>
                        <div className="mb-2">
                            <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Radius</span>
                                <span className="font-mono text-aero-cyan">
                                    {(currentShape.size.radius || currentShape.size.radiusTop || 1).toFixed(1)}
                                </span>
                            </label>
                            <input
                                type="range"
                                min="0.2"
                                max="2"
                                step="0.1"
                                value={currentShape.size.radius || currentShape.size.radiusTop || 1}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    onSizeChange(
                                        currentShape.geometry === 'cone'
                                            ? { ...currentShape.size, radius: val }
                                            : { ...currentShape.size, radiusTop: val, radiusBottom: val }
                                    );
                                }}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                        <div>
                            <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Height</span>
                                <span className="font-mono text-aero-cyan">{currentShape.size.height.toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="4"
                                step="0.1"
                                value={currentShape.size.height}
                                onChange={(e) => onSizeChange({ ...currentShape.size, height: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                    </>
                )}

                {currentShape.geometry === 'torus' && (
                    <>
                        <div className="mb-2">
                            <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Ring Radius</span>
                                <span className="font-mono text-aero-cyan">{currentShape.size.radius.toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={currentShape.size.radius}
                                onChange={(e) => onSizeChange({ ...currentShape.size, radius: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                        <div>
                            <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Tube Radius</span>
                                <span className="font-mono text-aero-cyan">{currentShape.size.tube.toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="0.8"
                                step="0.05"
                                value={currentShape.size.tube}
                                onChange={(e) => onSizeChange({ ...currentShape.size, tube: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ShapeControls3D;
