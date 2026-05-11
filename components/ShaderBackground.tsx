"use client";

import { useEffect, useRef } from "react";
import styles from "@/styles/intranet-shader.module.css";

/* ── GLSL shaders ──────────────────────────────────────────────────────── */

const VERT_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

/** Bruma — FBM noise, warm blobs */
const BRUMA_FRAG = `
  precision mediump float;
  uniform float u_time;
  uniform vec2  u_resolution;

  float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u  = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    return mix(
      mix(rand(ip),              rand(ip + vec2(1.0, 0.0)), u.x),
      mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
      u.y
    ) * 2.0 - 1.0;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    float f = 1.0;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p * f);
      a *= 0.5;
      f *= 2.0;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.x *= u_resolution.x / u_resolution.y;
    float t = u_time * 0.035;
    float n = fbm(uv * 2.2 + vec2(t, t * 0.72));
    n = n * 0.5 + 0.5;
    float alpha = n * 0.048;
    gl_FragColor = vec4(0.98, 0.96, 0.93, alpha);
  }
`;

/** Flujo — sin waves with domain warping, cool tones */
const FLUJO_FRAG = `
  precision mediump float;
  uniform float u_time;
  uniform vec2  u_resolution;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.x *= u_resolution.x / u_resolution.y;
    float t = u_time * 0.055;

    vec2 q = vec2(
      sin(uv.y * 3.2 + t) * 0.18,
      cos(uv.x * 2.6 + t * 0.82) * 0.18
    );
    vec2 w = uv + q;

    float wave =
      sin(w.x * 5.5 + t) * 0.5 +
      sin(w.y * 3.8 - t * 0.74) * 0.5;
    wave = wave * 0.5 + 0.5;

    float alpha = wave * 0.04;
    gl_FragColor = vec4(0.91, 0.94, 0.97, alpha);
  }
`;

/* ── WebGL helpers ─────────────────────────────────────────────────────── */

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, fragSrc: string): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return prog;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef<number>(Date.now());

  function destroy() {
    cancelAnimationFrame(rafRef.current);
  }

  function run(mode: "bruma" | "flujo") {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return; // silent fallback

    const fragSrc = mode === "bruma" ? BRUMA_FRAG : FLUJO_FRAG;
    const prog = createProgram(gl, fragSrc);
    if (!prog) return;

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const posLoc  = gl.getAttribLocation(prog, "a_position");
    const timeLoc = gl.getUniformLocation(prog, "u_time");
    const resLoc  = gl.getUniformLocation(prog, "u_resolution");

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function resize() {
      if (!canvas || !gl) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener("resize", resize);

    function frame() {
      if (!gl || !canvas) return;
      const t = (Date.now() - startRef.current) / 1000;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLoc, t);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(frame);
    }

    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(frame);

    // Return cleanup including resize listener
    return () => window.removeEventListener("resize", resize);
  }

  useEffect(() => {
    let cleanupResize: (() => void) | undefined;

    function setup(mode: string) {
      destroy();
      cleanupResize?.();
      if (mode !== "none") {
        cleanupResize = run(mode as "bruma" | "flujo") ?? undefined;
      }
    }

    const stored = (typeof window !== "undefined"
      ? localStorage.getItem("roqueta-wallpaper")
      : null) ?? "none";

    setup(stored);

    function onWallpaperChange(e: Event) {
      setup((e as CustomEvent<string>).detail);
    }

    window.addEventListener("wallpaper-change", onWallpaperChange);

    return () => {
      destroy();
      cleanupResize?.();
      window.removeEventListener("wallpaper-change", onWallpaperChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-hidden="true"
    />
  );
}
