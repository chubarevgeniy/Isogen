import React, { useState, useRef } from 'react';
import { SettingsPanel } from './components/SettingsPanel';
import { CanvasPreview } from './components/CanvasPreview';
import { ValueNoise3D } from './lib/noise';
import { STLBuilder } from './lib/stl';

export default function App() {
  const dimensionsRef = useRef({ w: 0, h: 0 }); // Note: this is somewhat duplicated with CanvasPreview, but needed for export math

  // Update dimensions for export use
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

  // Params
  const [linesCount, setLinesCount] = useState(61);
  const [amplitude, setAmplitude] = useState(163);
  const [frequency, setFrequency] = useState(6.9);
  const [spacing, setSpacing] = useState(26);
  const [noiseOffset, setNoiseOffset] = useState(0.040);
  const [seed, setSeed] = useState(1);
  const [zRange, setZRange] = useState<[number, number]>([0, 5]);

  // Animation
  const [previewZ, setPreviewZ] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animDir, setAnimDir] = useState(1);

  // 3D Preview
  const [rotX, setRotX] = useState(0.5);
  const [rotY, setRotY] = useState(0.5);

  // Export Settings
  const [exportRadius, setExportRadius] = useState(10);
  const [exportHeight, setExportHeight] = useState(8);
  const [exportThickness, setExportThickness] = useState(1);
  const [exportQuality, setExportQuality] = useState(0.1); // step for Z

  const getLineDisplacement = (noise: ValueNoise3D, t: number, lineIndex: number, currentZ: number) => {
    const nx = t * frequency;
    const ny = lineIndex * noiseOffset;
    return noise.get(nx, ny, currentZ) * amplitude;
  };

  const generateAndDownloadSTL = () => {
    const builder = new STLBuilder();
    const noise = new ValueNoise3D(seed);
    const WALL = 1.0; // Thickness of the outer cylinder frame

    const { w, h } = dimensionsRef.current;
    const radius = Math.min(w, h) * 0.45;
    const lineSpreadOffset = (linesCount * spacing) / 2;

    const zSteps = Math.ceil(exportHeight / exportQuality);
    const tSteps = 400;

    // 1. Generate Lines
    for (let i = 0; i < linesCount; i++) {
      let gridsL: number[][][] = [];
      let gridsR: number[][][] = [];

      for (let zi = 0; zi <= zSteps; zi++) {
        let zFract = zi / zSteps;
        let realZ = zFract * exportHeight;

        // UPDATE: Extract current frame instead of varying across Z
        let noiseZ = previewZ;

        let yOffset = i * spacing - lineSpreadOffset;
        let ptsL: number[][] = [];
        let ptsR: number[][] = [];

        for (let ti = 0; ti <= tSteps; ti++) {
          let t = ti / tSteps;
          let displacement = getLineDisplacement(noise, t, i, noiseZ);
          let final_yOffset = yOffset + displacement;

          // Derivative for normal
          let dt = 0.001;
          let disp_dt = getLineDisplacement(noise, t + dt, i, noiseZ);
          let d_yOffset = yOffset + disp_dt;

          let dx = (dt) * w * 1.5 + 0.707 * (d_yOffset - final_yOffset);
          let dy = (-dt) * h * 1.5 + 0.707 * (d_yOffset - final_yOffset);
          let len = Math.sqrt(dx*dx + dy*dy);
          let nx = -dy / len;
          let ny = dx / len;

          let px = (t - 0.5) * w * 1.5 + 0.707 * final_yOffset;
          let py = (0.5 - t) * h * 1.5 + 0.707 * final_yOffset;

          // Offset for thickness
          let halfThick = exportThickness / 2;
          let lx = px + nx * halfThick;
          let ly = py + ny * halfThick;
          let rx = px - nx * halfThick;
          let ry = py - ny * halfThick;

          // Mask by radius
          let dL = Math.sqrt(lx*lx + ly*ly);
          let dR = Math.sqrt(rx*rx + ry*ry);

          if (dL <= radius && dR <= radius) {
            // Map to physical size
            let mapX = (x: number) => (x / radius) * exportRadius;
            let mapY = (y: number) => (y / radius) * exportRadius;
            ptsL.push([mapX(lx), mapY(ly), realZ]);
            ptsR.push([mapX(rx), mapY(ry), realZ]);
          }
        }

        if (ptsL.length > 0) {
            gridsL.push(ptsL);
            gridsR.push(ptsR);
        }
      }

      // Triangulate grids for this line
      for (let gz = 0; gz < gridsL.length - 1; gz++) {
          let r1_l = gridsL[gz];
          let r2_l = gridsL[gz+1];
          let r1_r = gridsR[gz];
          let r2_r = gridsR[gz+1];

          let minLen = Math.min(r1_l.length, r2_l.length);

          for (let p = 0; p < minLen - 1; p++) {
              // Left wall
              builder.addQuad(r1_l[p], r2_l[p], r2_l[p+1], r1_l[p+1]);
              // Right wall
              builder.addQuad(r1_r[p+1], r2_r[p+1], r2_r[p], r1_r[p]);
              // Top
              if(gz === gridsL.length - 2) {
                 builder.addQuad(r2_l[p], r2_r[p], r2_r[p+1], r2_l[p+1]);
              }
              // Bottom
              if(gz === 0) {
                 builder.addQuad(r1_l[p+1], r1_r[p+1], r1_r[p], r1_l[p]);
              }
          }
          // End caps
          if (minLen > 0) {
              builder.addQuad(r1_l[0], r1_r[0], r2_r[0], r2_l[0]);
              builder.addQuad(r1_r[minLen-1], r1_l[minLen-1], r2_l[minLen-1], r2_r[minLen-1]);
          }
      }
    }

    // 2. Generate Hollow Cylinder
    const segments = 256;
    for (let i = 0; i < segments; i++) {
        let a1 = (i / segments) * Math.PI * 2;
        let a2 = ((i + 1) / segments) * Math.PI * 2;

        let in_x1 = exportRadius * Math.cos(a1);
        let in_y1 = exportRadius * Math.sin(a1);
        let in_x2 = exportRadius * Math.cos(a2);
        let in_y2 = exportRadius * Math.sin(a2);

        let out_x1 = (exportRadius + WALL) * Math.cos(a1);
        let out_y1 = (exportRadius + WALL) * Math.sin(a1);
        let out_x2 = (exportRadius + WALL) * Math.cos(a2);
        let out_y2 = (exportRadius + WALL) * Math.sin(a2);

        // Inner wall
        builder.addQuad(
            [in_x2, in_y2, 0], [in_x1, in_y1, 0],
            [in_x1, in_y1, exportHeight], [in_x2, in_y2, exportHeight]
        );
        // Outer wall
        builder.addQuad(
            [out_x1, out_y1, 0], [out_x2, out_y2, 0],
            [out_x2, out_y2, exportHeight], [out_x1, out_y1, exportHeight]
        );
        // Bottom rim
        builder.addQuad([out_x2, out_y2, 0], [out_x1, out_y1, 0], [in_x1, in_y1, 0], [in_x2, in_y2, 0]);
        // Top rim
        builder.addQuad([in_x2, in_y2, exportHeight], [in_x1, in_y1, exportHeight], [out_x1, out_y1, exportHeight], [out_x2, out_y2, exportHeight]);
    }

    // 3. Export
    const blob = builder.build();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `3d_isolines_${seed}.stl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        generateAndDownloadSTL={generateAndDownloadSTL}
      />
    </div>
  );
}
