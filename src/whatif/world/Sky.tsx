import { useMemo } from "react";
import * as THREE from "three";
import type { ParamValues } from "./params";
import { mulberry32 } from "./rng";

export const SUN_DIR = new THREE.Vector3(0.62, 0.68, -0.39).normalize();
export const MOON_DIR = new THREE.Vector3(-0.35, 0.66, -0.66).normalize();
export const PLANETS: [string, THREE.Vector3, number, string][] = [
  ["venus", new THREE.Vector3(0.5, 0.7, -0.5).normalize(), 80, "#fff8e8"],
  ["jupiter", new THREE.Vector3(0.08, 0.74, -0.67).normalize(), 62, "#fff1d6"],
  ["saturn", new THREE.Vector3(0.28, 0.6, -0.75).normalize(), 46, "#ffe7b8"],
];

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = /* glsl */ `
uniform float day; uniform float sunset; uniform float sunVis; uniform vec3 sunDir; uniform float exposure; uniform float uv; uniform float airglow; uniform float dust;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, -0.2, 1.0);
  vec3 zenithDay = vec3(0.16, 0.42, 0.86);
  vec3 horizonDay = vec3(0.70, 0.84, 0.96);
  vec3 zenithSet = vec3(0.18, 0.22, 0.45);
  vec3 horizonSet = vec3(1.0, 0.55, 0.30);
  vec3 zenithNight = vec3(0.004, 0.006, 0.016);
  vec3 horizonNight = vec3(0.012, 0.016, 0.035);
  vec3 zen = mix(mix(zenithNight, zenithDay, day), zenithSet, sunset * day);
  vec3 hor = mix(mix(horizonNight, horizonDay, day), horizonSet, sunset * day);
  vec3 col = mix(hor, zen, pow(max(h, 0.0), 0.55));
  float d = max(dot(normalize(vDir), sunDir), 0.0);
  col += vec3(1.0, 0.92, 0.75) * pow(d, 64.0) * 0.6 * sunVis * day;   // halo
  col += vec3(1.0, 0.95, 0.85) * pow(d, 8.0) * 0.12 * sunVis * day;   // wide glow
  col = mix(col, vec3(0.70, 0.55, 1.0) * (0.75 + 0.35 * h), uv * 0.7 * day);
  // diffuse glow: green low in the sky fading to dim red overhead
  col += mix(vec3(0.10, 0.42, 0.22), vec3(0.28, 0.08, 0.10), smoothstep(0.1, 0.9, h)) * airglow * (1.0 - day) * (0.6 + 0.4 * (1.0 - h));
  col = mix(col, vec3(0.42, 0.36, 0.28) * (0.35 + 0.65 * day), dust * 0.85);
  gl_FragColor = vec4(col * exposure, 1.0);
}`;

const AURORA_VERT = /* glsl */ `
uniform float time; varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.z += sin(p.x * 0.004 + time * 0.35) * 160.0 + sin(p.x * 0.011 - time * 0.6) * 50.0;
  p.y += sin(p.x * 0.006 + time * 0.25) * 40.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const AURORA_FRAG = /* glsl */ `
