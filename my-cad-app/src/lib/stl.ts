export class STLBuilder {
  triangles: number[];

  constructor() {
    this.triangles = [];
  }

  addTriangle(p1: number[], p2: number[], p3: number[]) {
    const u = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    const v = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
    const nx = u[1] * v[2] - u[2] * v[1];
    const ny = u[2] * v[0] - u[0] * v[2];
    const nz = u[0] * v[1] - u[1] * v[0];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    this.triangles.push(
      nx / len, ny / len, nz / len,
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
      p3[0], p3[1], p3[2]
    );
  }

  addQuad(p1: number[], p2: number[], p3: number[], p4: number[]) {
    this.addTriangle(p1, p2, p3);
    this.addTriangle(p1, p3, p4);
  }

  build(): Blob {
    const count = this.triangles.length / 12;
    const buffer = new ArrayBuffer(80 + 4 + count * 50);
    const view = new DataView(buffer);
    for (let i = 0; i < 80; i++) view.setUint8(i, 0);
    view.setUint32(80, count, true);
    let offset = 84;
    for (let i = 0; i < count; i++) {
      const idx = i * 12;
      for (let j = 0; j < 12; j++) {
        view.setFloat32(offset, this.triangles[idx + j], true);
        offset += 4;
      }
      view.setUint16(offset, 0, true);
      offset += 2;
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
  }
}
