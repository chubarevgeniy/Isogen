export class ValueNoise3D {
  p: Uint8Array;

  constructor(seed = 123) {
    this.p = new Uint8Array(512);
    let s = seed;
    for (let i = 0; i < 256; i++) {
      s = (s * 16807) % 2147483647;
      this.p[i] = s % 256;
    }
    for (let i = 0; i < 256; i++) {
      this.p[i + 256] = this.p[i];
    }
  }

  lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  }

  smooth(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  val(x: number, y: number, z: number) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, zi = Math.floor(z) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y), zf = z - Math.floor(z);
    const u = this.smooth(xf), v = this.smooth(yf), w = this.smooth(zf);
    const p = this.p;
    const c000 = p[p[p[xi] + yi] + zi], c100 = p[p[p[xi + 1] + yi] + zi];
    const c010 = p[p[p[xi] + yi + 1] + zi], c110 = p[p[p[xi + 1] + yi + 1] + zi];
    const c001 = p[p[p[xi] + yi] + zi + 1], c101 = p[p[p[xi + 1] + yi] + zi + 1];
    const c011 = p[p[p[xi] + yi + 1] + zi + 1], c111 = p[p[p[xi + 1] + yi + 1] + zi + 1];
    const x1 = this.lerp(c000, c100, u), x2 = this.lerp(c010, c110, u);
    const x3 = this.lerp(c001, c101, u), x4 = this.lerp(c011, c111, u);
    const y1 = this.lerp(x1, x2, v), y2 = this.lerp(x3, x4, v);
    return (this.lerp(y1, y2, w) / 255.0) * 2 - 1;
  }

  get(x: number, y: number, z: number, octaves = 3, persistence = 0.5) {
    let total = 0, frequency = 1, amplitude = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.val(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }
}

export class CellularNoise3D {
  p: Uint8Array;
  jitter: number;

  constructor(seed = 123, jitter = 1.0) {
    this.jitter = jitter;
    this.p = new Uint8Array(512);
    let s = seed;
    for (let i = 0; i < 256; i++) {
      s = (s * 16807) % 2147483647;
      this.p[i] = s % 256;
    }
    for (let i = 0; i < 256; i++) {
      this.p[i + 256] = this.p[i];
    }
  }

  // PRNG based on grid coordinates
  hash(x: number, y: number, z: number) {
    const p = this.p;
    return p[p[p[x & 255] + (y & 255)] + (z & 255)];
  }

  // Returns a pseudo-random offset in [-jitter/2, jitter/2]
  getOffset(x: number, y: number, z: number, component: number) {
    const h = this.hash(x + component * 11, y + component * 17, z + component * 23);
    return (h / 255.0 - 0.5) * this.jitter;
  }

  val(x: number, y: number, z: number) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;

    let minDist = 999999;

    for (let k = -1; k <= 1; k++) {
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const cx = xi + i, cy = yi + j, cz = zi + k;
          const ox = this.getOffset(cx, cy, cz, 0);
          const oy = this.getOffset(cx, cy, cz, 1);
          const oz = this.getOffset(cx, cy, cz, 2);

          const dx = (i + ox) - xf;
          const dy = (j + oy) - yf;
          const dz = (k + oz) - zf;

          const dist = dx * dx + dy * dy + dz * dz;
          if (dist < minDist) {
            minDist = dist;
          }
        }
      }
    }

    // Return value scaled closer to [-1, 1] for visual similarity with Value noise
    // Cellular minimum distance is typically [0, 1] before sqrt.
    // For Worley noise visually pleasing effect, we can map dist to [-1, 1]
    const d = Math.sqrt(minDist);
    return d * 2 - 1;
  }

  get(x: number, y: number, z: number, octaves = 3, persistence = 0.5) {
    let total = 0, frequency = 1, amplitude = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.val(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }
}
