import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

export default function SpiralGalaxy({ pointerRef, z = -80, parallaxFactor = 0.15 }) {
  const mesh = useRef()
  const { camera, viewport } = useThree()

  // Scale the background to fill the viewport at its given Z-depth
  const v = viewport.getCurrentViewport(camera, new Vector3(0, 0, z))
  const scale = Math.max(v.width, v.height) * 1.2

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0.0 },
      u_resolution: { value: [window.innerWidth, window.innerHeight] },
      u_mouse: { value: [0.0, 0.0] },
    }),
    []
  )

  useFrame(({ clock, pointer }) => {
    if (mesh.current) {
      uniforms.u_time.value = clock.getElapsedTime()
      uniforms.u_mouse.value = [pointer.x * 0.5, pointer.y * 0.5]

      if (pointerRef?.current) {
        mesh.current.position.x = pointerRef.current.x * parallaxFactor * 20
        mesh.current.position.y = pointerRef.current.y * parallaxFactor * 15
      }
    }
  })

  return (
    <mesh ref={mesh} position={[0, 0, z]} scale={[scale, scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec2 u_resolution;
          uniform float u_time;
          uniform vec2 u_mouse;
          varying vec2 vUv;

          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233)))*43758.5453123);
          }

          float noise(vec2 st){
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0,0.0));
            float c = random(i + vec2(0.0,1.0));
            float d = random(i + vec2(1.0,1.0));
            vec2 u = f*f*(3.0-2.0*f);
            return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
          }

          float fbm(vec2 st) {
            float v = 0.0;
            float a = 0.5;
            for(int i=0;i<6;i++){
              v += a * noise(st);
              st *= 2.0;
              a *= 0.5;
            }
            return v;
          }

          void main() {
            vec2 st = (vUv-0.5)*3.0;
            st.x *= u_resolution.x/u_resolution.y;
            st += u_mouse*0.05;

            float dist = length(st);
            float angle = atan(st.y, st.x);
            float arms = 4.0; 
            angle += pow(dist,0.9)*arms + u_time*0.05;

            st = vec2(cos(angle), sin(angle))*dist;

            // Nebula layers
            float n = fbm(st*1.5 + vec2(0.0, u_time*0.05));
            float n2 = fbm(st*2.5 - vec2(u_time*0.1,0.0));
            float nebula = mix(n, n2, 0.5);

            // Galaxy core
            vec3 color = mix(vec3(1.0,0.95,0.85), vec3(0.2,0.05,0.3), dist*0.8);

            // Spiral arm colors
            color = mix(color, vec3(0.8,0.2,0.5), smoothstep(0.2,0.7,nebula));
            color = mix(color, vec3(0.1,0.0,0.2), smoothstep(0.4,0.9,fbm(st*3.0)));

            // Core glow
            float glow = 1.0 - smoothstep(0.0,0.5,dist);
            color += vec3(1.0,0.9,0.7)*glow*0.6;

            // Stars
            float star1 = pow(noise(vUv*800.0), 30.0) * (0.5 + 0.5*sin(u_time*2.0 + vUv.x*100.0));
            float star2 = pow(noise(vUv*1500.0), 50.0) * (0.5 + 0.5*cos(u_time*1.5 + vUv.y*120.0));
            float star3 = pow(noise(vUv*3000.0), 80.0) * (0.5 + 0.5*sin(u_time*3.0 + vUv.x*200.0));

            color += vec3(star1 + star2 + star3)*1.5;

            float alpha = smoothstep(0.2,0.8,nebula)*1.5;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  )
}