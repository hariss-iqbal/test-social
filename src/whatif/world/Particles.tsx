import { useMemo } from "react";
import * as THREE from "three";
import type { ParamValues } from "./params";
import { mulberry32 } from "./rng";
import { radialTexture } from "./Sky";

/** Falling ice crystals in a box that follows the camera (so density is constant wherever we look). */
export const Snow: React.FC<{ p: ParamValues; seed: number; simT: number; center: [number, number, number] }> = ({ p, seed, simT, center }) => {
  const base = useMemo(() => {
    const r = mulberry32(seed + 99);
    const n = 5000;
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) a.set([r(), r(), r(), 0.4 + r() * 0.8], i * 4);
    return a;
  }, [seed]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(5000 * 3), 3));
    return g;
  }, []);
  if (p.snow < 0.01) return null;
  const S = 60, H = 40;
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const n = Math.floor(5000 * Math.min(1, p.snow));
  for (let i = 0; i < 5000; i++) {
    if (i >= n) { pos.setXYZ(i, 0, -9999, 0); continue; }
    const [u, v, w, sp] = [base[i * 4], base[i * 4 + 1], base[i * 4 + 2], base[i * 4 + 3]];
    const fall = (v * H - simT * sp * 1.2) % H;
    const y = ((fall + H) % H);
    const sway = Math.sin(simT * 0.7 + u * 40) * 0.6;
    pos.setXYZ(i, center[0] + (u - 0.5) * S + sway, center[1] - 8 + y, center[2] + (w - 0.5) * S);
  }
  pos.needsUpdate = true;
  return (
    <points geometry={geom} frustumCulled={false}>
      <pointsMaterial map={radialTexture()} size={0.16 + 0.22 * p.snow} color="#eef4ff" transparent opacity={0.9} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  );
};

/** Frost glints on the ground around the camera: tiny points that twinkle frame to frame. */
export const IceGlints: React.FC<{ p: ParamValues; seed: number; frame: number; center: [number, number, number] }> = ({ p, seed, frame, center }) => {
  const base = useMemo(() => {
    const r = mulberry32(seed + 501);
    const n = 6000;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const d = 2 + r() ** 1.6 * 70, th = r() * Math.PI * 2; a.set([Math.cos(th) * d, Math.sin(th) * d, r()], i * 3); }
    return a;
  }, [seed]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6000 * 3), 3));
    return g;
  }, []);
  if (p.frost < 0.3 || center[1] > 40) return null;
  const pos = geom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < 6000; i++) {
    const on = ((base[i * 3 + 2] * 997 + frame * 0.37) % 1) < 0.35;
    pos.setXYZ(i, center[0] + base[i * 3], on ? 0.06 : -50, center[2] + base[i * 3 + 1] - 20);
  }
  pos.needsUpdate = true;
  return (
    <points geometry={geom} frustumCulled={false}>
      <pointsMaterial map={radialTexture()} size={0.09} color="#f2f8ff" transparent opacity={Math.min(1, (p.frost - 0.3) * 2)} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  );
};
