"use client";

import { useEffect, useRef } from "react";

import styles from "@/styles/landing.module.css";

/**
 * Motor WebGL del hero:
 * - Fondo iridiscente líquido (fullscreen shader fragment con simplex
 *   noise 3D + paleta iris + bloom + vignette).
 * - Encima: gota Three.js (~2000 partículas, spring hacia path, cursor
 *   repulsion, fade al scrollar).
 *
 * Todo en el mismo canvas → sin coste de capas CSS extra ni
 * mix-blend, y permite que la luz iridiscente del fondo "bañe" la
 * silueta oscura de la gota.
 *
 * Carga dinámica de three. Respeta prefers-reduced-motion (sin animación
 * de partículas y sin pulso de tiempo en el fondo).
 */

const GOTA_D =
  "M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z";
const FOCAL_X = 80;
const FOCAL_Y = 130;
const DENSITY = 2000;
const PARTICLE_PALETTE = { core: "#2C2C28", edge: "#B8896A" };

function samplePathPoints(count: number) {
  if (typeof document === "undefined") return [];
  const cv = document.createElement("canvas");
  cv.width = 160;
  cv.height = 200;
  const ctx = cv.getContext("2d");
  if (!ctx) return [];
  const path = new Path2D(GOTA_D);
  const points: Array<{ x: number; y: number; d: number }> = [];
  let tries = 0;
  while (points.length < count && tries < count * 40) {
    const x = Math.random() * 160;
    const y = Math.random() * 200;
    tries++;
    if (!ctx.isPointInPath(path, x, y)) continue;
    const dx = x - FOCAL_X;
    const dy = y - FOCAL_Y;
    points.push({ x, y, d: Math.sqrt(dx * dx + dy * dy) });
  }
  return points;
}

/** Simplex noise 3D (Ashima Arts, dominio público) compartido por el shader del bg. */
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

