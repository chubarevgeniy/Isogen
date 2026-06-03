export class STLBuilder {
  triangles: { normal: number[], vertices: number[][] }[];

  constructor() {
    this.triangles = [];
  }

  addTriangle(p1: number[], p2: number[], p3: number[]) {
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

  addQuad(p1: number[], p2: number[], p3: number[], p4: number[]) {
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