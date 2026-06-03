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

  const generateAndDownloadSTL = () => {
    // We can use a setTimeout to let the UI react (like setting an exporting state, though we omit it here for simplicity as the old app did mostly)
    setTimeout(() => {
      const stl = new STLBuilder();
      const noiseGen = new ValueNoise3D(seed);
      const { w, h } = dimensionsRef.current;

      const tSteps = 400;
      const zSlicesCount = Math.floor(exportHeight / exportQuality);

      const diagLen = Math.sqrt(w*w + h*h);
      const normX = h / diagLen;
      const normY = w / diagLen;

      // 1. WALLS (LINES)
      for (let i = 0; i < linesCount; i++) {
        const gridL = [], gridR = [], insideMask = [];

        for (let sz = 0; sz <= zSlicesCount; sz++) {
          const zAlpha = sz / zSlicesCount;
          const currentZNoise = zRange[0] + zAlpha * (zRange[1] - zRange[0]);
          const realZ = zAlpha * exportHeight;

          const rowL = [], rowR = [], rowMask = [];

          for (let jt = 0; jt <= tSteps; jt++) {
            const t = jt / tSteps;
            const px2d = (w*t) + normX * getLineDisplacement(noiseGen, i, t, currentZNoise) - w/2;
            const py2d = (h*(1-t)) + normY * getLineDisplacement(noiseGen, i, t, currentZNoise) - h/2;

            let nTx = normX, nTy = normY;
            if (jt < tSteps) {
              const pnx = (w*(jt+1)/tSteps) + normX * getLineDisplacement(noiseGen, i, (jt+1)/tSteps, currentZNoise) - w/2;
              const pny = (h*(1-(jt+1)/tSteps)) + normY * getLineDisplacement(noiseGen, i, (jt+1)/tSteps, currentZNoise) - h/2;
              const dx = pnx - px2d; const dy = pny - py2d;
              const len = Math.sqrt(dx*dx + dy*dy) || 1;
              nTx = -dy/len; nTy = dx/len;
            }

            const scaleTo3D = (exportRadius * 2) / (Math.min(w, h) * 0.9);
            const cx = px2d * scaleTo3D;
            const cy = -py2d * scaleTo3D;

            const thick = exportThickness / 2;
            rowL.push([cx - nTx * thick, cy + nTy * thick, realZ]);
            rowR.push([cx + nTx * thick, cy - nTy * thick, realZ]);

            const dist = Math.sqrt(cx*cx + cy*cy);
            rowMask.push(dist <= exportRadius + (exportThickness/2));
          }
          gridL.push(rowL); gridR.push(rowR); insideMask.push(rowMask);
        }

        // Triangulate line
        for (let sz = 0; sz < zSlicesCount; sz++) {
          for (let jt = 0; jt < tSteps; jt++) {
            if (!insideMask[sz][jt] && !insideMask[sz][jt+1]) continue;

            const L1 = gridL[sz][jt], L2 = gridL[sz][jt+1], L3 = gridL[sz+1][jt+1], L4 = gridL[sz+1][jt];
            const R1 = gridR[sz][jt], R2 = gridR[sz][jt+1], R3 = gridR[sz+1][jt+1], R4 = gridR[sz+1][jt];

            stl.addQuad(L1, L4, L3, L2);
            stl.addQuad(R1, R2, R3, R4);

            if (sz === 0) stl.addQuad(L1, L2, R2, R1);
            if (sz === zSlicesCount - 1) stl.addQuad(L4, R4, R3, L3);

            if (jt === 0 || (!insideMask[sz][jt-1] && insideMask[sz][jt])) stl.addQuad(L1, R1, R4, L4);
            if (jt === tSteps - 1 || (!insideMask[sz][jt+1] && insideMask[sz][jt])) stl.addQuad(L2, L3, R3, R2);
          }
        }
      }

      // 2. CYLINDER-FRAME (NO BOTTOM)
      const cylinderSegs = 256;
      const WALL = 2.0;

      for(let i=0; i<cylinderSegs; i++) {
        const a1 = (i/cylinderSegs) * Math.PI * 2;
        const a2 = ((i+1)/cylinderSegs) * Math.PI * 2;

        const p1_b_in = [Math.cos(a1)*exportRadius, Math.sin(a1)*exportRadius, 0];
        const p2_b_in = [Math.cos(a2)*exportRadius, Math.sin(a2)*exportRadius, 0];
        const p1_t_in = [Math.cos(a1)*exportRadius, Math.sin(a1)*exportRadius, exportHeight];
        const p2_t_in = [Math.cos(a2)*exportRadius, Math.sin(a2)*exportRadius, exportHeight];

        const R_OUT = exportRadius + WALL;
        const p1_b_out = [Math.cos(a1)*R_OUT, Math.sin(a1)*R_OUT, 0];
        const p2_b_out = [Math.cos(a2)*R_OUT, Math.sin(a2)*R_OUT, 0];
        const p1_t_out = [Math.cos(a1)*R_OUT, Math.sin(a1)*R_OUT, exportHeight];
        const p2_t_out = [Math.cos(a2)*R_OUT, Math.sin(a2)*R_OUT, exportHeight];

        stl.addQuad(p1_b_in, p2_b_in, p2_t_in, p1_t_in);
        stl.addQuad(p1_b_out, p1_t_out, p2_t_out, p2_b_out);
        stl.addQuad(p1_t_in, p2_t_in, p2_t_out, p1_t_out);
        stl.addQuad(p1_b_in, p1_b_out, p2_b_out, p2_b_in);
      }

      const blob = stl.build();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noise_ring_${exportRadius}x${exportHeight}mm.stl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-200">
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
