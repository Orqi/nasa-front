import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import SpiralGalaxy from './components/Galaxy'

function App() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Galaxy Background */}
      <Canvas
        camera={{ position: [0, 0, 18], fov: 45 }}
        gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        dpr={Math.max(1, window.devicePixelRatio / 2)}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <SpiralGalaxy />
      </Canvas>

      {/* Gradio UI overlay */}
      <iframe
        src="https://dura.onrender.com"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '700px',
          borderRadius: '16px',
          border: 'none',
          background: 'rgba(255, 255, 255, 0.9)', // semi-transparent to see galaxy behind
          zIndex: 2,
        }}
        title="Exoplanet Classifier"
      />
    </div>
  )
}

export default App