"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshDistortMaterial } from "@react-three/drei";
import { useScroll, useTransform } from "framer-motion";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function MorphingObject() {
  const { scrollYProgress } = useScroll();
  
  // Tie rotation and scale to the global page scroll
  const rotationX = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 4]);
  const rotationY = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 2]);
  const distort = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 0.8, 0.2]);
  const speed = useTransform(scrollYProgress, [0, 0.5, 1], [1, 5, 1]);
  
  const meshRef1 = useRef<THREE.Mesh>(null);
  const meshRef2 = useRef<THREE.Mesh>(null);
  const materialRef1 = useRef<THREE.MeshStandardMaterial>(null);
  const materialRef2 = useRef<any>(null); // MeshDistortMaterial

  // Pre-calculate colors for interpolation
  const colors = useMemo(() => ({
    c1: new THREE.Color("#3b82f6"),
    c2: new THREE.Color("#8b5cf6"),
    c3: new THREE.Color("#10b981")
  }), []);

  useFrame(() => {
    const rx = rotationX.get();
    const ry = rotationY.get();
    const d = distort.get();
    const s = speed.get();
    const progress = scrollYProgress.get();

    if (meshRef1.current) {
      meshRef1.current.rotation.x = rx;
      meshRef1.current.rotation.y = ry;
    }
    if (meshRef2.current) {
      meshRef2.current.rotation.x = rx;
      meshRef2.current.rotation.y = ry;
    }
    
    // Update material distort/speed
    if (materialRef2.current) {
      materialRef2.current.distort = d;
      materialRef2.current.speed = s;
    }

    // Update material colors
    if (materialRef1.current) {
      if (progress < 0.5) {
        materialRef1.current.color.lerpColors(colors.c1, colors.c2, progress * 2);
      } else {
        materialRef1.current.color.lerpColors(colors.c2, colors.c3, (progress - 0.5) * 2);
      }
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef1} scale={1.5}>
        <icosahedronGeometry args={[1, 32]} />
        <meshStandardMaterial
          ref={materialRef1}
          roughness={0.2}
          metalness={0.8}
          wireframe={true}
        />
      </mesh>
      
      <mesh ref={meshRef2} scale={1.4}>
        <icosahedronGeometry args={[1, 64]} />
        <MeshDistortMaterial
          ref={materialRef2}
          color="#0f172a"
          roughness={0.1}
          metalness={1}
        />
      </mesh>
    </Float>
  );
}

export function ScrollScene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="city" />
        
        {/* The morphing cyber object */}
        <MorphingObject />
      </Canvas>
    </div>
  );
}
