"use client";

import { useEffect, useRef } from "react";

import styles from "@/styles/landing.module.css";

/**
 * Motor de partículas Three.js — la "gota" del hero.
 * Genera ~2000 puntos muestreados desde el path SVG canónico, los
 * arregla con un spring hacia el target, los desplaza por proximidad
 * al cursor en el hero y atenúa la opacidad al hacer scroll.
 * Three.js se carga dinámicamente para no inflar el First Load JS.
 * Respeta prefers-reduced-motion (render estático, sin animación).
 */

const GOTA_D =
  "M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 C92 176 80 178 80 178 C80 178 68 176 58 168 C38 152 34 118 44 88 C56 52 80 12 80 12 Z";
const FOCAL_X = 80;
const FOCAL_Y = 130;
const DENSITY = 2000;
const PALETTE = { core: "#2C2C28", edge: "#B8896A" };

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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2000);
      camera.position.set(0, 0, 380);

      function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", resize);
      resize();

      const drop = samplePathPoints(DENSITY);
      while (drop.length < DENSITY) drop.push(drop[drop.length % Math.max(1, drop.length)] || { x: 80, y: 130, d: 0 });

      const count = DENSITY;
      const basePositions = new Float32Array(count * 3);
      const targetPositions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const dropDist = new Float32Array(count);

      const palCore = new THREE.Color(PALETTE.core);
      const palEdge = new THREE.Color(PALETTE.edge);

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
      scene.add(points);

      // Pointer state
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
          geom.dispose();
          mat.dispose();
          renderer.dispose();
        };
        return;
      }

      // Animation loop
      let lastT = performance.now();

      function tick(now: number) {
        const dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;

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
