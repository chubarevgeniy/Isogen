export class ValueNoise3D {
  seed: number;
  p: Uint8Array;

  constructor(seed = 1) {
    this.seed = seed;
    this.p = new Uint8Array(512);
    this.init(seed);
  }

  // LCG PRNG
  init(seed: number) {
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

  lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  // Smoothstep: 6t^5 - 15t^4 + 10t^3
  smooth(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  val(x: number, y: number, z: number) {
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

  get(x: number, y: number, z: number, octaves = 4, persistence = 0.5, lacunarity = 2) {
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
