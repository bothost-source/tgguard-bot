import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, MeshTransmissionMaterial, Text } from '@react-three/fiber'
import * as THREE from 'three'

interface CubeData {
  position: [number, number, number]
  scale: number
  speed: number
  offset: number
  color: string
}

export function Shield3D({ position = [0, 0, 0] as [number, number, number] }) {
  const shieldRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)

  const particles = useMemo(() => {
    const count = 200
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4
    }
    return positions
  }, [])

  useFrame((state: { clock: { elapsedTime: number } }) => {
    if (shieldRef.current) {
      shieldRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
        <group ref={shieldRef}>
          {/* Outer glow ring */}
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[2.2, 0.03, 16, 100]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} />
          </mesh>

          {/* Main shield shape */}
          <mesh>
            <cylinderGeometry args={[1.8, 1.8, 0.15, 6]} />
            <MeshTransmissionMaterial
              backside
              samples={4}
              thickness={0.5}
              chromaticAberration={0.1}
              anisotropy={0.3}
              distortion={0.2}
              distortionScale={0.5}
              temporalDistortion={0.1}
              color="#00d4ff"
              attenuationColor="#0066aa"
              attenuationDistance={2}
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Inner shield icon */}
          <mesh position={[0, 0, 0.1]}>
            <cylinderGeometry args={[1.2, 1.2, 0.08, 6]} />
            <meshStandardMaterial
              color="#0a1628"
              metalness={0.8}
              roughness={0.2}
              emissive="#00d4ff"
              emissiveIntensity={0.15}
            />
          </mesh>

          {/* Shield checkmark */}
          <Text
            position={[0, 0.05, 0.15]}
            fontSize={0.8}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
            font="https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2"
          >
            ✓
          </Text>

          {/* Orbiting dots */}
          {Array.from({ length: 6 }).map((_, i: number) => (
            <mesh
              key={i}
              position={[
                Math.cos((i / 6) * Math.PI * 2) * 2.5,
                Math.sin((i / 6) * Math.PI * 2) * 2.5,
                0
              ]}
            >
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#00d4ff" : "#a855f7"}
                emissive={i % 2 === 0 ? "#00d4ff" : "#a855f7"}
                emissiveIntensity={1}
              />
            </mesh>
          ))}
        </group>
      </Float>

      {/* Background particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#00d4ff"
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

export function FloatingCubes({ count = 20 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null)

  const cubes = useMemo<CubeData[]>(() => {
    return Array.from({ length: count }, (_, i: number) => ({
      position: [
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 8 - 3
      ] as [number, number, number],
      scale: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.5 + 0.2,
      offset: Math.random() * Math.PI * 2,
      color: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#a855f7' : '#22c55e'
    }))
  }, [count])

  useFrame((state: { clock: { elapsedTime: number } }) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        const cube = cubes[i]
        child.position.y = cube.position[1] + Math.sin(state.clock.elapsedTime * cube.speed + cube.offset) * 0.5
        child.rotation.x = state.clock.elapsedTime * cube.speed * 0.3
        child.rotation.y = state.clock.elapsedTime * cube.speed * 0.2
      })
    }
  })

  return (
    <group ref={groupRef}>
      {cubes.map((cube: CubeData, i: number) => (
        <mesh key={i} position={cube.position} scale={cube.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={cube.color}
            transparent
            opacity={0.15}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

export function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial
        color="#0a0a1a"
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={0.3}
      />
    </mesh>
  )
}

export function GlowingOrbs() {
  const orbsRef = useRef<THREE.Group>(null)

  useFrame((state: { clock: { elapsedTime: number } }) => {
    if (orbsRef.current) {
      orbsRef.current.children.forEach((child: THREE.Object3D, i: number) => {
        const t = state.clock.elapsedTime
        child.position.x = Math.sin(t * 0.5 + i * 1.5) * 5
        child.position.y = Math.cos(t * 0.3 + i * 1.2) * 3
        child.position.z = Math.sin(t * 0.4 + i) * 2 - 2
      })
    }
  })

  return (
    <group ref={orbsRef}>
      {[
        { color: '#00d4ff', size: 0.3 },
        { color: '#a855f7', size: 0.25 },
        { color: '#22c55e', size: 0.2 },
        { color: '#ef4444', size: 0.15 },
        { color: '#eab308', size: 0.2 },
      ].map((orb: { color: string; size: number }, i: number) => (
        <mesh key={i}>
          <sphereGeometry args={[orb.size, 32, 32]} />
          <meshStandardMaterial
            color={orb.color}
            emissive={orb.color}
            emissiveIntensity={2}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  )
}
