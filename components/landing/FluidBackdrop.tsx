"use client";

import { useEffect, useRef } from "react";

/**
 * Backdrop fluido WebGL — único motor visual del hero/landing
 * y del shell de productos.
 *
 * Quad fullscreen renderizado con shader de simplex noise (2 octavas
 * en frecuencias bajas) que mapea el ruido a la paleta Capa 1 de la
 * marca: sand dominante, stone neutro, terra cálido, sea contrapunto,
 * sage acento raro. Drift estacional ~130s que rota el balance
 * cálido/frío. Bloom warm sutil + vignette amplio.
 *
 * Respeta prefers-reduced-motion: render estático sin time tick.
 */

const SIMPLEX_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export function FluidBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf: number | null = null;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const geom = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uOpacity: { value: 0.55 },
          uReduced: { value: reducedMotion ? 1.0 : 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.999, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec2 uResolution;
          uniform float uOpacity;
          uniform float uReduced;
          varying vec2 vUv;

          ${SIMPLEX_GLSL}

          void main() {
            float aspect = uResolution.x / max(uResolution.y, 1.0);
            vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 1.35;
            float t = mix(uTime * 0.038, 0.5, uReduced);
            float n1 = snoise(vec3(p * 0.62, t));
            float n2 = snoise(vec3(p * 1.28 + vec2(34.7, 12.1), t * 1.18)) * 0.42;
            float n = (n1 + n2) / 1.42;

            vec3 sand  = vec3(0.957, 0.941, 0.910);
            vec3 stone = vec3(0.886, 0.867, 0.831);
            vec3 terra = vec3(0.722, 0.537, 0.416);
            vec3 sea   = vec3(0.478, 0.604, 0.667);
            vec3 sage  = vec3(0.561, 0.659, 0.573);

            float drift = sin(uTime * 0.048) * 0.12;
            float h = clamp(n * 0.5 + 0.5 + drift, 0.0, 1.0);

            vec3 col;
            if (h < 0.18)      col = mix(sea, stone, h / 0.18);
            else if (h < 0.42) col = mix(stone, sand, (h - 0.18) / 0.24);
            else if (h < 0.66) col = sand;
            else if (h < 0.88) col = mix(stone, terra, (h - 0.66) / 0.22);
            else               col = mix(terra, sage, (h - 0.88) / 0.12);

            float bright = clamp(h - 0.55, 0.0, 1.0);
            col += pow(bright, 4.0) * vec3(0.10, 0.06, 0.03);

            float d = length((vUv - 0.5) * vec2(aspect, 1.0));
            float vig = smoothstep(1.45, 0.18, d);
            col *= 0.72 + 0.4 * vig;

            col = mix(sand, col, uOpacity);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        depthTest: false,
        depthWrite: false,
        transparent: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.frustumCulled = false;
      scene.add(mesh);

      function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        mat.uniforms.uResolution.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
      }
      window.addEventListener("resize", resize);
      resize();

      if (reducedMotion) {
        renderer.render(scene, camera);
        cleanup = () => {
          window.removeEventListener("resize", resize);
          geom.dispose();
          mat.dispose();
          renderer.dispose();
        };
        return;
      }

      function tick(now: number) {
        mat.uniforms.uTime.value = now * 0.001;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        if (raf !== null) cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        geom.dispose();
        mat.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
