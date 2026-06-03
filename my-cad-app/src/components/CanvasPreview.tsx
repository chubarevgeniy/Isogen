import React, { useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { ValueNoise3D } from '../lib/noise';

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
}

export function CanvasPreview({
  activeTab, linesCount, amplitude, frequency, spacing, noiseOffset, seed,
  previewZ, isAnimating, setIsAnimating, animDir, setAnimDir, setPreviewZ, zRange,
  rotX, rotY, setRotX, setRotY, exportRadius, exportHeight, exportQuality
}: CanvasPreviewProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimensionsRef = useRef({ w: 0, h: 0 });
  const reqRef = useRef<number>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
          dimensionsRef.current = { w: parent.clientWidth, h: parent.clientHeight };
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse / Touch for 3D rotation
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX || (e as any).touches?.[0]?.clientX, y: e.clientY || (e as any).touches?.[0]?.clientY };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || activeTab !== '3d') return;
    const x = e.clientX || (e as any).touches?.[0]?.clientX;
    const y = e.clientY || (e as any).touches?.[0]?.clientY;
    const dx = x - lastMouse.current.x;
    const dy = y - lastMouse.current.y;

    setRotY(prev => prev + dx * 0.01);
    setRotX(prev => Math.max(-Math.PI/2, Math.min(Math.PI/2, prev + dy * 0.01)));

    lastMouse.current = { x, y };
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  const getLineDisplacement = (noise: ValueNoise3D, t: number, lineIndex: number, currentZ: number) => {
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
        const project3D = (x: number, y: number, z: number) => {
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

        const drawCylinderWireframe = (r: number, h_ext: number) => {
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
            // Updated: use previewZ for straight vertical walls
            let noiseZ = previewZ;

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
    return () => {
      if (reqRef.current !== null) cancelAnimationFrame(reqRef.current);
    };
  }, [linesCount, amplitude, frequency, spacing, noiseOffset, seed, zRange, previewZ, isAnimating, animDir, activeTab, rotX, rotY, exportRadius, exportHeight, exportQuality]);

  return (
    <div
      className="flex-1 relative cursor-crosshair"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
