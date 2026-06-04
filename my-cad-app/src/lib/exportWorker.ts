import { ValueNoise3D, CellularNoise3D } from './noise';
import { geometries, booleans, primitives } from '@jscad/modeling';
import { serialize } from '@jscad/stl-serializer';

self.onmessage = (e) => {
  const {
    linesCount, amplitude, frequency, spacing, noiseOffset, seed, zRange, zMultiplier,
    exportRadius, exportHeight, exportThickness, exportQuality,
    dimensions, noiseType, cellularJitter, outerShape, lineAngle
  } = e.data;

  try {
    const noiseGen = noiseType === 'cellular' ? new CellularNoise3D(seed, cellularJitter) : new ValueNoise3D(seed);
    const { w, h } = dimensions;

    const tSteps = 400;
    const zSlicesCount = Math.floor(exportHeight / exportQuality);

    const angleRad = (lineAngle * Math.PI) / 180;
    const dirX = Math.cos(angleRad);
    const dirY = Math.sin(angleRad);

    // normal is perpendicular to direction
    const normX = -dirY;
    const normY = dirX;

    const diagLen = Math.sqrt(w * w + h * h);

    const getLineDisplacement = (lineIdx: number, t: number, z: number) => {
      const yNoise = lineIdx * noiseOffset;
      const lineSpreadOffset = (lineIdx - (linesCount - 1) / 2) * spacing;
      const base_n = noiseGen.get(t * frequency, yNoise, zRange[0]);
      const current_n = noiseGen.get(t * frequency, yNoise, z);
      return lineSpreadOffset + base_n * amplitude + (current_n - base_n) * amplitude * zMultiplier;
    };

    const allGeometries = [];

    // 1. WALLS (LINES)
    for (let i = 0; i < linesCount; i++) {
      const gridL: number[][][] = [];
      const gridR: number[][][] = [];
      const insideMask: boolean[][] = [];

      for (let sz = 0; sz <= zSlicesCount; sz++) {
        const zAlpha = sz / zSlicesCount;
        const currentZNoise = zRange[0] + zAlpha * (zRange[1] - zRange[0]);
        const realZ = zAlpha * exportHeight;

        const rowL: number[][] = [];
        const rowR: number[][] = [];
        const rowMask: boolean[] = [];

        for (let jt = 0; jt <= tSteps; jt++) {
          const t = jt / tSteps;
          const distanceAlongLine = (t - 0.5) * diagLen;
          const px2d = w/2 + dirX*distanceAlongLine + normX * getLineDisplacement(i, t, currentZNoise);
          const py2d = h/2 + dirY*distanceAlongLine + normY * getLineDisplacement(i, t, currentZNoise);

          let nTx = normX, nTy = normY;
          if (jt < tSteps) {
            const nextDistanceAlongLine = ((jt + 1) / tSteps - 0.5) * diagLen;
            const pnx = w/2 + dirX*nextDistanceAlongLine + normX * getLineDisplacement(i, (jt + 1) / tSteps, currentZNoise);
            const pny = h/2 + dirY*nextDistanceAlongLine + normY * getLineDisplacement(i, (jt + 1) / tSteps, currentZNoise);
            const dx = pnx - px2d; const dy = pny - py2d;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            nTx = -dy / len; nTy = dx / len;
          }

          const cx = px2d - w / 2;
          const cy = -(py2d - h / 2);

          const thick = exportThickness / 2;
          rowL.push([cx - nTx * thick, cy + nTy * thick, realZ]);
          rowR.push([cx + nTx * thick, cy - nTy * thick, realZ]);

          const dist = Math.sqrt(cx * cx + cy * cy);
          const isInside = outerShape === 'square'
            ? (Math.abs(cx) <= exportRadius + (exportThickness / 2) && Math.abs(cy) <= exportRadius + (exportThickness / 2))
            : (dist <= exportRadius + (exportThickness / 2));

          rowMask.push(isInside);
        }
        gridL.push(rowL); gridR.push(rowR); insideMask.push(rowMask);
      }

      // Triangulate line into a single geom3
      const polys = [];
      for (let sz = 0; sz < zSlicesCount; sz++) {
        for (let jt = 0; jt < tSteps; jt++) {
          if (!insideMask[sz][jt] && !insideMask[sz][jt + 1]) continue;

          const L1 = gridL[sz][jt], L2 = gridL[sz][jt + 1], L3 = gridL[sz + 1][jt + 1], L4 = gridL[sz + 1][jt];
          const R1 = gridR[sz][jt], R2 = gridR[sz][jt + 1], R3 = gridR[sz + 1][jt + 1], R4 = gridR[sz + 1][jt];

          // Top
          polys.push(geometries.poly3.create([L1, L4, L3]));
          polys.push(geometries.poly3.create([L1, L3, L2]));

          // Bottom
          polys.push(geometries.poly3.create([R1, R2, R3]));
          polys.push(geometries.poly3.create([R1, R3, R4]));

          if (sz === 0) {
            polys.push(geometries.poly3.create([L1, L2, R2]));
            polys.push(geometries.poly3.create([L1, R2, R1]));
          }
          if (sz === zSlicesCount - 1) {
            polys.push(geometries.poly3.create([L4, R4, R3]));
            polys.push(geometries.poly3.create([L4, R3, L3]));
          }

          if (jt === 0 || (!insideMask[sz][jt - 1] && insideMask[sz][jt])) {
            polys.push(geometries.poly3.create([L1, R1, R4]));
            polys.push(geometries.poly3.create([L1, R4, L4]));
          }
          if (jt === tSteps - 1 || (!insideMask[sz][jt + 1] && insideMask[sz][jt])) {
            polys.push(geometries.poly3.create([L2, L3, R3]));
            polys.push(geometries.poly3.create([L2, R3, R2]));
          }
        }
      }

      if (polys.length > 0) {
        allGeometries.push(geometries.geom3.create(polys));
      }
    }

    // 2. OUTER FRAME (NO BOTTOM)
    const WALL = 2.0;
    const R_OUT = exportRadius + WALL;
    let ring;

    if (outerShape === 'square') {
      const outerBox = primitives.cuboid({ size: [R_OUT * 2, R_OUT * 2, exportHeight], center: [0, 0, exportHeight / 2] });
      const innerBox = primitives.cuboid({ size: [exportRadius * 2, exportRadius * 2, exportHeight], center: [0, 0, exportHeight / 2] });
      ring = booleans.subtract(outerBox, innerBox);
    } else {
      const cylinderSegs = 256;
      const outerCyl = primitives.cylinder({ radius: R_OUT, height: exportHeight, segments: cylinderSegs, center: [0, 0, exportHeight / 2] });
      const innerCyl = primitives.cylinder({ radius: exportRadius, height: exportHeight, segments: cylinderSegs, center: [0, 0, exportHeight / 2] });
      ring = booleans.subtract(outerCyl, innerCyl);
    }
    allGeometries.push(ring);

    // 3. SERIALIZE DIRECTLY (avoid OOM from union)
    // We pass all geometries to serialize, which will write them as multiple solids/shells in one STL.
    const stlDataArray = serialize({ binary: true }, ...allGeometries);

    // The binary serializer returns an array of ArrayBuffers (header, count, data, data, ...)
    // We need to combine them into a single ArrayBuffer for the blob.
    let totalLength = 0;
    for (const buf of stlDataArray) {
      totalLength += buf.byteLength;
    }

    const finalBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of stlDataArray) {
      finalBuffer.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    // Send back buffer, transfer it
    self.postMessage({ type: 'SUCCESS', buffer: finalBuffer.buffer }, [finalBuffer.buffer]);

  } catch (err: any) {
    self.postMessage({ type: 'ERROR', error: err.toString() });
  }
};
