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

  const [previewMode, setPreviewMode] = useState<'flat' | '3d' | 'stl'>('flat');
  const [isStlOutdated, setIsStlOutdated] = useState(true);

  // Params matching the old logic
  const [noiseType, setNoiseType] = useState<'value' | 'perlin'>('value');
    const [outerShape, setOuterShape] = useState<'circle' | 'square'>('circle');
  const [lineAngle, setLineAngle] = useState(45);

  const [linesCount, setLinesCount] = useState(40);
  const [amplitude, setAmplitude] = useState(10);
  const [frequencyX, setFrequencyX] = useState(2.0);
  const [spacing, setSpacing] = useState(2);
  const [noiseOffsetY, setNoiseOffsetY] = useState(0.04);
  const [noiseOffsetZ, setNoiseOffsetZ] = useState(1.0);
  const [seed, setSeed] = useState(Math.random() * 10000);
  const [zStart, setZStart] = useState(0);
  const [zLength, setZLength] = useState(0.2);
  const [zMultiplier, setZMultiplier] = useState(1.0);

  const zRange: [number, number] = [zStart, zStart + zLength];




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

  const [isExporting, setIsExporting] = useState(false);

  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [stlFilename, setStlFilename] = useState<string | null>(null);

  React.useEffect(() => {
    setIsStlOutdated(true);
  }, [linesCount, amplitude, frequencyX, spacing, noiseOffsetY, noiseOffsetZ, seed, zStart, zLength, zMultiplier, exportRadius, exportHeight, exportThickness, exportQuality, noiseType, outerShape, lineAngle]);




  const generateSTL = () => {
    if (isExporting) return;
    setIsExporting(true);

    const worker = new Worker(new URL('./lib/exportWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      const { type, buffer, error } = e.data;
      if (type === 'SUCCESS') {
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        setStlUrl(url);
        setStlFilename(`noise_ring_${exportRadius}x${exportHeight}mm.stl`);
        setIsStlOutdated(false);
        setPreviewMode('stl');
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
      linesCount, amplitude, frequencyX, spacing, noiseOffsetY, noiseOffsetZ, seed, zRange, zMultiplier,
      exportRadius, exportHeight, exportThickness, exportQuality,
      dimensions: { w: 200, h: 200 },
      noiseType, outerShape, lineAngle
    });
  };

  const downloadSTL = () => {
    if (!stlUrl || !stlFilename) return;
    const a = document.createElement('a');
    a.href = stlUrl;
    a.download = stlFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const clearSTL = () => {
    if (stlUrl) {
      URL.revokeObjectURL(stlUrl);
      setStlUrl(null);
      setStlFilename(null);
    }
  };
return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-200">

      <CanvasPreview
        previewMode={previewMode}
        isStlOutdated={isStlOutdated}
        isExporting={isExporting}
        generateSTL={generateSTL}
        noiseType={noiseType}
        outerShape={outerShape}
        lineAngle={lineAngle}
        linesCount={linesCount}
        amplitude={amplitude}
        frequencyX={frequencyX}
        spacing={spacing}
        noiseOffsetY={noiseOffsetY}
        noiseOffsetZ={noiseOffsetZ}
        seed={seed}
        previewZ={previewZ}
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
        animDir={animDir}
        setAnimDir={setAnimDir}
        setPreviewZ={setPreviewZ}
        zRange={zRange}
        zMultiplier={zMultiplier}
        rotX={rotX}
        rotY={rotY}
        setRotX={setRotX}
        setRotY={setRotY}
        exportRadius={exportRadius}
        exportHeight={exportHeight}
        exportQuality={exportQuality}
        stlUrl={stlUrl}
      />
      <SettingsPanel
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        isStlOutdated={isStlOutdated}
        isExporting={isExporting}
        generateSTL={generateSTL}
        noiseType={noiseType}
        setNoiseType={setNoiseType}
        outerShape={outerShape}
        setOuterShape={setOuterShape}
        lineAngle={lineAngle}
        setLineAngle={setLineAngle}
        linesCount={linesCount}
        setLinesCount={setLinesCount}
        amplitude={amplitude}
        setAmplitude={setAmplitude}
        frequencyX={frequencyX}
        setFrequencyX={setFrequencyX}
        spacing={spacing}
        setSpacing={setSpacing}
        noiseOffsetY={noiseOffsetY}
        setNoiseOffsetY={setNoiseOffsetY}
        noiseOffsetZ={noiseOffsetZ}
        setNoiseOffsetZ={setNoiseOffsetZ}
        seed={seed}
        setSeed={setSeed}
        zStart={zStart}
        setZStart={setZStart}
        zLength={zLength}
        setZLength={setZLength}
        zMultiplier={zMultiplier}
        setZMultiplier={setZMultiplier}
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
        downloadSTL={downloadSTL}
        clearSTL={clearSTL}
        stlUrl={stlUrl}
      />
    </div>
  );
}
