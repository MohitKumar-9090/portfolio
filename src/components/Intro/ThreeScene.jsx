import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls, Sphere, Stars, Torus } from '@react-three/drei';

function FloatingDesk() {
  return (
    <>
      <Float speed={1.3} rotationIntensity={0.8} floatIntensity={1.2}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[2.6, 0.12, 1.4]} />
          <meshStandardMaterial color="#0f172a" metalness={0.55} roughness={0.35} />
        </mesh>
      </Float>

      <Float speed={1.9} rotationIntensity={1.2} floatIntensity={1.6}>
        <mesh position={[0, 0.25, 0.2]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[1.5, 0.1, 0.95]} />
          <meshStandardMaterial color="#1d4ed8" metalness={0.4} roughness={0.25} />
        </mesh>
      </Float>
    </>
  );
}

function FloatingTech() {
  return (
    <>
      <Float speed={2.4} rotationIntensity={1.6} floatIntensity={1.9}>
        <Sphere args={[0.22, 24, 24]} position={[-2.2, 1.2, -1.2]}>
          <meshStandardMaterial color="#22d3ee" />
        </Sphere>
      </Float>
      <Float speed={2.2} rotationIntensity={1.4} floatIntensity={1.7}>
        <Torus args={[0.25, 0.08, 16, 32]} position={[2.1, 0.5, -1.3]}>
          <meshStandardMaterial color="#34d399" />
        </Torus>
      </Float>
      <Float speed={2.5} rotationIntensity={1.8} floatIntensity={1.5}>
        <Sphere args={[0.18, 24, 24]} position={[1.6, -0.9, -0.8]}>
          <meshStandardMaterial color="#f59e0b" />
        </Sphere>
      </Float>
    </>
  );
}

function ThreeScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.6], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 5, 11]} />
      <ambientLight intensity={0.45} />
      <directionalLight intensity={1.1} position={[3, 4, 4]} />
      <pointLight intensity={0.7} position={[-3, -2, 3]} color="#38bdf8" />

      <Stars radius={45} depth={45} count={1200} factor={3} fade speed={0.7} />
      <FloatingDesk />
      <FloatingTech />

      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.55} />
    </Canvas>
  );
}

export default ThreeScene;
