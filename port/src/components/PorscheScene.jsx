import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, PresentationControls } from '@react-three/drei';

function Model() {
  const { scene } = useGLTF('/porsche_911.glb'); // Place your model in /public
  const modelRef = useRef();

  // Gentle idle rotation
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    modelRef.current.rotation.y = Math.sin(t / 4) / 8;
    modelRef.current.position.y = (1 + Math.sin(t / 1.5)) / 20;
  });

  return <primitive ref={modelRef} object={scene} scale={1.5} />;
}

export default function PorscheScene() {
  return (
    <Canvas shadows camera={{ position: [5, 2, 5], fov: 35 }}>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      
      <PresentationControls
        global
        config={{ mass: 2, tension: 500 }}
        snap={{ mass: 4, tension: 1500 }}
        rotation={[0, 0.3, 0]}
        polar={[-Math.PI / 3, Math.PI / 3]}
        azimuth={[-Math.PI / 1.4, Math.PI / 2]}
      >
        <Model />
      </PresentationControls>

      <ContactShadows position={[0, -1.4, 0]} opacity={0.75} scale={10} blur={2.5} far={4} />
      <Environment preset="city" />
    </Canvas>
  );
}