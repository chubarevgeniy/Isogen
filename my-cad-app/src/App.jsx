import React, { useState, useEffect, useRef } from 'react';
import { Settings2, Play, Download, Pause } from 'lucide-react';

// --- 1. Генератор Шума (ValueNoise3D) ---
class ValueNoise3D {
  constructor(seed = 1) {
    this.seed = seed;
    this.p = new Uint8Array(512);
    this.init(seed);
  }

  // LCG PRNG
  init(seed) {
    let currentSeed = seed >>> 0;
    const lcg = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
      return (currentSeed >>> 8) / 0xffffff;
    };
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(lcg() * 256);
      this.p[i + 256] = this.p[i];
    }
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Smoothstep: 6t^5 - 15t^4 + 10t^3
  smooth(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  val(x, y, z) {
    let xi = Math.floor(x) & 255;
    let yi = Math.floor(y) & 255;
    let zi = Math.floor(z) & 255;

    let xf = x - Math.floor(x);
    let yf = y - Math.floor(y);
    let zf = z - Math.floor(z);

    let u = this.smooth(xf);
    let v = this.smooth(yf);
    let w = this.smooth(zf);

    let p = this.p;

    let a = p[xi] + yi;
    let aa = p[a] + zi;
    let ab = p[a + 1] + zi;
    let b = p[xi + 1] + yi;
    let ba = p[b] + zi;
    let bb = p[b + 1] + zi;

    let res = this.lerp(
      this.lerp(
        this.lerp(p[aa], p[ba], u),
        this.lerp(p[ab], p[bb], u),
        v
      ),
      this.lerp(
        this.lerp(p[aa + 1], p[ba + 1], u),
        this.lerp(p[ab + 1], p[bb + 1], u),
        v
      ),
      w
    );

    // Normalize to -1 .. 1 (p returns 0..255)
    return (res / 255) * 2 - 1;
  }

  get(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.val(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

// --- 2. Построитель STL (STLBuilder) ---
class STLBuilder {
  constructor() {
    this.triangles = [];
  }

  addTriangle(p1, p2, p3) {
    // Normal vector
    let v1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    let v2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];

    let nx = v1[1] * v2[2] - v1[2] * v2[1];
    let ny = v1[2] * v2[0] - v1[0] * v2[2];
    let nz = v1[0] * v2[1] - v1[1] * v2[0];

    let len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    this.triangles.push({
      normal: [nx, ny, nz],
      vertices: [p1, p2, p3]
    });
  }

  addQuad(p1, p2, p3, p4) {
    this.addTriangle(p1, p2, p3);
    this.addTriangle(p1, p3, p4);
  }

  build() {
    let buffer = new ArrayBuffer(80 + 4 + this.triangles.length * 50);
    let view = new DataView(buffer);

    // 80 bytes header (empty)
    for (let i = 0; i < 80; i++) view.setUint8(i, 0);

    // Number of triangles
    view.setUint32(80, this.triangles.length, true);

    let offset = 84;
    for (let i = 0; i < this.triangles.length; i++) {
      let tri = this.triangles[i];

      // Normal
      view.setFloat32(offset, tri.normal[0], true); offset += 4;
      view.setFloat32(offset, tri.normal[1], true); offset += 4;
      view.setFloat32(offset, tri.normal[2], true); offset += 4;

      // V1
      view.setFloat32(offset, tri.vertices[0][0], true); offset += 4;
      view.setFloat32(offset, tri.vertices[0][1], true); offset += 4;
      view.setFloat32(offset, tri.vertices[0][2], true); offset += 4;

      // V2
      view.setFloat32(offset, tri.vertices[1][0], true); offset += 4;
      view.setFloat32(offset, tri.vertices[1][1], true); offset += 4;
      view.setFloat32(offset, tri.vertices[1][2], true); offset += 4;

      // V3
      view.setFloat32(offset, tri.vertices[2][0], true); offset += 4;
      view.setFloat32(offset, tri.vertices[2][1], true); offset += 4;
      view.setFloat32(offset, tri.vertices[2][2], true); offset += 4;

      // Attribute byte count
      view.setUint16(offset, 0, true); offset += 2;
    }

    return new Blob([buffer], { type: 'application/octet-stream' });
  }
}

// --- 3. Основной Компонент (App) ---
export default function App() {
  const canvasRef = useRef(null);
  const dimensionsRef = useRef({ w: 0, h: 0 });
  const reqRef = useRef(null);

  const [activeTab, setActiveTab] = useState('2d');

  // Params
  const [linesCount, setLinesCount] = useState(40);
  const [amplitude, setAmplitude] = useState(40);
  const [frequency, setFrequency] = useState(2);
  const [spacing, setSpacing] = useState(4);
  const [noiseOffset, setNoiseOffset] = useState(0.2);
  const [seed, setSeed] = useState(1);
  const [zRange, setZRange] = useState([0, 5]);

  // Animation
  const [previewZ, setPreviewZ] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animDir, setAnimDir] = useState(1);

  // 3D Preview
  const [rotX, setRotX] = useState(0.5);
  const [rotY, setRotY] = useState(0.5);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Export Settings
  const [exportRadius, setExportRadius] = useState(10);
  const [exportHeight, setExportHeight] = useState(8);
  const [exportThickness, setExportThickness] = useState(1);
  const [exportQuality, setExportQuality] = useState(0.1); // step for Z

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight;
        dimensionsRef.current = { w: parent.clientWidth, h: parent.clientHeight };
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse / Touch for 3D rotation
  const onPointerDown = (e) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX || e.touches?.[0].clientX, y: e.clientY || e.touches?.[0].clientY };
  };

  const onPointerMove = (e) => {
    if (!isDragging.current || activeTab !== '3d') return;
    const x = e.clientX || e.touches?.[0].clientX;
    const y = e.clientY || e.touches?.[0].clientY;
    const dx = x - lastMouse.current.x;
    const dy = y - lastMouse.current.y;

    setRotY(prev => prev + dx * 0.01);
    setRotX(prev => Math.max(-Math.PI/2, Math.min(Math.PI/2, prev + dy * 0.01)));

    lastMouse.current = { x, y };
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  // Math helper
  const getLineDisplacement = (noise, t, lineIndex, currentZ) => {
    const nx = t * frequency;
    const ny = lineIndex * noiseOffset;
    return noise.get(nx, ny, currentZ) * amplitude;
  };

  // Animation Loop & Render
  useEffect(() => {
    const noise = new ValueNoise3D(seed);

    const render = () => {
      const { w, h } = dimensionsRef.current;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || w === 0 || h === 0) return;

      // Update Z if animating
      if (isAnimating && activeTab === '2d') {
        setPreviewZ(prev => {
          let next = prev + animDir * 0.02;
          if (next > zRange[1]) {
            setAnimDir(-1);
            return zRange[1];
          }
          if (next < zRange[0]) {
            setAnimDir(1);
            return zRange[0];
          }
          return next;
        });
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      const radius = Math.min(w, h) * 0.45;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = 'screen';

      if (activeTab === '2d') {
        const lineSpreadOffset = (linesCount * spacing) / 2;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < linesCount; i++) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${200 + i * 2}, 80%, 60%, 0.6)`;

          let yOffset = i * spacing - lineSpreadOffset;

          for (let t = 0; t <= 1; t += 0.01) {
            let base_x = (t - 0.5) * w * 1.5;
            let base_y = (0.5 - t) * h * 1.5;

            let normal_x = 0.707;
            let normal_y = 0.707;

            let displacement = getLineDisplacement(noise, t, i, previewZ);
            let final_yOffset = yOffset + displacement;

            let px = w / 2 + base_x + normal_x * final_yOffset;
            let py = h / 2 + base_y + normal_y * final_yOffset;

            if (t === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      } else {
        // 3D Preview
        const project3D = (x, y, z) => {
          // Rotate X
          let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
          let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);

          // Rotate Y
          let x2 = x * Math.cos(rotY) + z1 * Math.sin(rotY);
          let z2 = -x * Math.sin(rotY) + z1 * Math.cos(rotY);

          // Perspective/Isometric
          const scale = 15;
          return {
            x: w / 2 + x2 * scale,
            y: h / 2 + y1 * scale
          };
        };

        const drawCylinderWireframe = (r, h_ext) => {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          const segments = 32;
          for (let z of [0, h_ext]) {
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
              let angle = (i / segments) * Math.PI * 2;
              let px = r * Math.cos(angle);
              let py = r * Math.sin(angle);
              let p = project3D(px, py, z - h_ext / 2);
              if (i === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
          }
        };

        drawCylinderWireframe(exportRadius, exportHeight);
        drawCylinderWireframe(exportRadius + 1, exportHeight);

        // Draw sampled lines in 3D
        ctx.lineWidth = 1.5;
        const lineSpreadOffset = (linesCount * spacing) / 2;

        let zSteps = Math.ceil(exportHeight / (exportQuality * 5));
        for (let i = 0; i < linesCount; i += 2) { // draw every 2nd line for performance
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${280 + i * 2}, 80%, 60%, 0.8)`;

          for (let zi = 0; zi <= zSteps; zi++) {
            let zFract = zi / zSteps;
            let realZ = exportHeight * zFract;
            let noiseZ = zRange[0] + (zRange[1] - zRange[0]) * zFract;

            let yOffset = i * spacing - lineSpreadOffset;
            let found = false;
            let bestT = 0;
            // Find center intersection roughly
            for (let t = 0.4; t <= 0.6; t += 0.05) {
                let displacement = getLineDisplacement(noise, t, i, noiseZ);
                let final_yOffset = yOffset + displacement;

                // distance from center line
                let dist = Math.abs(final_yOffset);
                if (dist < 100) {
                  found = true;
                  bestT = t;
                  break;
                }
            }

            if(found) {
                let displacement = getLineDisplacement(noise, bestT, i, noiseZ);
                let final_yOffset = yOffset + displacement;
                let normal_x = 0.707;
                let normal_y = 0.707;
                let px = (bestT - 0.5) * w * 1.5 + normal_x * final_yOffset;
                let py = (0.5 - bestT) * h * 1.5 + normal_y * final_yOffset;

                // map to circle
                let dist = Math.sqrt(px*px + py*py);
                if(dist <= radius) {
                   let nx = px / radius * exportRadius;
                   let ny = py / radius * exportRadius;
                   let p = project3D(nx, ny, realZ - exportHeight/2);
                   if(zi === 0) ctx.moveTo(p.x, p.y);
                   else ctx.lineTo(p.x, p.y);
                }
            }
          }
          ctx.stroke();
        }
      }

      ctx.restore();
      reqRef.current = requestAnimationFrame(render);
    };

    reqRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqRef.current);
  }, [linesCount, amplitude, frequency, spacing, noiseOffset, seed, zRange, previewZ, isAnimating, animDir, activeTab, rotX, rotY, exportRadius, exportHeight, exportQuality]);

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
      let gridsL = [];
      let gridsR = [];

      for (let zi = 0; zi <= zSteps; zi++) {
        let zFract = zi / zSteps;
        let realZ = zFract * exportHeight;
        let noiseZ = zRange[0] + (zRange[1] - zRange[0]) * zFract;

        let yOffset = i * spacing - lineSpreadOffset;
        let ptsL = [];
        let ptsR = [];

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
            let mapX = (x) => (x / radius) * exportRadius;
            let mapY = (y) => (y / radius) * exportRadius;
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
      {/* Canvas Area */}
      <div
        className="flex-1 relative cursor-crosshair"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Play/Pause for 2D */}
        {activeTab === '2d' && (
          <button
            className="absolute bottom-4 left-4 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 shadow-lg backdrop-blur-sm transition-all"
            onClick={() => setIsAnimating(!isAnimating)}
          >
            {isAnimating ? <Pause size={20} className="text-cyan-400" /> : <Play size={20} className="text-cyan-400" />}
          </button>
        )}
      </div>

      {/* Settings Panel */}
      <div className="w-full md:w-[380px] h-[50dvh] md:h-full bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col z-10">

        {/* Tabs */}
        <div className="flex border-b border-slate-800 p-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('2d')}
            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${activeTab === '2d' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            <Settings2 size={18} /> Settings
          </button>
          <button
            onClick={() => setActiveTab('3d')}
            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${activeTab === '3d' ? 'bg-slate-800 text-purple-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            <Download size={18} /> Export
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {activeTab === '2d' ? (
            <>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Lines Count</span>
                  <span className="font-mono text-cyan-400">{linesCount}</span>
                </div>
                <input type="range" min="10" max="100" value={linesCount} onChange={(e) => setLinesCount(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Amplitude</span>
                  <span className="font-mono text-cyan-400">{amplitude}</span>
                </div>
                <input type="range" min="10" max="150" value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Frequency</span>
                  <span className="font-mono text-cyan-400">{frequency.toFixed(2)}</span>
                </div>
                <input type="range" min="0.1" max="10" step="0.1" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Seed</span>
                  <span className="font-mono text-cyan-400">{seed}</span>
                </div>
                <input type="range" min="1" max="1000" value={seed} onChange={(e) => setSeed(Number(e.target.value))} className="w-full accent-cyan-500" />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-400">Z Range (Cut thickness)</span>
                  <span className="font-mono text-cyan-400">{zRange[0].toFixed(1)} - {zRange[1].toFixed(1)}</span>
                </div>
                {/* Custom Double Slider */}
                <div className="double-slider-container">
                    <div className="double-slider-track"></div>
                    <div
                      className="double-slider-range"
                      style={{
                        left: `${(zRange[0] / 10) * 100}%`,
                        width: `${((zRange[1] - zRange[0]) / 10) * 100}%`
                      }}
                    ></div>
                    <input
                      type="range"
                      min="0" max="10" step="0.1"
                      value={zRange[0]}
                      onChange={(e) => setZRange([Math.min(Number(e.target.value), zRange[1] - 0.1), zRange[1]])}
                      className="double-slider-input"
                    />
                    <input
                      type="range"
                      min="0" max="10" step="0.1"
                      value={zRange[1]}
                      onChange={(e) => setZRange([zRange[0], Math.max(Number(e.target.value), zRange[0] + 0.1)])}
                      className="double-slider-input"
                    />
                </div>
                {!isAnimating && (
                   <div className="pt-2 text-xs text-slate-500">
                     Preview Z: {previewZ.toFixed(2)}
                   </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-slate-800/50 rounded-xl mb-4 text-sm text-slate-300">
                Drag the canvas area to rotate the 3D preview.
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Ring Radius (mm)</span>
                  <span className="font-mono text-purple-400">{exportRadius}</span>
                </div>
                <input type="range" min="5" max="30" value={exportRadius} onChange={(e) => setExportRadius(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Ring Height (mm)</span>
                  <span className="font-mono text-purple-400">{exportHeight}</span>
                </div>
                <input type="range" min="2" max="20" value={exportHeight} onChange={(e) => setExportHeight(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Line Thickness (mm)</span>
                  <span className="font-mono text-purple-400">{exportThickness.toFixed(1)}</span>
                </div>
                <input type="range" min="0.2" max="3" step="0.1" value={exportThickness} onChange={(e) => setExportThickness(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>

              <button
                onClick={generateAndDownloadSTL}
                className="w-full py-4 mt-6 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-xl font-medium shadow-lg shadow-purple-900/50 transition-all flex justify-center items-center gap-2"
              >
                <Download size={20} /> Generate STL
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
