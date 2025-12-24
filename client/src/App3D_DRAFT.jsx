import React, { useState } from 'react';
import Scene3D from './components/Scene3D/Scene3D';
import TestObject3D from './components/TestObject3D/TestObject3D';
import Controls from './components/Controls';
import ResultsPanel from './components/ResultsPanel';
import CurrentStats from './components/CurrentStats';
import SimulationSettings from './components/SimulationSettings';

// Feature flag to toggle between 2D and 3D
const USE_3D = true;

// Import 2D component
import SimulationCanvas from './components/SimulationCanvas';

function App() {
    // ... existing state ...
    const [params, setParams] = useState({
        windSpeed: 50,
        angle: 0,
        airDensity: 1.225
    });

    const [currentResult, setCurrentResult] = useState(null);
    const [testResults, setTestResults] = useState([]);
    const [currentShape, setCurrentShape] = useState(null);
    const [baselineTest, setBaselineTest] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);
    const [loadedShape, setLoadedShape] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [simSettings, setSimSettings] = useState({
        particleCount: 200,
        trailLength: 10,
        viewMode: 'smoke'
    });

    // 3D-specific state
    const [shape3D, setShape3D] = useState({
        geometry: 'sphere',
        size: { radius: 1 },
        rotation: [0, 0, 0]
    });

    // ... rest of existing handlers ...

    return (
        <div className="flex h-screen w-full bg-aero-bg text-slate-200 overflow-hidden">
            {/* USE_3D flag determines which renderer to use */}
            {USE_3D ? (
                // 3D Version
                <div className="flex-1">
                    <Scene3D>
                        <TestObject3D
                            geometry={shape3D.geometry}
                            size={shape3D.size}
                            rotation={shape3D.rotation}
                        />
                    </Scene3D>
                </div>
            ) : (
                // 2D Version (existing)
                <SimulationCanvas
                    params={params}
                    onRun={(data) => console.log('Run test', data)}
                    onSave={() => console.log('Save test')}
                    currentResult={currentResult}
                    simSettings={simSettings}
                />
            )}
        </div>
    );
}

export default App;