uniform float time; uniform float strength; varying vec2 vUv;
float h(float x){ return fract(sin(x * 91.7) * 43758.5); }
float n(float x){ float i = floor(x), f = fract(x); return mix(h(i), h(i + 1.0), f * f * (3.0 - 2.0 * f)); }
void main() {
  float rays = n(vUv.x * 160.0 + time * 0.8) * 0.6 + n(vUv.x * 37.0 - time * 0.3) * 0.6;
  float base = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.15, 1.0, vUv.y));
  vec3 green = vec3(0.25, 1.0, 0.55), violet = vec3(0.65, 0.3, 1.0);
  vec3 col = mix(green, violet, smoothstep(0.35, 0.95, vUv.y));
  float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
  gl_FragColor = vec4(col, base * rays * edge * strength * 0.85);
}`;

/** Aurora curtains far to the north (-z), above the skyline. */
const Aurora: React.FC<{ strength: number; simT: number }> = ({ strength, simT }) => {
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.ShaderMaterial({
    vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, fog: false, toneMapped: false, uniforms: { time: { value: 0 }, strength: { value: 0 } },
  })), []);
  mats.forEach((m, i) => { m.uniforms.time.value = simT + i * 7; m.uniforms.strength.value = strength * (1 - i * 0.22); });
  return (
    <group>
      {mats.map((m, i) => (
        <mesh key={i} material={m} position={[-300 + i * 420, 1350 + i * 160, -2300 - i * 250]} rotation={[0, (i - 1) * 0.35, 0]} renderOrder={-5}>
          <planeGeometry args={[2600, 1500, 160, 1]} />
        </mesh>
      ))}
    </group>
  );
};

export const Sky: React.FC<{ p: ParamValues; seed: number; simT?: number }> = ({ p, seed, simT = 0 }) => {
  const skyMat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { day: { value: 1 }, sunset: { value: 0 }, sunVis: { value: 1 }, sunDir: { value: SUN_DIR }, exposure: { value: 1 }, uv: { value: 0 }, airglow: { value: 0 }, dust: { value: 0 } },
    }),
    [],
  );
  skyMat.uniforms.day.value = p.day;
  skyMat.uniforms.sunset.value = p.sunset;
  skyMat.uniforms.sunVis.value = p.sky_sun;
  skyMat.uniforms.exposure.value = p.exposure * (1 - 0.75 * p.sky_dim);
  skyMat.uniforms.uv.value = p.uv;
  skyMat.uniforms.airglow.value = p.airglow;
  skyMat.uniforms.dust.value = p.dust;

  const stars = useMemo(() => {
    const r = mulberry32(seed + 7);
    const n = 14000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const band = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05, 0.4, 0.35));
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      if (i % 20 < 9) {
        // Milky Way: gaussian-ish spread around the band plane
        const th = r() * Math.PI * 2, off = (r() + r() + r() - 1.5) * 0.16;
        v.set(Math.cos(th), off, Math.sin(th)).normalize().applyQuaternion(band);
        if (v.y < -0.05) v.y = -v.y;
        pos.set([v.x * 3500, v.y * 3500 - 150, v.z * 3500], i * 3);
        const b = 0.25 + r() ** 4 * 0.6;
        col.set([b * 0.95, b * 0.93, b], i * 3);
        continue;
      }
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos.set([s * Math.cos(th) * 3500, Math.abs(u) * 3500 - 150, s * Math.sin(th) * 3500], i * 3);
      const b = 0.35 + r() ** 3 * 0.65;
      const tint = r();
      col.set([b * (tint > 0.8 ? 1 : 0.85), b * 0.9, b * (tint < 0.2 ? 0.7 : 1)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [seed]);

  const glowTex = useMemo(() => radialTexture(), []);
  const cloudTex = useMemo(() => cloudTexture(seed), [seed]);
  const clouds = useMemo(() => {
    const r = mulberry32(seed + 31);
    return Array.from({ length: 34 }, () => ({ x: (r() - 0.5) * 5000, y: 520 + r() * 420, z: -300 - r() * 2600, s: 380 + r() * 520, o: 0.65 + r() * 0.35 }));
  }, [seed]);
  const starVis = p.stars * (1 - p.day * 0.97);
  const sunPos = SUN_DIR.clone().multiplyScalar(3000);
  const moonPos = MOON_DIR.clone().multiplyScalar(3000);
  const moonLit = 0.06 + 0.94 * p.moon;

  return (
    <group>
      <mesh material={skyMat} renderOrder={-10}>
        <sphereGeometry args={[4000, 48, 24]} />
      </mesh>
      {starVis > 0.001 && (
        <points geometry={stars} renderOrder={-9}>
          <pointsMaterial size={3.2} toneMapped={false} sizeAttenuation={false} vertexColors transparent opacity={starVis} depthWrite={false} fog={false} />
        </points>
      )}
      {p.sky_sun > 0.001 && (
        <group position={sunPos}>
          <sprite scale={[900 * p.sky_sun, 900 * p.sky_sun, 1]} renderOrder={-8}>
            <spriteMaterial map={glowTex} color="#fff3d6" transparent opacity={0.85 * p.sky_sun} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
          </sprite>
          <mesh renderOrder={-7}>
            <sphereGeometry args={[55 * Math.max(p.sky_sun, 0.02), 24, 16]} />
            <meshBasicMaterial color="#fffaf0" transparent opacity={p.sky_sun} fog={false} toneMapped={false} />
          </mesh>
        </group>
      )}
      {/* quarter Moon (the phase that is up at noon): lit half from a texture, dark half barely visible */}
      <sprite position={moonPos} scale={[170, 170, 1]} renderOrder={-7}>
        <spriteMaterial map={moonTexture()} color={new THREE.Color(moonLit, moonLit, moonLit)} transparent opacity={Math.max(0.35, 1 - p.day * 0.5)} depthWrite={false} fog={false} toneMapped={false} />
      </sprite>
      {p.moon > 0.02 && p.day < 0.5 && (
        <sprite position={moonPos} scale={[320, 320, 1]} renderOrder={-8}>
          <spriteMaterial map={glowTex} color="#cfdcff" transparent opacity={0.25 * p.moon * (1 - p.day * 2)} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
        </sprite>
      )}
      {p.clouds > 0.01 && p.day > 0.02 && p.dust < 0.3 && clouds.map((c, i) => {
        if (i / clouds.length > p.clouds) return null;
        const x = ((c.x + simT * 9 + 2500) % 5000 + 5000) % 5000 - 2500;
        // keep the Sun's disc clear (it is the subject of the "look up" shot)
        const dir = new THREE.Vector3(x, c.y, c.z).normalize();
        if (dir.dot(SUN_DIR) > 0.93) return null;
        return (
          <sprite key={`c${i}`} position={[x, c.y, c.z]} scale={[c.s * 1.8, c.s * 0.75, 1]} renderOrder={-6}>
            <spriteMaterial map={cloudTex} color={new THREE.Color(1, 1, 1).lerp(new THREE.Color(1, 0.75, 0.6), p.sunset)} transparent opacity={c.o * p.day} depthWrite={false} fog={false} />
          </sprite>
        );
      })}
      {p.aurora > 0.01 && p.day < 0.3 && <Aurora strength={p.aurora * (1 - p.day / 0.3)} simT={simT} />}
      {p.labels > 0.01 && PLANETS.map(([k, dir]) => p[k] > 0.001 && (
        <sprite key={`l${k}`} position={dir.clone().multiplyScalar(3000).add(new THREE.Vector3(320, -40, 0))} scale={[540, 135, 1]} renderOrder={-5}>
          <spriteMaterial map={labelTexture(k)} transparent opacity={p.labels * Math.min(1, p[k] * 1.5)} depthWrite={false} fog={false} toneMapped={false} />
        </sprite>
      ))}
      {PLANETS.map(([k, dir, size, color]) => p[k] > 0.001 && (
        <sprite key={k} position={dir.clone().multiplyScalar(3000)} scale={[size, size, 1]} renderOrder={-6}>
          <spriteMaterial map={glowTex} color={color} transparent opacity={p[k] * (1 - p.day * 0.8)} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
};

function cloudTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d")!;
  const r = mulberry32(seed + 77);
  for (let i = 0; i < 40; i++) {
    const x = 90 + r() * 330, y = 120 + (r() - 0.5) * 60 - Math.sin(((x - 90) / 330) * Math.PI) * 40, rad = 30 + r() * 55;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, "rgba(255,255,255,0.9)");
    grd.addColorStop(0.6, "rgba(250,252,255,0.55)");
    grd.addColorStop(1, "rgba(240,245,255,0)");
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  // flat grey-blue base like cumulus bottoms
  const base = g.createLinearGradient(0, 120, 0, 200);
  base.addColorStop(0, "rgba(0,0,0,0)");
  base.addColorStop(1, "rgba(150,165,190,0.35)");
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const _labels = new Map<string, THREE.Texture>();
function labelTexture(text: string) {
  let t = _labels.get(text);
  if (t) return t;
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d")!;
  g.font = "600 56px Inter, Helvetica, Arial, sans-serif";
  g.fillStyle = "rgba(240,236,228,0.95)";
  g.textBaseline = "middle";
  g.fillText(text.toUpperCase().split("").join(String.fromCharCode(8202)), 8, 64);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _labels.set(text, t);
  return t;
}

let _moon: THREE.Texture | null = null;
function moonTexture() {
  if (_moon) return _moon;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = mulberry32(42);
  g.save();
  g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.clip();
  g.fillStyle = "rgba(40,44,56,0.35)"; g.fillRect(0, 0, 256, 256);            // earthshine side
  g.beginPath(); g.arc(128, 128, 110, -Math.PI / 2, Math.PI / 2); g.closePath();
  g.fillStyle = "#f2f0ea"; g.fill();                                          // lit right half
  for (let i = 0; i < 26; i++) {                                              // maria / craters
    const x = 128 + r() * 100, y = 30 + r() * 196, rad = 4 + r() ** 2 * 22;
    g.fillStyle = `rgba(150,150,160,${0.25 + r() * 0.3})`;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  _moon = new THREE.CanvasTexture(c);
  _moon.colorSpace = THREE.SRGBColorSpace;
  return _moon;
}

let _radial: THREE.Texture | null = null;
export function radialTexture() {
  if (_radial) return _radial;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.12, "rgba(255,255,255,0.85)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.25)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  _radial = new THREE.CanvasTexture(c);
  return _radial;
}
