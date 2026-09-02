import { ThreeElements } from '@react-three/fiber'

declare module '@react-three/fiber' {
  export interface ThreeElements {
    // Extends JSX intrinsic elements for R3F
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