export function DropCanvas() {
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
        antialias: true,
        powerPreference: "high-performance",
      });
      // Capped at 1.5 — el bg quad llena la pantalla, cada píxel cuesta.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.autoClear = true;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2000);
      camera.position.set(0, 0, 380);

      function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        bgMat.uniforms.uResolution.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
      }

      /* =====================================================
         BG QUAD — iridescent liquid fullscreen shader
         ===================================================== */
      const bgGeom = new THREE.PlaneGeometry(2, 2);
      const bgMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uOpacity: { value: 0.62 },
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

            // Motion sobrio: ritmo editorial (~half de la versión iris).
            float t = mix(uTime * 0.038, 0.5, uReduced);

            // 2 octavas, frecuencias bajas → shapes amplias, calmas.
            float n1 = snoise(vec3(p * 0.62, t));
            float n2 = snoise(vec3(p * 1.28 + vec2(34.7, 12.1), t * 1.18)) * 0.42;
            float n = (n1 + n2) / 1.42;

            // PALETA DE MARCA — Capa 1 (mediterránea, baja saturación).
            // Tonos prestados de la piedra caliza, pinar y mar balear.
            vec3 sand  = vec3(0.957, 0.941, 0.910); // #F4F0E8 — base universal
            vec3 stone = vec3(0.886, 0.867, 0.831); // #E2DDD4 — neutro cálido
            vec3 terra = vec3(0.722, 0.537, 0.416); // #B8896A — acento cálido
            vec3 sea   = vec3(0.478, 0.604, 0.667); // #7A9AAA — contrapunto frío
            vec3 sage  = vec3(0.561, 0.659, 0.573); // #8FA892 — verde calmo

            // Drift estacional muy lento (~130s) — modula el balance cálido/frío.
            float drift = sin(uTime * 0.048) * 0.12;
            float h = clamp(n * 0.5 + 0.5 + drift, 0.0, 1.0);

            vec3 col;
            if (h < 0.18) {
              // Zonas frías profundas: sea → stone
              col = mix(sea, stone, h / 0.18);
            } else if (h < 0.42) {
              // Neutros calmos: stone → sand (transición ancha)
              col = mix(stone, sand, (h - 0.18) / 0.24);
            } else if (h < 0.66) {
              // Dominio sand (base universal — la mayor parte del tiempo aquí)
              col = sand;
            } else if (h < 0.88) {
              // Calidez: stone → terra (el acento de marca)
              col = mix(stone, terra, (h - 0.66) / 0.22);
            } else {
              // Acento orgánico raro: terra → sage
              col = mix(terra, sage, (h - 0.88) / 0.12);
            }

            // Bloom cálido muy sutil en picos luminosos (tono terra).
            float bright = clamp(h - 0.55, 0.0, 1.0);
            col += pow(bright, 4.0) * vec3(0.10, 0.06, 0.03);

            // Vignette amplio — el centro respira, las esquinas se asientan.
            float d = length((vUv - 0.5) * vec2(aspect, 1.0));
            float vig = smoothstep(1.45, 0.18, d);
            col *= 0.72 + 0.4 * vig;

            // Mezcla final con sand → controla la intensidad global.
            col = mix(sand, col, uOpacity);

            gl_FragColor = vec4(col, 1.0);
          }
        `,
        depthTest: false,
        depthWrite: false,
        transparent: false,
      });
      const bgMesh = new THREE.Mesh(bgGeom, bgMat);
      bgMesh.frustumCulled = false;
      bgMesh.renderOrder = -10;
      scene.add(bgMesh);

      window.addEventListener("resize", resize);
      resize();

      /* =====================================================
         PARTICLE GOTA (encima del bg)
         ===================================================== */
      const drop = samplePathPoints(DENSITY);
      while (drop.length < DENSITY)
        drop.push(drop[drop.length % Math.max(1, drop.length)] || { x: 80, y: 130, d: 0 });

      const count = DENSITY;
      const basePositions = new Float32Array(count * 3);
      const targetPositions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const dropDist = new Float32Array(count);

      const palCore = new THREE.Color(PARTICLE_PALETTE.core);
      const palEdge = new THREE.Color(PARTICLE_PALETTE.edge);

      for (let i = 0; i < count; i++) {
        const a = drop[i];
        const x = (a.x - FOCAL_X) * 1.0;
        const y = -(a.y - FOCAL_Y) * 1.0;
        const z = (Math.random() - 0.5) * 16;
        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;
        targetPositions[i * 3] = x;
        targetPositions[i * 3 + 1] = y;
        targetPositions[i * 3 + 2] = z;
        dropDist[i] = a.d;

        const t = Math.min(1, a.d / 38);
        const c = palCore.clone().lerp(palEdge, t);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        const base = 2.2 + (1 - t) * 1.6;
        sizes[i] = base * (0.8 + Math.random() * 0.4);
      }

      const geom = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(basePositions, 3);
      const colAttr = new THREE.BufferAttribute(colors, 3);
      const sizeAttr = new THREE.BufferAttribute(sizes, 1);
      geom.setAttribute("position", posAttr);
      geom.setAttribute("color", colAttr);
      geom.setAttribute("aSize", sizeAttr);

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uPxRatio: { value: renderer.getPixelRatio() },
          uOpacity: { value: 1.0 },
        },
        vertexShader: `
          attribute float aSize;
          uniform float uPxRatio;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uPxRatio * (260.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          uniform float uOpacity;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float d = length(c);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.18, d);
            gl_FragColor = vec4(vColor, a * uOpacity);
          }
        `,
        vertexColors: true,
      });

      const points = new THREE.Points(geom, mat);
      points.scale.set(0.42, 0.42, 0.42);
      points.position.y = 30;
      points.renderOrder = 0;
      scene.add(points);

      /* =====================================================
         INTERACTION — pointer + scroll
         ===================================================== */
      const pointer = { x: 9999, y: 9999, active: false, worldX: 9999, worldY: 9999 };
      let scrollY = window.scrollY;
      let scrollProgress = 0;

      function onPointerMove(e: PointerEvent) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.active = true;
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -(e.clientY / window.innerHeight) * 2 + 1;
        const vec = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
        const dir = vec.sub(camera.position).normalize();
        const dist = -camera.position.z / dir.z;
        const worldPos = camera.position.clone().add(dir.multiplyScalar(dist));
        pointer.worldX = worldPos.x;
        pointer.worldY = worldPos.y;
      }
      function onPointerLeave() {
        pointer.active = false;
        pointer.x = 9999;
      }
      function onScroll() {
        scrollY = window.scrollY;
        const hero = document.getElementById("hero");
        const heroH = hero ? hero.offsetHeight : window.innerHeight;
        scrollProgress = Math.min(1, scrollY / (heroH * 0.8));
        canvas!.classList.toggle(styles.faded, scrollProgress > 0.6);
      }
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("scroll", onScroll, { passive: true });

      if (reducedMotion) {
        renderer.render(scene, camera);
        cleanup = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerleave", onPointerLeave);
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", resize);
          bgGeom.dispose();
          bgMat.dispose();
          geom.dispose();
          mat.dispose();
          renderer.dispose();
        };
        return;
      }

      let lastT = performance.now();

      function tick(now: number) {
        const dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;

        // BG fluid uniform tick
        bgMat.uniforms.uTime.value = now * 0.001;

        const time = now * 0.001;
        const pos = posAttr.array as Float32Array;
        const tgt = targetPositions;

        points.rotation.y += 0.6 * 0.15 * dt;

        const hero = document.getElementById("hero");
        const heroH = hero ? hero.offsetHeight : window.innerHeight;
        if (scrollY < heroH && pointer.active) {
          const nx = (pointer.x / window.innerWidth) * 2 - 1;
          const ny = (pointer.y / window.innerHeight) * 2 - 1;
          points.rotation.y += (nx * 0.18 - points.rotation.y) * 0.05;
          points.rotation.x += (ny * 0.1 - points.rotation.x) * 0.05;
        } else {
          points.rotation.x += (0 - points.rotation.x) * 0.04;
        }

        const force = 0.5;
        const depthScale = 2;
        const FORCE_RADIUS = 60;
        const FORCE_RADIUS_SQ = FORCE_RADIUS * FORCE_RADIUS;

        const sx = points.scale.x || 1;
        const sy = points.scale.y || 1;
        const localPx = (pointer.worldX - points.position.x) / sx;
        const localPy = (pointer.worldY - points.position.y) / sy;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const tx = tgt[i3];
          const ty = tgt[i3 + 1];
          const tz = tgt[i3 + 2];

          const phase = i * 0.013;
          const breath = Math.sin(time * 0.9 + phase) * 0.6;

          let fx = 0;
          let fy = 0;
          if (scrollY < heroH && pointer.active && force > 0) {
            const dx = pos[i3] - localPx;
            const dy = pos[i3 + 1] - localPy;
            const dd = dx * dx + dy * dy;
            if (dd < FORCE_RADIUS_SQ) {
              const dist = Math.sqrt(dd) + 0.01;
              const f = 1 - dist / FORCE_RADIUS;
              const f2 = f * f * force * 18;
              fx = (dx / dist) * f2;
              fy = (dy / dist) * f2;
            }
          }

          const k = 0.06;
          const damp = 0.82;
          velocities[i3] = (velocities[i3] + (tx - pos[i3]) * k + fx * 0.18) * damp;
          velocities[i3 + 1] = (velocities[i3 + 1] + (ty - pos[i3 + 1]) * k + fy * 0.18) * damp;
          velocities[i3 + 2] = (velocities[i3 + 2] + (tz + breath * depthScale - pos[i3 + 2]) * k) * damp;

          pos[i3] += velocities[i3];
          pos[i3 + 1] += velocities[i3 + 1];
          pos[i3 + 2] += velocities[i3 + 2];
        }
        posAttr.needsUpdate = true;
        mat.uniforms.uOpacity.value = Math.max(0.18, 1.0 - scrollProgress * 0.65);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        if (raf !== null) cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", resize);
        bgGeom.dispose();
        bgMat.dispose();
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

  return <canvas ref={canvasRef} id="drop-canvas" aria-hidden="true" className={styles.dropCanvas} />;
}
