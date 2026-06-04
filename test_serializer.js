import { serialize } from '@jscad/stl-serializer';
import { primitives } from '@jscad/modeling';
import fs from 'fs';

const cyl1 = primitives.cylinder({ radius: 10, height: 10 });
const cyl2 = primitives.cylinder({ radius: 10, height: 10, center: [5, 5, 5] });

// serialize accepts an array?
try {
  const data = serialize({ binary: true }, cyl1, cyl2);
  console.log("Array as varargs works?", data.length);
} catch (e) {
  console.log("Varargs failed:", e.message);
}

try {
  const data = serialize({ binary: true }, [cyl1, cyl2]);
  console.log("Array works?", data.length);
} catch (e) {
  console.log("Array failed:", e.message);
}
