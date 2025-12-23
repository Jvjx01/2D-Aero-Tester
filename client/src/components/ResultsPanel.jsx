import React, { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const ResultsPanel = ({ currentResult, history, onLoadTest, baselineTest, onSetBaseline }) => {
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

    // Prepare Chart Data
    const totalCount = history.length + (currentResult ? 1 : 0);

    const allResults = [...history].reverse(); // Oldest first
    if (currentResult) allResults.push({ results: currentResult });

    const chartData = {
        labels: allResults.map((_, i) => `Test ${i + 1}`),
        datasets: [
            {
                label: 'Drag Force (N)',
                data: allResults.map(h => h.results.dragForce),
                backgroundColor: allResults.map((h, i) =>
                    (currentResult && i === allResults.length - 1) ? 'rgba(244, 63, 94, 0.8)' : 'rgba(56, 189, 248, 0.6)'
                ),
                borderColor: allResults.map((h, i) =>
                    (currentResult && i === allResults.length - 1) ? 'rgb(244, 63, 94)' : 'rgb(56, 189, 248)'
                ),
                borderWidth: 1,
            },
            {
                label: 'Lift Force (N)',
                data: allResults.map(h => h.results.liftForce || 0),
                backgroundColor: 'rgba(34, 197, 94, 0.6)', // Green
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1,
                hidden: false,
            }
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
            if (elements.length > 0 && onLoadTest) {
                const index = elements[0].index;
                const test = allResults[index];
                // Don't load if it's the current result (last item)
                if (!(currentResult && index === allResults.length - 1)) {
                    onLoadTest(test);
                }
            }
        },
        plugins: {
            legend: {
                position: window.innerWidth < 768 ? 'bottom' : 'top', // Bottom on mobile
                labels: {
                    color: '#94a3b8',
                    font: {
                        size: window.innerWidth < 768 ? 10 : 12 // Smaller font on mobile
                    },
                    padding: window.innerWidth < 768 ? 8 : 10,
                    boxWidth: window.innerWidth < 768 ? 30 : 40
                }
            },
            title: { display: false },
            tooltip: {
                enabled: true,
                titleFont: { size: window.innerWidth < 768 ? 11 : 12 },
                bodyFont: { size: window.innerWidth < 768 ? 10 : 11 },
                padding: window.innerWidth < 768 ? 8 : 12
            }
        },
        scales: {
            y: {
                ticks: {
                    color: '#94a3b8',
                    font: { size: window.innerWidth < 768 ? 9 : 11 }
                },
                grid: { color: '#1e293b' }
            },
            x: {
                ticks: {
                    color: '#94a3b8',
                    font: { size: window.innerWidth < 768 ? 9 : 11 },
                    maxRotation: window.innerWidth < 768 ? 45 : 0, // Rotate labels on mobile
                    minRotation: window.innerWidth < 768 ? 45 : 0
                },
                grid: { display: false }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        // Better touch support for mobile
        events: ['click', 'touchstart', 'touchmove'],
    };

    return (
        <div className="flex flex-col lg:flex-row h-full lg:space-x-4 p-4 gap-4 lg:gap-0">
            {/* Charts - Full width on mobile, flexible on desktop */}
            <div className={`${isHistoryCollapsed ? 'flex-1' : 'flex-1 lg:flex-1'} bg-slate-800/50 rounded p-2 relative min-h-[250px] lg:min-h-0`}>
                <Bar data={chartData} options={options} />
            </div>

            {/* History Table - Below chart on mobile, side-by-side on desktop */}
            <div className={`${isHistoryCollapsed ? 'w-auto lg:w-1/3 lg:min-w-[300px]' : 'w-full lg:w-1/3 lg:min-w-[300px]'} overflow-auto border-t lg:border-t-0 lg:border-l border-slate-700 bg-slate-900/50 transition-all duration-300`}>
                {/* Header with collapse button (mobile only) */}
                <div className="sticky top-0 bg-slate-800 flex items-center justify-between p-2 border-b border-slate-700">
                    <h3 className="text-xs uppercase text-slate-300 font-semibold">
                        {isHistoryCollapsed ? 'Tests' : 'Test History'}
                    </h3>
                    {/* Collapse button - Only on mobile */}
                    <button
                        onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                        className="lg:hidden p-1 hover:bg-slate-700 rounded transition-colors"
                        title={isHistoryCollapsed ? 'Expand history' : 'Collapse history'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isHistoryCollapsed ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Table - Hidden when collapsed on mobile, always visible on desktop */}
                <div className={`${isHistoryCollapsed ? 'hidden lg:block' : 'block'}`}>
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs uppercase bg-slate-800 text-slate-300 sticky top-0">
                            <tr>
                                <th className="p-2">#</th>
                                <th className="p-2">Drag</th>
                                <th className="p-2">Lift</th>
                                <th className="p-2">Cd</th>
                                <th className="p-2">Compare</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {history.map((test, i) => (
                                <tr
                                    key={i}
                                    className={`cursor-pointer transition-colors ${baselineTest === test ? 'bg-yellow-500/10' : 'hover:bg-slate-800/50'
                                        }`}
                                    onClick={() => onLoadTest && onLoadTest(test)}
                                >
                                    <td className="p-2">{history.length - i}</td>
                                    <td className="p-2 font-mono text-aero-blue">{test.results.dragForce}</td>
                                    <td className="p-2 font-mono text-emerald-500">{test.results.liftForce !== undefined ? test.results.liftForce : '-'}</td>
                                    <td className="p-2 font-mono">{test.results.cd}</td>
                                    <td className="p-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSetBaseline && onSetBaseline(baselineTest === test ? null : test);
                                            }}
                                            className={`px-2 py-1 text-xs rounded border transition-colors ${baselineTest === test
                                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                                                : 'border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300'
                                                }`}
                                        >
                                            {baselineTest === test ? 'Active' : 'Set'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResultsPanel;
