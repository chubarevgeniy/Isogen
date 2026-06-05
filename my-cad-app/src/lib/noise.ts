export class ValueNoise3D {
  p: Uint8Array;

  constructor(seed = 123) {
    this.p = new Uint8Array(512);
    let s = seed;
    const permutation = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      permutation[i] = i;
    }
    // Shuffle
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const temp = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = temp;
    }

    for (let i = 0; i < 256; i++) {
      this.p[i] = permutation[i];
      this.p[i + 256] = permutation[i];
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

export class PerlinNoise3D {
  p: Uint8Array;
  constructor(seed = 123) {
    this.p = new Uint8Array(512);
    let s = seed;
    const permutation = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      permutation[i] = i;
    }
    // Shuffle
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const temp = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = temp;
    }

    for (let i = 0; i < 256; i++) {
      this.p[i] = permutation[i];
      this.p[i + 256] = permutation[i];
    }
  }

  fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t: number, a: number, b: number) {
    return a + t * (b - a);
  }

  grad(hash: number, x: number, y: number, z: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  val(x: number, y: number, z: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;

    return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z),
                                     this.grad(this.p[BA], x - 1, y, z)),
                             this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                                     this.grad(this.p[BB], x - 1, y - 1, z))),
                     this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                                     this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                             this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                                     this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
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
