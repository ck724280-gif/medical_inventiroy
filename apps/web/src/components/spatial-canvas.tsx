'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function MedicalPill() {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (hovered ? 1.6 : 0.45);
      meshRef.current.rotation.x += delta * 0.25;
    }
  });

  return (
    <group
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.12 : 1.0}
    >
      <Float speed={2.5} rotationIntensity={0.6} floatIntensity={1.2}>
        {/* Capsule Top Half (Vibrant Cyan with Emissive Glow) */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.8, 32]} />
          <meshStandardMaterial
            color="#06b6d4"
            roughness={0.15}
            metalness={0.2}
            emissive="#0891b2"
            emissiveIntensity={hovered ? 0.4 : 0.15}
          />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <sphereGeometry args={[0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial
            color="#06b6d4"
            roughness={0.15}
            metalness={0.2}
            emissive="#0891b2"
            emissiveIntensity={hovered ? 0.4 : 0.15}
          />
        </mesh>

        {/* Capsule Bottom Half (Deep Obsidian Slate) */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.8, 32]} />
          <meshStandardMaterial
            color="#0f2040"
            roughness={0.25}
            metalness={0.6}
            emissive="#050a0f"
            emissiveIntensity={0.2}
          />
        </mesh>
        <mesh position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial
            color="#0f2040"
            roughness={0.25}
            metalness={0.6}
            emissive="#050a0f"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Center Glowing Neon Ring */}
        <mesh position={[0, 0.2, 0]}>
          <torusGeometry args={[0.615, 0.035, 16, 32]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.8}
            roughness={0.1}
          />
        </mesh>
      </Float>
    </group>
  );
}

export function SpatialMedicalCanvas() {
  return (
    <div className="w-28 h-28 sm:w-32 sm:h-32 relative cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <pointLight position={[5, 5, 5]} color="#22d3ee" intensity={1.5} />
        <pointLight position={[-5, -5, -2]} color="#0891b2" intensity={1.0} />
        <MedicalPill />
      </Canvas>
    </div>
  );
}
