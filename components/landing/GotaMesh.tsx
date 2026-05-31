"use client";

import { useEffect, useRef } from "react";

/**
 * Gota Mesh 3D — el símbolo de marca como objeto físico iridiscente.
 *
 * Construye el path canónico de la gota (M80 12 C... — el mismo de
 * symbol-drop-ink.svg y DropOrnament) como THREE.Shape, lo extruye
 * con bevel y le aplica MeshPhysicalMaterial con iridescence +
 * clearcoat + transmission para conseguir el look de "cristal líquido
 * que respira".
 *
 * Iluminación de 3 puntos: ambiente cálido + key dirigida frontal +
 * rim terra trasero — los reflejos correspondientes a la paleta.
 *
 * Float vertical sutil + rotación suave por defecto. Mouse parallax
 * y scroll fade. prefers-reduced-motion: render estático sin tick.
 *
 * Vive en su propio canvas absoluto sobre el FluidBackdrop —
 * dos contextos WebGL, pero el coste es bajo (mesh único, no más
 * de 5k tris).
 */

type Props = {
  className?: string;
};

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
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      camera.position.set(0, 0, 8);

      // Path canónico (mismo de symbol-drop-ink.svg)
      // M80 12 C80 12 104 52 116 88 C126 118 122 152 102 168 ...
      const shape = new THREE.Shape();
      shape.moveTo(80, -12);
      shape.bezierCurveTo(80, -12, 104, -52, 116, -88);
      shape.bezierCurveTo(126, -118, 122, -152, 102, -168);
      shape.bezierCurveTo(92, -176, 80, -178, 80, -178);
      shape.bezierCurveTo(80, -178, 68, -176, 58, -168);
      shape.bezierCurveTo(38, -152, 34, -118, 44, -88);
      shape.bezierCurveTo(56, -52, 80, -12, 80, -12);

      const extrudeSettings = {
        depth: 18,
        bevelEnabled: true,
        bevelSegments: 8,
        bevelSize: 8,
        bevelThickness: 8,
        curveSegments: 64,
      };
      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      // Centrar geometría en (0,0,0)
      geom.center();
      geom.computeVertexNormals();

      // Escala: el path original es ~165 alto, lo llevamos a ~3.6 units
      const scale = 3.6 / 165;
      geom.scale(scale, scale, scale);

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xb8896a, // terra base, lighting hará el resto
        metalness: 0.05,
        roughness: 0.18,
        transmission: 0.35,
        thickness: 1.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
        iridescence: 0.75,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [120, 420],
        envMapIntensity: 0.6,
        attenuationColor: new THREE.Color(0xf4f0e8),
        attenuationDistance: 0.8,
      });

      const mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);

      // Iluminación 3 puntos brand
      const ambient = new THREE.AmbientLight(0xf4f0e8, 0.55); // sand suave
      scene.add(ambient);

      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(2.5, 3.5, 4);
      scene.add(key);

      const rim = new THREE.DirectionalLight(0xb8896a, 1.2);
      rim.position.set(-3, -1.5, -3);
      scene.add(rim);

      const sea = new THREE.DirectionalLight(0x7a9aaa, 0.6);
      sea.position.set(0, 4, -2);
      scene.add(sea);

      function resize() {
        const r = canvas!.getBoundingClientRect();
        renderer.setSize(r.width, r.height, false);
        camera.aspect = r.width / r.height;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", resize);
      resize();

      const pointer = { nx: 0, ny: 0, tx: 0, ty: 0 };
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

      if (reducedMotion) {
        renderer.render(scene, camera);
        cleanup = () => {
          window.removeEventListener("resize", resize);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("scroll", onScroll);
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
        const t = now * 0.001;

        // Float vertical sutil
        mesh.position.y = Math.sin(t * 0.6) * 0.08;

        // Rotación lenta + parallax cursor + tilt por scroll
        const hero = document.getElementById("hero");
        const heroH = hero ? hero.offsetHeight : window.innerHeight;
        const scrollT = Math.min(1, scrollY / heroH);

        // Easing del target hacia donde apunta cursor + tilt scroll
        const targetRotY = pointer.nx * 0.35 + t * 0.15;
        const targetRotX = pointer.ny * 0.2 + scrollT * 0.4;

        mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.05;
        mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.05;

        // Fade out al pasar del hero
        const op = Math.max(0, 1 - scrollT * 1.4);
        mat.opacity = op;
        mat.transparent = true;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        if (raf !== null) cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
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
