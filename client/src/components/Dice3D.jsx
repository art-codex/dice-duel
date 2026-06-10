import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

function createFaceTexture(number, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = `Bold ${canvas.width * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number.toString(), canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function DiceMesh({ rolling }) {
  const meshRef = useRef();
  useFrame(() => {
    if (rolling) {
      meshRef.current.rotation.x += 0.08;
      meshRef.current.rotation.y += 0.1;
      meshRef.current.rotation.z += 0.07;
    }
  });
  const colors = ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c'];
  const materials = [];
  for (let i = 1; i <= 6; i++) {
    materials.push(createFaceTexture(i, colors[i - 1]));
  }
  return (
    <Box ref={meshRef} args={[1.8, 1.8, 1.8]}>
      {materials.map((mat, idx) => (
        <meshStandardMaterial key={idx} map={mat} attach={`material-${idx}`} />
      ))}
    </Box>
  );
}

export default function Dice3D({ rolling }) {
  return (
    <div style={{ width: '130px', height: '130px' }}>
      <Canvas camera={{ position: [2, 2, 2], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <DiceMesh rolling={rolling} />
      </Canvas>
    </div>
  );
}