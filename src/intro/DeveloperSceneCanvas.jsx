import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Icosahedron } from '@react-three/drei';

function RotatingCube({ position, color, speed = 0.25 }) {
  const ref = useRef(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * speed;
    ref.current.rotation.y += delta * speed * 1.2;
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.25} />
    </mesh>
  );
}

function SceneObjects() {
  const groupRef = useRef(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.15;
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.8}>
        <RotatingCube position={[-1.8, 0.4, -1]} color="#38bdf8" speed={0.35} />
      </Float>
      <Float speed={1.1} rotationIntensity={0.6} floatIntensity={0.7}>
        <RotatingCube position={[1.7, -0.2, -1.2]} color="#22d3ee" speed={0.28} />
      </Float>
      <Float speed={1.6} rotationIntensity={0.65} floatIntensity={0.9}>
        <Icosahedron args={[0.42, 0]} position={[0, 0.75, -1.5]}>
          <meshStandardMaterial color="#34d399" metalness={0.4} roughness={0.3} />
        </Icosahedron>
      </Float>
    </group>
  );
}

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.22) * 0.16;
    camera.position.y = Math.cos(t * 0.17) * 0.12;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function DeveloperSceneCanvas() {
  return (
    <Canvas className="intro-three-canvas" camera={{ position: [0, 0, 4.2], fov: 48 }} dpr={[1, 1.4]}>
      <ambientLight intensity={0.55} />
      <directionalLight intensity={1.15} position={[2.5, 2.5, 2]} color="#93c5fd" />
      <pointLight intensity={0.75} position={[-2, -1, 2.4]} color="#22d3ee" />
      <SceneObjects />
      <CameraDrift />
    </Canvas>
  );
}

export default DeveloperSceneCanvas;
