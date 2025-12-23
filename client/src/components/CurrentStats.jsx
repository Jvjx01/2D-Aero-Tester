import React from 'react';

const CurrentStats = ({ currentResult, baselineTest }) => {
    // Helper: Calculate Delta string
    const getDelta = (currentVal, baselineVal) => {
        if (baselineVal === undefined || baselineVal === null) return null;
        const diff = currentVal - baselineVal;
        const sign = diff > 0 ? '+' : '';
        return {
            diff,
            text: `(${sign}${diff.toFixed(2)})`,
            isPositive: diff > 0
        };
    };

    const dragDelta = currentResult && baselineTest ? getDelta(currentResult.dragForce, baselineTest.results.dragForce) : null;
    const liftDelta = currentResult && baselineTest ? getDelta(currentResult.liftForce || 0, (baselineTest.results.liftForce || 0)) : null;

    if (!currentResult) {
        return (
            <div className="mt-auto pt-4 border-t border-slate-800">
                <div className="text-slate-600 italic text-sm text-center">No active result</div>
            </div>
        );
    }

    return (
        <div className="mt-auto pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Current Results</h3>

            <div className="grid grid-cols-1 gap-3">
                {/* Drag Force Card */}
                <div className="bg-slate-800 p-3 rounded border-l-4 border-aero-blue shadow-lg">
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-500">Drag Force</div>
                        {dragDelta && (
                            <div className={`text-xs font-mono ${dragDelta.isPositive ? 'text-red-400' : 'text-green-400'}`}>
                                {dragDelta.text}
                            </div>
                        )}
                    </div>
                    <div className="text-xl font-bold text-white">{currentResult.dragForce} N</div>
                </div>

                {/* Lift Force Card */}
                <div className="bg-slate-800 p-3 rounded border-l-4 border-emerald-500 shadow-lg">
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-500">Lift Force</div>
                        {liftDelta && (
                            <div className={`text-xs font-mono ${liftDelta.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {liftDelta.text}
                            </div>
                        )}
                    </div>
                    <div className="text-xl font-bold text-white">{currentResult.liftForce || 0} N</div>
                </div>

                {/* Coefficients */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 p-3 rounded border-l-2 border-aero-cyan shadow">
                        <div className="text-xs text-slate-500">Cd</div>
                        <div className="text-lg font-bold text-white">{currentResult.cd}</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded border-l-2 border-emerald-400 shadow">
                        <div className="text-xs text-slate-500">Cl</div>
                        <div className="text-lg font-bold text-white">{currentResult.cl || 0}</div>
                    </div>
                </div>

                {/* Reynolds Number */}
                {currentResult.reynolds !== undefined && (
                    <div className="bg-slate-800 p-3 rounded border-l-4 border-purple-500 shadow-lg">
                        <div className="text-xs text-slate-500">Reynolds Number</div>
                        <div className="text-lg font-bold text-white">{currentResult.reynolds.toLocaleString()}</div>
                    </div>
                )}

                {/* Shape Type */}
                {currentResult.shapeType && (
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                        <div className="text-xs text-slate-500">Shape Classification</div>
                        <div className="text-sm font-semibold text-amber-400 capitalize">{currentResult.shapeType}</div>
                    </div>
                )}

                {/* Vortex Shedding */}
                {currentResult.vortexFrequency !== undefined && currentResult.vortexFrequency > 0 && (
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                        <div className="text-xs text-slate-500">Vortex Shedding</div>
                        <div className="text-sm font-mono text-cyan-400">{currentResult.vortexFrequency} Hz</div>
                    </div>
                )}

                {/* Area */}
                <div className="bg-slate-800 p-3 rounded border-l-4 border-slate-500 shadow">
                    <div className="text-xs text-slate-500">Frontal Area</div>
                    <div className="text-xl font-bold text-white">{currentResult.area} m²</div>
                </div>
            </div>
        </div>
    );
};

export default CurrentStats;
