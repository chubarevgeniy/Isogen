import React, { useRef, useEffect } from 'react';
import { ValueNoise3D } from '../lib/noise';
import { STLViewer } from './STLViewer';

interface CanvasPreviewProps {
  activeTab: string;
  linesCount: number;
  amplitude: number;
  frequency: number;
  spacing: number;
  noiseOffset: number;
  seed: number;
  previewZ: number;
  isAnimating: boolean;
  setIsAnimating: (animating: boolean) => void;
  animDir: number;
  setAnimDir: (dir: number) => void;
  setPreviewZ: React.Dispatch<React.SetStateAction<number>>;
  zRange: [number, number];
  rotX: number;
  rotY: number;
  setRotX: React.Dispatch<React.SetStateAction<number>>;
  setRotY: React.Dispatch<React.SetStateAction<number>>;
  exportRadius: number;
  exportHeight: number;
  exportQuality: number;
  stlUrl: string | null;
}

export function CanvasPreview({
  activeTab, linesCount, amplitude, frequency, spacing, noiseOffset, seed,
  previewZ, isAnimating, setIsAnimating, animDir, setAnimDir, setPreviewZ, zRange,
  rotX, rotY, setRotX, setRotY, exportRadius, exportHeight, exportQuality, stlUrl
}: CanvasPreviewProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimensionsRef = useRef({ w: 0, h: 0 });
  const reqRef = useRef<number>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          const dpr = window.devicePixelRatio || 1;
          canvasRef.current.width = parent.clientWidth * dpr;
          canvasRef.current.height = parent.clientHeight * dpr;
          canvasRef.current.style.width = `${parent.clientWidth}px`;
          canvasRef.current.style.height = `${parent.clientHeight}px`;
          dimensionsRef.current = { w: parent.clientWidth, h: parent.clientHeight };
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab !== '3d') return;
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX || (e as any).touches?.[0]?.clientX, y: e.clientY || (e as any).touches?.[0]?.clientY };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || activeTab !== '3d') return;
    const x = e.clientX || (e as any).touches?.[0]?.clientX;
    const y = e.clientY || (e as any).touches?.[0]?.clientY;
    const dx = x - lastMousePos.current.x;
    const dy = y - lastMousePos.current.y;

    setRotY(prev => prev + dx * 0.01);
    setRotX(prev => Math.max(-Math.PI/2, Math.min(Math.PI/2, prev + dy * 0.01)));

    lastMousePos.current = { x, y };
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  const getLineDisplacement = (noiseGen: ValueNoise3D, lineIdx: number, t: number, z: number) => {
    const yNoise = lineIdx * noiseOffset;
    const lineSpreadOffset = (lineIdx - (linesCount - 1) / 2) * spacing;
    const n = noiseGen.get(t * frequency, yNoise, z);
    return lineSpreadOffset + n * amplitude;
  };

  useEffect(() => {
    const noiseGen = new ValueNoise3D(seed);

    const render = () => {
      const { w, h } = dimensionsRef.current;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || w === 0 || h === 0) return;

      if (isAnimating && activeTab === '2d') {
        setPreviewZ(prev => {
          let next = prev + animDir * 0.01;
          if (next >= zRange[1]) {
            setAnimDir(-1);
            return zRange[1];
          }
          if (next <= zRange[0]) {
            setAnimDir(1);
            return zRange[0];
          }
          return next;
        });
      }

      const dpr = window.devicePixelRatio || 1;

      // Reset transform before clearing
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w * dpr, h * dpr);

      // Apply DPR scale for drawing
      ctx.scale(dpr, dpr);

      const cx = w / 2;
      const cy = h / 2;

      if (activeTab === '2d') {
        const radius = Math.min(w, h) * 0.45;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();

        const steps = 150;
        const diagLength = Math.sqrt(w * w + h * h);
        const normalX = h / diagLength;
        const normalY = w / diagLength;

        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < linesCount; i++) {
          ctx.beginPath();
          const hue = 180 + (i / linesCount) * 80;
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.7)`;
          ctx.lineWidth = 2;

          for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const baseX = w * t;
            const baseY = h * (1 - t);
            const displacement = getLineDisplacement(noiseGen, i, t, previewZ);

            const px = baseX + normalX * displacement;
            const py = baseY + normalY * displacement;

            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();

        // 2D frame
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

      } else {
        // 3D Preview
        const visualScale = Math.min(w, h) * 0.4 / exportRadius;

        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

        const project3D = (x: number, y: number, z: number) => {
          let y1 = y * cosX - z * sinX;
          let z1 = y * sinX + z * cosX;
          let x2 = x * cosY + z1 * sinY;
          let z2 = -x * sinY + z1 * cosY;
          const fov = 1500;
          const scale = fov / (fov + z2);
          return { x: cx + x2 * visualScale * scale, y: cy - y1 * visualScale * scale, z: z2 };
        };

        const drawCylinderWireframe = () => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
          ctx.lineWidth = 1;
          const r = exportRadius;
          const hw = exportHeight / 2;
          const segs = 64;

          for(let isTop of [false, true]) {
            const yOffset = isTop ? hw : -hw;
            ctx.beginPath();
            for(let i=0; i<=segs; i++) {
              const a = (i/segs) * Math.PI * 2;
              const p = project3D(Math.cos(a)*r, yOffset, Math.sin(a)*r);
              if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
          }
          ctx.beginPath();
          for(let i=0; i<segs; i+=8) {
            const a = (i/segs) * Math.PI * 2;
            const pb = project3D(Math.cos(a)*r, -hw, Math.sin(a)*r);
            const pt = project3D(Math.cos(a)*r, hw, Math.sin(a)*r);
            ctx.moveTo(pb.x, pb.y); ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        };

        drawCylinderWireframe();

        const zSlicesPreview = 15;
        const tStepsPreview = 40;

        ctx.lineWidth = 1.5;
        ctx.globalCompositeOperation = 'screen';

        const diagLen = Math.sqrt(w*w + h*h);
        const normX = h / diagLen;
        const normY = w / diagLen;

        for (let i = 0; i < linesCount; i++) {
          const hue = 260 + (i / linesCount) * 60;
          ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.6)`;

          for (let sz = 0; sz <= zSlicesPreview; sz++) {
            const zAlpha = sz / zSlicesPreview;
            const noiseZ = zRange[0] + zAlpha * (zRange[1] - zRange[0]);
            const physY = -exportHeight/2 + zAlpha * exportHeight;

            ctx.beginPath();
            let hasPoints = false;

            for (let jt = 0; jt <= tStepsPreview; jt++) {
              const t = jt / tStepsPreview;
              const disp = getLineDisplacement(noiseGen, i, t, noiseZ);

              const px2d = (w*t) + normX*disp - w/2;
              const py2d = (h*(1-t)) + normY*disp - h/2;

              const scaleTo3D = (exportRadius * 2) / (Math.min(w, h) * 0.9);
              let cx3d = px2d * scaleTo3D;
              let cy3d = py2d * scaleTo3D;

              const dist = Math.sqrt(cx3d*cx3d + cy3d*cy3d);
              if (dist <= exportRadius) {
                const p = project3D(cx3d, physY, cy3d);
                if (!hasPoints) { ctx.moveTo(p.x, p.y); hasPoints = true; }
                else ctx.lineTo(p.x, p.y);
              } else {
                hasPoints = false;
              }
            }
            ctx.stroke();
          }
        }
      }

      reqRef.current = requestAnimationFrame(render);
    };

    reqRef.current = requestAnimationFrame(render);
    return () => {
      if (reqRef.current !== null) cancelAnimationFrame(reqRef.current);
    };
  }, [linesCount, amplitude, frequency, spacing, noiseOffset, seed, zRange, previewZ, isAnimating, animDir, activeTab, rotX, rotY, exportRadius, exportHeight, exportQuality]);

  return (
    <div
      className="flex-1 relative cursor-crosshair touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {stlUrl ? (
        <div className="absolute inset-0 z-10 bg-slate-950">
          <STLViewer url={stlUrl} />
        </div>
      ) : null}
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
