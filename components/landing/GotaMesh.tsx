"use client";

import { useEffect, useRef } from "react";

/**
 * Gota Mesh 3D — el símbolo de marca como objeto físico corporativo.
 *
 * v2 (corporate refinement):
 * - LatheGeometry: revolución del perfil derecho del path canónico
 *   alrededor del eje Y → teardrop 3D real (no un slab extruido).
 *   72 puntos de perfil × 96 segments radiales = ~6.9K tris suaves.
 * - PMREM con RoomEnvironment (built-in three) como envMap →
 *   IBL realista, reflejos coherentes sin HDR externo.
 * - MeshPhysicalMaterial calibrado para sobriedad mediterránea:
 *     · color base ink (#2C2C28)
 *     · iridescence 0.22 (hint, no rainbow)
 *     · clearcoat 0.7 satin
 *     · roughness 0.32 mate sedoso, sin mirror
 *     · NO transmission (sólido, no cristal)
 * - Iluminación de 4 puntos brand: ambient sand + key blanca +
 *   fill sea + rim terra. ACES filmic toneMapping.
 * - Motion contenida: sin rotación base, solo float vertical lento
 *   y parallax suave por cursor. Tilt al scrollar.
 *
 * prefers-reduced-motion: render estático sin tick.
 */

type Props = {
  className?: string;
};

const GOTA_TOP_Y_SVG = 12;
const GOTA_BOTTOM_Y_SVG = 178;
const GOTA_CENTER_X = 80;
const GOTA_CENTER_Y = (GOTA_TOP_Y_SVG + GOTA_BOTTOM_Y_SVG) / 2; // 95
const GOTA_HEIGHT = GOTA_BOTTOM_Y_SVG - GOTA_TOP_Y_SVG; // 166

// Perfil derecho del path canónico (3 bezier curves sucesivos en SVG y-down)
// Cada bezier: P0, CP1, CP2, P3
const RIGHT_PROFILE_BEZIERS: Array<[number, number, number, number, number, number, number, number]> = [
  [80, 12,  80, 12,  104, 52, 116, 88],   // top → widest area
  [116, 88, 126, 118, 122, 152, 102, 168], // widest → lower bulge
  [102, 168, 92, 176, 80, 178, 80, 178],  // lower bulge → bottom apex
];

function sampleBezier(
  p0x: number, p0y: number,
  c1x: number, c1y: number,
  c2x: number, c2y: number,
  p3x: number, p3y: number,
  steps: number,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * p0x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p3x;
    const y = u * u * u * p0y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p3y;
    out.push([x, y]);
  }
  return out;
}

function buildLatheProfile(THREE: typeof import("three")) {
  const profile: InstanceType<typeof THREE.Vector2>[] = [];
  // Empezamos en el apex superior (radius 0)
  profile.push(new THREE.Vector2(0, (GOTA_HEIGHT / 2) / 100));
  // Sampleamos cada bezier y convertimos a (radius, height_y_up) escalado /100
  for (const b of RIGHT_PROFILE_BEZIERS) {
    const pts = sampleBezier(...b, 24);
    for (const [sx, sy] of pts) {
      const radius = (sx - GOTA_CENTER_X) / 100;
      const yUp = (GOTA_CENTER_Y - sy) / 100;
      profile.push(new THREE.Vector2(Math.max(0, radius), yUp));
    }
  }
  return profile;
}

export function GotaMesh({ className }: Props) {
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
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // mesh isolado, podemos subir
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;

      // ===== PMREM RoomEnvironment para reflejos IBL realistas =====
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
      roomEnv.dispose();

      const scene = new THREE.Scene();
      scene.environment = envTex;

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0, 6.5);

      // ===== Geometría: lathe del perfil derecho del path canónico =====
      const profile = buildLatheProfile(THREE);
      const geom = new THREE.LatheGeometry(profile, 96);
      geom.computeVertexNormals();

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x2c2c28, // ink — base sobria
        metalness: 0.18,
        roughness: 0.32,
        clearcoat: 0.7,
        clearcoatRoughness: 0.18,
        iridescence: 0.22, // hint, no rainbow
        iridescenceIOR: 1.4,
        iridescenceThicknessRange: [200, 800],
        envMapIntensity: 0.85,
        // sin transmission: gota sólida, no cristal
      });

      const mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);

      // ===== Iluminación 4 puntos brand =====
      // Ambient cálido (sand) — base homogénea
      const ambient = new THREE.AmbientLight(0xf4f0e8, 0.35);
      scene.add(ambient);

      // Key blanca frontal — define el volumen principal
      const key = new THREE.DirectionalLight(0xffffff, 1.8);
      key.position.set(3, 4, 5);
      scene.add(key);

      // Fill sea (frío) — separa la sombra del fondo
      const fill = new THREE.DirectionalLight(0x7a9aaa, 0.55);
      fill.position.set(-3, 0, 2);
      scene.add(fill);

      // Rim terra (cálido) — perfila el contorno por detrás
      const rim = new THREE.DirectionalLight(0xb8896a, 1.1);
      rim.position.set(-2, 3, -4);
      scene.add(rim);

      function resize() {
        const r = canvas!.getBoundingClientRect();
        renderer.setSize(r.width, r.height, false);
        camera.aspect = r.width / r.height;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", resize);
      resize();

      const pointer = { nx: 0, ny: 0 };
      function onMove(e: PointerEvent) {
        pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ny = -((e.clientY / window.innerHeight) * 2 - 1);
      }
      window.addEventListener("pointermove", onMove);

      let scrollY = window.scrollY;
      function onScroll() {
        scrollY = window.scrollY;
      }
      window.addEventListener("scroll", onScroll, { passive: true });

      // Rotación inicial sutil para que se vea con perfil ligeramente girado
      mesh.rotation.y = -0.25;
      mesh.rotation.x = 0.05;

      if (reducedMotion) {
        renderer.render(scene, camera);
        cleanup = () => {
          window.removeEventListener("resize", resize);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("scroll", onScroll);
          pmrem.dispose();
          envTex.dispose();
          geom.dispose();
          mat.dispose();
          renderer.dispose();
        };
        return;
      }

      function tick(now: number) {
        const t = now * 0.001;

        // Float vertical muy sutil (corporate restraint)
        mesh.position.y = Math.sin(t * 0.32) * 0.04;

        const hero = document.getElementById("hero");
        const heroH = hero ? hero.offsetHeight : window.innerHeight;
        const scrollT = Math.min(1, scrollY / heroH);

        // Sin rotación base. Parallax discreto por cursor + tilt sutil por scroll.
        const targetRotY = -0.25 + pointer.nx * 0.18;
        const targetRotX = 0.05 + pointer.ny * 0.1 + scrollT * 0.25;

        mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.04;
        mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.04;

        // Fade-out al pasar del hero (~80% del scroll del hero)
        const op = Math.max(0, 1 - scrollT * 1.25);
        mat.opacity = op;
        mat.transparent = op < 0.999;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        if (raf !== null) cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
        pmrem.dispose();
        envTex.dispose();
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

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
