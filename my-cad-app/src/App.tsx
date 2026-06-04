import React, { useState, useRef } from 'react';
import { SettingsPanel } from './components/SettingsPanel';
import { CanvasPreview } from './components/CanvasPreview';
import { ValueNoise3D } from './lib/noise';
import { STLBuilder } from './lib/stl';

export default function App() {
  const dimensionsRef = useRef({ w: 0, h: 0 });

  React.useEffect(() => {
     const updateDim = () => {
         const el = document.querySelector('.flex-1.relative.cursor-crosshair');
         if(el) {
             dimensionsRef.current = { w: el.clientWidth, h: el.clientHeight };
         }
     }
     window.addEventListener('resize', updateDim);
     updateDim();
     return () => window.removeEventListener('resize', updateDim);
  }, []);

  const [activeTab, setActiveTab] = useState('2d');

  // Params matching the old logic
  const [linesCount, setLinesCount] = useState(40);
  const [amplitude, setAmplitude] = useState(150);
  const [frequency, setFrequency] = useState(2.0);
  const [spacing, setSpacing] = useState(10);
  const [noiseOffset, setNoiseOffset] = useState(0.04);
  const [seed, setSeed] = useState(Math.random() * 10000);
  const [zRange, setZRange] = useState<[number, number]>([0, 5.0]);

  // Animation
  const [previewZ, setPreviewZ] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDir, setAnimDir] = useState(1);

  // 3D Preview
  const [rotX, setRotX] = useState(0.3);
  const [rotY, setRotY] = useState(0.5);

  // Export Settings
  const [exportRadius, setExportRadius] = useState(50);
  const [exportHeight, setExportHeight] = useState(40);
  const [exportThickness, setExportThickness] = useState(1.5);
  const [exportQuality, setExportQuality] = useState(0.5);

  const getLineDisplacement = (noiseGen: ValueNoise3D, lineIdx: number, t: number, z: number) => {
    const yNoise = lineIdx * noiseOffset;
    const lineSpreadOffset = (lineIdx - (linesCount - 1) / 2) * spacing;
    const n = noiseGen.get(t * frequency, yNoise, z);
    return lineSpreadOffset + n * amplitude;
  };

  const [isExporting, setIsExporting] = useState(false);

  const generateAndDownloadSTL = () => {
    if (isExporting) return;
    setIsExporting(true);

    const worker = new Worker(new URL('./lib/exportWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      const { type, buffer, error } = e.data;
      if (type === 'SUCCESS') {
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `noise_ring_${exportRadius}x${exportHeight}mm.stl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error('Export error:', error);
        alert('Failed to generate STL: ' + error);
      }
      setIsExporting(false);
      worker.terminate();
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      alert('Failed to generate STL due to worker error.');
      setIsExporting(false);
      worker.terminate();
    };

    worker.postMessage({
      linesCount, amplitude, frequency, spacing, noiseOffset, seed, zRange,
      exportRadius, exportHeight, exportThickness, exportQuality,
      dimensions: dimensionsRef.current
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-200">
      {isExporting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl font-medium text-slate-200">Generating Solid 3D Model...</p>
            <p className="text-slate-400 mt-2">This may take a minute or two.</p>
          </div>
        </div>
      )}
      <CanvasPreview
        activeTab={activeTab}
        linesCount={linesCount}
        amplitude={amplitude}
        frequency={frequency}
        spacing={spacing}
        noiseOffset={noiseOffset}
        seed={seed}
        previewZ={previewZ}
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
        animDir={animDir}
        setAnimDir={setAnimDir}
        setPreviewZ={setPreviewZ}
        zRange={zRange}
        rotX={rotX}
        rotY={rotY}
        setRotX={setRotX}
        setRotY={setRotY}
        exportRadius={exportRadius}
        exportHeight={exportHeight}
        exportQuality={exportQuality}
      />
      <SettingsPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        linesCount={linesCount}
        setLinesCount={setLinesCount}
        amplitude={amplitude}
        setAmplitude={setAmplitude}
        frequency={frequency}
        setFrequency={setFrequency}
        spacing={spacing}
        setSpacing={setSpacing}
        noiseOffset={noiseOffset}
        setNoiseOffset={setNoiseOffset}
        seed={seed}
        setSeed={setSeed}
        zRange={zRange}
        setZRange={setZRange}
        previewZ={previewZ}
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
        exportRadius={exportRadius}
        setExportRadius={setExportRadius}
        exportHeight={exportHeight}
        setExportHeight={setExportHeight}
        exportThickness={exportThickness}
        setExportThickness={setExportThickness}
        exportQuality={exportQuality}
        setExportQuality={setExportQuality}
        generateAndDownloadSTL={generateAndDownloadSTL}
      />
    </div>
  );
}
