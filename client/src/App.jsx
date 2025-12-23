
import React, { useState, useEffect } from 'react';
import Controls from './components/Controls';
import SimulationCanvas from './components/SimulationCanvas';
import ResultsPanel from './components/ResultsPanel';
import CurrentStats from './components/CurrentStats';
import SimulationSettings from './components/SimulationSettings';

function App() {
  const [params, setParams] = useState({
    windSpeed: 50,
    angle: 0,
    airDensity: 1.225
  });

  const [testResults, setTestResults] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [baselineTest, setBaselineTest] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [loadedShape, setLoadedShape] = useState(null); // Explicit state for loading shapes onto canvas
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile sidebar toggle

  // Simulation settings with defaults
  const [simSettings, setSimSettings] = useState({
    dampingFactor: 0.20,
    influenceRadius: 25,
    steeringStrength: 0.8,
    maxVerticalVelocity: 2.0,
    particleCount: 600
  });

  // Load recent tests on startup
  useEffect(() => {
    const fetchRecentTests = async () => {
      try {
        const response = await fetch('/api/tests');
        if (response.ok) {
          const tests = await response.json();
          setTestResults(tests); // Load directly into history
        }
      } catch (err) {
        console.error('Failed to load recent tests:', err);
      }
    };

    fetchRecentTests();
  }, []);

  // Listen for mobile menu toggle from canvas component
  useEffect(() => {
    const handleToggleMobileMenu = () => {
      setIsMobileMenuOpen(prev => !prev);
    };

    window.addEventListener('toggleMobileMenu', handleToggleMobileMenu);
    return () => window.removeEventListener('toggleMobileMenu', handleToggleMobileMenu);
  }, []);

  const handleRunTest = async (shapeData) => {
    try {
      setCurrentShape(shapeData); // Store for saving ONLY. Do not trigger re-render of canvas.
      setSaveMessage(null); // Clear any previous save messages
      // Call Backend API
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shape: shapeData,
          parameters: params
        })
      });

      const result = await response.json();
      setCurrentResult(result);
      // Automatically save? Or let user save?
      // Prompt says "Save Test" action. So we just show result first.
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  };

  const handleSaveTest = async () => {
    if (!currentResult || !currentShape) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/save-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shape: currentShape,
          parameters: params,
          results: currentResult
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} `);
      }

      const saved = await response.json();
      setTestResults(prev => [saved, ...prev]);
      setSaveMessage({
        type: 'success',
        text: '✓ Test saved successfully to database!'
      });

      // Auto-clear success message after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error) {
      console.error("Save failed:", error);

      // Check if it's a network error (MongoDB not running)
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        setSaveMessage({
          type: 'error',
          text: '✗ Cannot connect to server. Make sure the backend is running.'
        });
      } else {
        setSaveMessage({
          type: 'error',
          text: '✗ Failed to save test. MongoDB may not be running. Start MongoDB with "mongod" command.'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAngleChange = (newAngle) => {
    setParams(prev => ({
      ...prev,
      angle: Math.round(newAngle) // Round to avoid decimal precision issues
    }));
  };

  const handleLoadTest = (test) => {
    // Restore parameters
    setParams({
      windSpeed: test.parameters.windSpeed,
      angle: test.parameters.angle,
      airDensity: test.parameters.airDensity
    });

    // Restore shape and results
    setCurrentShape(test.shape);
    setLoadedShape(test.shape); // Trigger canvas update
    setCurrentResult(test.results);

    // Clear any save messages
    setSaveMessage(null);
  };

  return (
    <div className="flex h-screen w-full bg-aero-bg text-slate-200 overflow-hidden">
      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`
        fixed lg:relative lg:translate-x-0 z-40
        w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-aero-blue to-aero-cyan bg-clip-text text-transparent">
            AeroTester v1.0
          </h1>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-800 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col">
          {/* Simulation Settings */}
          <div className="mb-4">
            <SimulationSettings
              settings={simSettings}
              onSettingsChange={setSimSettings}
            />
          </div>

          <Controls
            params={params}
            setParams={setParams}
          />
          {/* Current Stats moved here */}
          <CurrentStats
            currentResult={currentResult}
            baselineTest={baselineTest}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full w-full lg:w-auto">
        {/* Canvas Area */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center border-b border-slate-800">
          <SimulationCanvas
            params={params}
            onRun={handleRunTest}
            onSave={handleSaveTest}
            currentResult={currentResult}
            onAngleChange={handleAngleChange}
            isSaving={isSaving}
            saveMessage={saveMessage}
            loadedShape={loadedShape}
            simSettings={simSettings}
          />
        </div>

        {/* Results Panel - Compact on mobile for more canvas space */}
        <div className="min-h-[200px] lg:h-1/3 bg-slate-900 overflow-auto">
          <ResultsPanel
            currentResult={currentResult}
            history={testResults}
            onLoadTest={handleLoadTest}
            baselineTest={baselineTest}
            onSetBaseline={setBaselineTest}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
