import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Stage } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

function Model({ url }: { url: string }) {
  const geom = useLoader(STLLoader, url);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={0.4} />
    </mesh>
  );
}

export function STLViewer({ url, className }: { url: string, className?: string }) {
  return (
    <Canvas className={className} camera={{ position: [0, -60, 60], fov: 45 }}>
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      <Suspense fallback={null}>
        <Center>
          <Model url={url} />
        </Center>
      </Suspense>
      <OrbitControls makeDefault />
    </Canvas>
  );
}
