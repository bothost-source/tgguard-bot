import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Stars, ContactShadows } from '@react-three/drei'
import { Shield3D, FloatingCubes, GridFloor, GlowingOrbs } from './Shield3D'

export default function HeroScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#00d4ff" />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#a855f7" />
          <Shield3D position={[0, 0.5, 0]} />
          <FloatingCubes count={15} />
          <GlowingOrbs />
          <GridFloor />
          <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
          <ContactShadows
            position={[0, -4, 0]}
            opacity={0.4}
            scale={20}
            blur={2}
            far={4}
          />
          <Environment preset="night" />
          <fog attach="fog" args={['#0a0a0f', 10, 25]} />
        </Suspense>
      </Canvas>
    </div>
  )
}
