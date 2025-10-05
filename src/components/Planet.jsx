import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, AdditiveBlending, DoubleSide, BackSide, SRGBColorSpace } from 'three'

// --- Procedural texture helpers ---
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return { r: 136, g: 170, b: 255 }
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function adjust(rgb, amt) {
  return {
    r: clamp(Math.round(rgb.r + amt), 0, 255),
    g: clamp(Math.round(rgb.g + amt), 0, 255),
    b: clamp(Math.round(rgb.b + amt), 0, 255),
  }
}
function lerp(a, b, t) { return Math.round(a + (b - a) * t) }
function mix(c1, c2, t) {
  return { r: lerp(c1.r, c2.r, t), g: lerp(c1.g, c2.g, t), b: lerp(c1.b, c2.b, t) }
}
function rgbCss({ r, g, b }) { return `rgb(${r},${g},${b})` }

function generatePlanetTexture(name, baseHex) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d')
  const base = hexToRgb(baseHex)
  const dark = adjust(base, -40)
  const light = adjust(base, +40)

  const style = /k2-18/i.test(name) ? 'banded' : /trappist/i.test(name) ? 'mottled' : 'patchy'

  if (style === 'banded') {
    // Bands + storms
    for (let y = 0; y < c.height; y++) {
      const t = y / c.height
      const f1 = Math.sin(t * Math.PI * 10) * 0.5 + 0.5
      const f2 = Math.sin(t * Math.PI * 24 + 0.8) * 0.25 + 0.5
      const m = mix(mix(dark, base, f1), light, f2 * 0.6)
      ctx.fillStyle = rgbCss(m)
      ctx.fillRect(0, y, c.width, 1)
    }
    ctx.globalAlpha = 0.22
    for (let i = 0; i < 240; i++) {
      const r = Math.random() * 26 + 8
      const x = Math.random() * c.width
      const y = Math.random() * c.height
      const t = Math.random()
      const col = mix(dark, light, t)
      ctx.fillStyle = rgbCss(col)
      ctx.beginPath()
      ctx.ellipse(x, y, r * (0.8 + Math.random()*0.6), r * (0.3 + Math.random()*0.4), Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else if (style === 'mottled') {
    ctx.fillStyle = rgbCss(base)
    ctx.fillRect(0, 0, c.width, c.height)
    for (let i = 0; i < 1200; i++) {
      const r = Math.random() * 20 + 6
      const x = Math.random() * c.width
      const y = Math.random() * c.height
      const t = Math.random()
      const col = mix(dark, light, t * 0.7)
      ctx.fillStyle = rgbCss(col)
      ctx.globalAlpha = 0.15 + Math.random() * 0.35
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else {
    ctx.fillStyle = rgbCss(base)
    ctx.fillRect(0, 0, c.width, c.height)
    for (let i = 0; i < 600; i++) {
      const w = (Math.random() * 60 + 20) | 0
      const h = (Math.random() * 20 + 8) | 0
      const x = (Math.random() * (c.width + w)) | 0
      const y = (Math.random() * (c.height + h)) | 0
      ctx.fillStyle = rgbCss(light)
      ctx.globalAlpha = 0.08 + Math.random() * 0.12
      ctx.beginPath()
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  const tex = new CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = SRGBColorSpace // ensures correct color/brightness
  tex.needsUpdate = true
  return tex
}

export default forwardRef(function Planet(
  {
    name = 'Exoplanet',
    color = '#88aaff',
    radiusEarth = 1,
    position = [0, 0, 0],
    tilt = [0, 0, 0],
    sizeScale = 1,
    selected = false,
    onClick,
    onBack,
    slowSpin = 0.01,
    fastSpin = 0.06,
  },
  ref
) {
  const group = useRef()
  const mesh = useRef()
  const halo = useRef()
  const haloMat = useRef()
  const [hovered, setHovered] = useState(false)

  const texture = useMemo(() => generatePlanetTexture(name, color), [name, color])
  useEffect(() => () => texture && texture.dispose(), [texture])

  useFrame((state) => {
    if (mesh.current) mesh.current.rotation.y += (selected ? fastSpin : slowSpin) * 0.5
    if (selected && halo.current && haloMat.current) {
      const t = state.clock.getElapsedTime()
      const s = 1.25 + Math.sin(t * 2) * 0.06
      halo.current.scale.set(s, s, s)
      haloMat.current.opacity = 0.14 + (Math.sin(t * 3) * 0.08 + 0.08)
    }
  })

  const baseVR = Math.max(0.5, radiusEarth * 0.6)
  const vr = baseVR * sizeScale

  return (
    <group
      ref={ref || group}
      position={position}
      rotation={tilt}
      onClick={onClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto' }}
    >
      {/* Core planet */}
      <mesh ref={mesh} castShadow receiveShadow>
        <sphereGeometry args={[vr, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          map={texture}
          roughness={0.55}
          metalness={0.12}
          emissive={hovered || selected ? color : '#000000'}
          emissiveIntensity={hovered ? 0.25 : selected ? 0.15 : 0.0}
        />
      </mesh>

      {/* Subtle atmosphere glow */}
      <mesh scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[vr, 64, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={AdditiveBlending}
          side={BackSide}
        />
      </mesh>

      {(hovered || selected) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[vr * 1.15, vr * 1.3, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} side={DoubleSide} />
        </mesh>
      )}

      {selected && (
        <group ref={halo} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh
            onClick={(e) => { e.stopPropagation(); onBack && onBack() }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
            onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto' }}
          >
            <ringGeometry args={[vr * 1.45, vr * 1.8, 96]} />
            <meshBasicMaterial
              ref={haloMat}
              color={color}
              transparent
              opacity={0.2}
              blending={AdditiveBlending}
              side={DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  )
})