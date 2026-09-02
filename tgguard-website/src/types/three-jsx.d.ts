/// <reference types="@react-three/fiber" />
/// <reference types="@react-three/drei" />

import { ThreeElements } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
