'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function MedicalPill() {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (hovered ? 1.5 : 0.4);
      meshRef.current.rotation.x += delta * 0.2;
    }
  });

  return (
    <group
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.1 : 1.0}
    >
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* Capsule Top Half (Sky Blue) */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.8, 32]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <sphereGeometry args={[0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.1} />
        </mesh>

        {/* Capsule Bottom Half (Pure White) */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.8, 32]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
        </mesh>

        {/* Center Ring */}
        <mesh position={[0, 0.2, 0]}>
          <torusGeometry args={[0.61, 0.03, 16, 32]} />
          <meshStandardMaterial color="#0369a1" roughness={0.1} />
        </mesh>
      </Float>
    </group>
  );
}

export function SpatialMedicalCanvas() {
  return (
    <div className="w-24 h-24 sm:w-28 sm:h-28 relative cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -5, -2]} color="#38bdf8" intensity={0.8} />
        <MedicalPill />
      </Canvas>
    </div>
  );
}
