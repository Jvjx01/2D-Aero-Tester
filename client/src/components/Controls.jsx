import React from 'react';

const Controls = ({ params, setParams }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        let parsedValue = parseFloat(value);

        // Default windSpeed to 0 if textbox is empty (NaN)
        if (name === 'windSpeed' && (isNaN(parsedValue) || value === '')) {
            parsedValue = 0;
        }

        setParams(prev => ({
            ...prev,
            [name]: parsedValue
        }));
    };

    return (
        <div className="flex flex-col space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Wind Speed (km/h)</label>
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        name="windSpeed"
                        min="0"
                        max="200"
                        value={params.windSpeed}
                        onChange={handleChange}
                        className="flex-1 accent-aero-blue"
                    />
                    <input
                        type="number"
                        name="windSpeed"
                        min="0"
                        max="200"
                        value={params.windSpeed}
                        onChange={handleChange}
                        className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-aero-blue font-mono focus:outline-none focus:border-aero-blue"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Angle of Attack (deg)</label>
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        name="angle"
                        min="0"
                        max="360"
                        value={params.angle}
                        onChange={handleChange}
                        className="flex-1 accent-aero-cyan"
                    />
                    <input
                        type="number"
                        name="angle"
                        min="0"
                        max="360"
                        value={params.angle}
                        onChange={handleChange}
                        className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-aero-cyan font-mono focus:outline-none focus:border-aero-cyan"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Air Density (kg/m³)</label>
                <input
                    type="number"
                    name="airDensity"
                    step="0.001"
                    value={params.airDensity}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-aero-blue"
                />
            </div>


        </div>
    );
};

export default Controls;
