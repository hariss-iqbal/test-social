import { useMemo } from "react";
import * as THREE from "three";
import type { ParamValues } from "./params";
import { mulberry32 } from "./rng";
import { radialTexture } from "./Sky";
import { Shields } from "./Shields";

/**
 * Cosmic layer: the solar system at diagram scale (readable on a phone, not to scale).
 * Sun at the origin (radius 6). Inner planets sit at true relative distance (Earth = 60 = 1 AU),
 * outer planets are compressed. The "light shell" (param shell_r, same units) is the last sunlight
 * racing outward after the Sun vanishes: a planet stays lit until the shell passes it.
 */
export const ORBIT_R = 60;
export const EARTH_R = 1.6;
export const SUN_R = 6;
const AU = ORBIT_R;

interface Planet { key: string; dist: number; deg: number; r: number; tex: () => THREE.Texture; tilt?: number; ring?: boolean }

export function earthPosition(p: ParamValues): THREE.Vector3 {
  const deg = p.orbit_t;
  const rel = p.release_deg;
  const toXZ = (d: number) => new THREE.Vector3(ORBIT_R * Math.cos((d * Math.PI) / 180), 0, -ORBIT_R * Math.sin((d * Math.PI) / 180));
  if (deg <= rel) return toXZ(deg);
  const at = toXZ(rel);
  const rad = (rel * Math.PI) / 180;
  const tangent = new THREE.Vector3(-Math.sin(rad), 0, -Math.cos(rad));
  return at.add(tangent.multiplyScalar(((deg - rel) * Math.PI / 180) * ORBIT_R));
}

/** Point on the Sun -> Earth line at the shell radius (camera anchor for "ride the last light"). */
export function shellAnchor(p: ParamValues): THREE.Vector3 {
  return earthPosition(p).normalize().multiplyScalar(Math.max(p.shell_r, SUN_R));
}

// ---------- procedural textures ----------

function canvasTex(draw: (g: CanvasRenderingContext2D, W: number, H: number) => void, W = 512, H = 256) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  draw(c.getContext("2d")!, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const banded = (seed: number, cols: string[], turb = 6) => () => canvasTex((g, W, H) => {
  const r = mulberry32(seed);
  for (let y = 0; y < H; y++) {
    const k = Math.floor((Math.sin(y * 0.11 + r() * 0.2) * 0.5 + 0.5) * (cols.length - 0.01) + (r() - 0.5) * 0.4);
    g.fillStyle = cols[Math.max(0, Math.min(cols.length - 1, k))];
    g.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.06})`;
    g.beginPath(); g.ellipse(r() * W, r() * H, 10 + r() * 40, 1 + r() * turb, 0, 0, Math.PI * 2); g.fill();
  }
});

const cratered = (seed: number, base: string, dark: string) => () => canvasTex((g, W, H) => {
  const r = mulberry32(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) {
    const x = r() * W, y = r() * H, rad = 1 + r() ** 3 * 22;
    g.fillStyle = dark; g.globalAlpha = 0.15 + r() * 0.35;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
});

function earthTextures(seed: number) {
  const r = mulberry32(seed + 3);
  const W = 1024, H = 512;
  let px: Uint8ClampedArray | null = null;
  const map = canvasTex((g) => {
    const oc = g.createLinearGradient(0, 0, 0, H);
    oc.addColorStop(0, "#173f78"); oc.addColorStop(0.5, "#1f5fa8"); oc.addColorStop(1, "#173f78");
    g.fillStyle = oc; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 7; k++) {
      const cx = r() * W, cy = H * (0.22 + r() * 0.56);
      for (let i = 0; i < 120; i++) {
        const x = cx + (r() - 0.5) * 220, y = cy + (r() - 0.5) * 130, rad = 2 + r() ** 2.5 * 22;
        const lat = Math.abs(y / H - 0.5) * 2;
        g.fillStyle = lat > 0.78 ? "#e9eef2" : lat > 0.5 ? "#3f6b3a" : r() < 0.22 ? "#a58c5e" : r() < 0.6 ? "#3e6e33" : "#567f3c";
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
      }
    }
    g.fillStyle = "#eef3f6"; g.fillRect(0, 0, W, 30); g.fillRect(0, H - 30, W, 30);
    // soften the blob edges so the globe reads as land/sea, not circles
    // blur with horizontal wrap-around so the texture seam stays invisible
    const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
    const tg = tmp.getContext("2d")!; tg.filter = "blur(3px)";
    for (const dx of [-W, 0, W]) tg.drawImage(g.canvas, dx, 0);
    g.drawImage(tmp, 0, 0);
    px = g.getImageData(0, 0, W, H).data;
  }, W, H);
  const lights = canvasTex((g) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 12000; i++) {
      const x = Math.floor(r() * W), y = Math.floor(H * 0.12 + r() * H * 0.76);
      const o = (y * W + x) * 4;
      if (!px || !(px[o + 1] > px[o + 2] || (px[o] > 150 && px[o] < 230))) continue;
      g.fillStyle = `rgba(255,${190 + r() * 40 | 0},${110 + r() * 50 | 0},${0.4 + r() * 0.6})`;
      g.fillRect(x, y, 1 + (r() < 0.2 ? 1 : 0), 1);
    }
  }, W, H);
  const clouds = canvasTex((g) => {
    // streaky cloud bands: many small soft strokes, blurred
    for (let i = 0; i < 2600; i++) {
      const x = r() * W, y = H * (0.08 + r() * 0.84), rad = 2 + r() ** 2 * 14;
      g.fillStyle = `rgba(255,255,255,${0.06 + r() * 0.16})`;
      g.beginPath(); g.ellipse(x, y, rad * (2.5 + r() * 3), rad, (r() - 0.5) * 0.4, 0, Math.PI * 2); g.fill();
    }
    const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
    const tg = tmp.getContext("2d")!; tg.filter = "blur(2px)";
    for (const dx of [-W, 0, W]) tg.drawImage(g.canvas, dx, 0);
    g.clearRect(0, 0, W, H); g.drawImage(tmp, 0, 0);
  }, W, H);
  return { map, lights, clouds };
}

// ---------- shaders ----------

const PLANET_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/** Lit only by the Sun at the origin, and only while `lit` > 0 (the last light hasn't passed yet). */
const PLANET_FRAG = /* glsl */ `
uniform sampler2D map; uniform sampler2D night; uniform float lit; uniform float nightAmt; uniform float ice;
uniform float ambient; uniform float alpha; uniform vec3 tint; uniform float rim; uniform float dry;
varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main() {
  vec3 L = normalize(-vW);
  float d = max(dot(normalize(vN), L), 0.0);
  vec4 tx = texture2D(map, vUv);
  vec3 base = mix(tx.rgb * tint, vec3(0.9, 0.94, 0.98), ice);
  float ocean = smoothstep(0.04, 0.18, tx.b - tx.r);
  base = mix(base, vec3(0.42, 0.36, 0.30) * (0.7 + 0.3 * tx.g), dry * ocean);
  vec3 col = base * (ambient + 1.25 * d * lit);
  col += texture2D(night, vUv).rgb * nightAmt * (1.0 - d * lit) * 1.6;
  // atmosphere rim: blue all round, golden when back-lit by the Sun
  vec3 V = normalize(cameraPosition - vW);
  float f = pow(1.0 - max(dot(normalize(vN), V), 0.0), 3.0);
  float back = max(dot(-V, L), 0.0);
  col += rim * f * (vec3(0.35, 0.6, 1.0) * (0.35 + 0.65 * lit) + vec3(1.0, 0.75, 0.4) * back * lit * 1.5);
  gl_FragColor = vec4(col, alpha * tx.a);
}`;

const SUN_FRAG = /* glsl */ `
uniform float time; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.03; a*=0.5; } return s; }
void main() {
  vec3 p = normalize(vW) * 3.0;
  float g = fbm(p * 2.2 + vec3(0.0, time * 0.05, time * 0.03));
  float cells = fbm(p * 9.0 - vec3(time * 0.12));
  vec3 V = normalize(cameraPosition - vW);
  float mu = max(dot(normalize(vN), V), 0.0);
  float limb = pow(mu, 0.45);
  vec3 hot = vec3(1.0, 0.93, 0.72), mid = vec3(1.0, 0.62, 0.18), cool = vec3(0.75, 0.24, 0.04);
  vec3 col = mix(cool, mid, smoothstep(0.25, 0.65, g));
  col = mix(col, hot, smoothstep(0.55, 0.9, cells * 0.6 + g * 0.5));
  gl_FragColor = vec4(col * (0.55 + 0.75 * limb), 1.0);
}`;

const SHELL_FRAG = /* glsl */ `
uniform float strength; uniform float time; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
void main() {
  vec3 V = normalize(cameraPosition - vW);
  float f = 1.0 - abs(dot(normalize(vN), V));
  float rim = pow(f, 2.2);
  // shimmering filaments on the wavefront (pattern lives on the sphere, so it scales with the shell)
  vec3 d = normalize(vW) * 34.0;
  float fil = n3(d + vec3(0.0, time * 0.4, 0.0)) * 0.6 + n3(d * 2.7 - vec3(time * 0.7)) * 0.4;
  // fade the veil when the camera is close to the wall (no muddy full-frame haze)
  float near = smoothstep(2.0, 18.0, length(cameraPosition - vW));
  float veil = (smoothstep(0.55, 0.9, fil) * 0.16 + 0.03) * near;
  vec3 col = mix(vec3(1.0, 0.72, 0.32), vec3(1.0, 0.95, 0.8), rim);
  gl_FragColor = vec4(col, (veil + rim * 0.9) * strength);
}`;

let _black: THREE.Texture | null = null;
const blackTex = () => (_black ??= canvasTex((g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 4, 4); }, 4, 4));

function planetMat(map: THREE.Texture, night?: THREE.Texture) {
  return new THREE.ShaderMaterial({
    vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG, transparent: true,
    uniforms: { map: { value: map }, night: { value: night ?? blackTex() }, lit: { value: 1 }, nightAmt: { value: 0 }, ice: { value: 0 },
      ambient: { value: 0.07 }, alpha: { value: 1 }, tint: { value: new THREE.Color(1, 1, 1) }, rim: { value: 0 }, dry: { value: 0 } },
  });
}

export const PLANETS: Planet[] = [
  { key: "mercury", dist: 0.387 * AU, deg: 25, r: 0.55, tex: cratered(11, "#9a948c", "#5c5852") },
  { key: "venus", dist: 0.723 * AU, deg: -15, r: 1.1, tex: banded(12, ["#efe2c0", "#ece0bd", "#f1e6c6", "#eadcb6"], 1) },
  { key: "mars", dist: 1.524 * AU, deg: 32, r: 0.85, tex: cratered(14, "#b5562f", "#7c3519") },
  { key: "jupiter", dist: 160, deg: -24, r: 4.2, tex: banded(15, ["#d8c3a0", "#b48a62", "#efe3cc", "#9c6b4a", "#e2cfae"], 8) },
  { key: "saturn", dist: 220, deg: 18, r: 3.5, tex: banded(16, ["#e6d4a8", "#cdb27c", "#f0e3c0"], 4), ring: true, tilt: 0.45 },
  { key: "uranus", dist: 280, deg: -40, r: 2.3, tex: banded(17, ["#a7dde3", "#9bd2da", "#b6e6ea"], 2) },
  { key: "neptune", dist: 330, deg: 8, r: 2.2, tex: banded(18, ["#4b78d8", "#3d63c2", "#5d8ae6"], 3) },
];

export const planetPos = (pl: Planet) => new THREE.Vector3(pl.dist * Math.cos((pl.deg * Math.PI) / 180), 0, -pl.dist * Math.sin((pl.deg * Math.PI) / 180));

/** 1 while the last sunlight has not yet passed this distance (or the Sun still exists). */
const litAt = (p: ParamValues, d: number) => (p.sun > 0.5 ? 1 : THREE.MathUtils.clamp((d - p.shell_r) / 1.2 + 0.5, 0, 1));

const EarthPath: React.FC<{ p: ParamValues }> = ({ p }) => {
  const start = earthPosition({ ...p, orbit_t: p.release_deg });
  const now = earthPosition(p);
  const dir = now.clone().sub(start).normalize();
  const ahead = now.clone().add(dir.multiplyScalar(80));
  const solid = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, toneMapped: false })), []);
  const dashed = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: "#ffffff", dashSize: 1.5, gapSize: 1.5, transparent: true, toneMapped: false })), []);
  solid.geometry.setFromPoints([start, now]);
  (solid.material as THREE.LineBasicMaterial).opacity = 1.0 * p.orbit_trail;
  dashed.geometry.setFromPoints([now, ahead]);
  dashed.computeLineDistances();
  (dashed.material as THREE.LineDashedMaterial).opacity = 0.85 * p.orbit_trail;
  return (<><primitive object={solid} /><primitive object={dashed} /></>);
};

export const Cosmic: React.FC<{ p: ParamValues; seed: number; simT: number }> = ({ p, seed, simT }) => {
  const earthTex = useMemo(() => earthTextures(seed), [seed]);
  const mats = useMemo(() => {
    const m: Record<string, THREE.ShaderMaterial> = {};
    for (const pl of PLANETS) m[pl.key] = planetMat(pl.tex());
    m.earth = planetMat(earthTex.map, earthTex.lights);
    m.clouds = planetMat(earthTex.clouds);
    m.moon = planetMat(cratered(21, "#a9a7a2", "#6d6b66")());
    m.ring = planetMat(canvasTex((g, W, H) => {
      const r = mulberry32(5);
      for (let x = 0; x < W; x++) { g.fillStyle = `rgba(${215 + r() * 30 | 0},${195 + r() * 30 | 0},${150 + r() * 30 | 0},${0.25 + r() * 0.6})`; g.fillRect(x, 0, 1, H); }
    }, 256, 4));
    m.ring.side = THREE.DoubleSide;
    return m;
  }, [earthTex]);
  const sunMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: PLANET_VERT, fragmentShader: SUN_FRAG, uniforms: { time: { value: 0 } }, toneMapped: false }), []);
  const shellMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PLANET_VERT, fragmentShader: SHELL_FRAG, uniforms: { strength: { value: 1 }, time: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
  }), []);
  const stars = useMemo(() => {
    const r = mulberry32(seed + 17);
    const n = 12000;
    const pos = new Float32Array(n * 3);
    const band = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.1, 0.3, 0.5));
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      if (i % 2) {
        const th = r() * Math.PI * 2;
        v.set(Math.cos(th), (r() + r() + r() - 1.5) * 0.12, Math.sin(th)).normalize().applyQuaternion(band);
      } else {
        const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        v.set(s * Math.cos(th), u, s * Math.sin(th));
      }
      const R = 2600 + r() * 300;
      pos.set([v.x * R, v.y * R, v.z * R], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [seed]);
  const ring = useMemo(() => new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 361 }, (_, i) => new THREE.Vector3(ORBIT_R * Math.cos((i * Math.PI) / 180), 0, -ORBIT_R * Math.sin((i * Math.PI) / 180)))), []);
  const ringMat = useMemo(() => new THREE.LineDashedMaterial({ color: "#c4d6f2", dashSize: 1.2, gapSize: 1.0, transparent: true, toneMapped: false }), []);
  const ringLine = useMemo(() => { const l = new THREE.Line(ring, ringMat); l.computeLineDistances(); return l; }, [ring, ringMat]);
  ringMat.opacity = p.orbit_trail * 0.9;
  // streaks riding just behind the light front: they sell the speed of the shell
  const streaks = useMemo(() => {
    const r = mulberry32(seed + 23);
    const n = 1400;
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      a.set([s * Math.cos(th), u * 0.35, s * Math.sin(th), r()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    return { a, g, n };
  }, [seed]);

  const glow = radialTexture();
  sunMat.uniforms.time.value = simT;
  const sunI = p.sun;
  const earth = earthPosition(p);

  const setLit = (m: THREE.ShaderMaterial, d: number) => {
    m.uniforms.lit.value = litAt(p, d);
    m.uniforms.ambient.value = 0.06 + 0.17 * (1 - sunI);
  };
  const eLit = litAt(p, earth.length());
  setLit(mats.earth, earth.length());
  mats.earth.uniforms.nightAmt.value = (0.6 + 0.4 * (1 - eLit)) * p.earth_lights;
  mats.earth.uniforms.rim.value = 1.0 - 0.7 * p.atmo_loss;
  mats.earth.uniforms.alpha.value = 1 - 0.85 * p.xray;
  mats.earth.depthWrite = p.xray < 0.01;
  mats.earth.uniforms.ice.value = p.earth_ice;
  mats.earth.uniforms.dry.value = p.earth_dry;
  setLit(mats.clouds, earth.length());
  mats.clouds.uniforms.alpha.value = 0.85 * (1 - p.earth_ice * 0.7) * (1 - p.xray) * (1 - p.clouds_off);
  const moonAng = simT * 0.25 + 2.2; // keep the Moon out of the Earth -> Sun line of sight
  const moonPos = earth.clone().add(new THREE.Vector3(Math.cos(moonAng) * 5, 0.4, Math.sin(moonAng) * 5));
  setLit(mats.moon, moonPos.length());
  setLit(mats.ring, 220);

  if (p.shell > 0.01 && sunI < 0.5) {
    const pos = streaks.g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < streaks.n; i++) {
      const [x, y, z, k] = [streaks.a[i * 4], streaks.a[i * 4 + 1], streaks.a[i * 4 + 2], streaks.a[i * 4 + 3]];
      const r0 = Math.max(SUN_R, p.shell_r - 0.5 - k * 6);
      const len = 1.5 + k * 3;
      pos.setXYZ(i * 2, x * r0, y * r0, z * r0);
      pos.setXYZ(i * 2 + 1, x * (r0 - len), y * (r0 - len), z * (r0 - len));
    }
    pos.needsUpdate = true;
  }
  shellMat.uniforms.strength.value = p.shell;
  shellMat.uniforms.time.value = simT;

  return (
    <group>
      <points geometry={stars}>
        <pointsMaterial size={1.5} sizeAttenuation={false} color="#dfe8ff" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </points>
      {sunI > 0.001 && (
        <group scale={Math.max(sunI, 0.001)}>
          <mesh material={sunMat}>
            <sphereGeometry args={[SUN_R, 96, 64]} />
          </mesh>
          <sprite scale={[SUN_R * 5, SUN_R * 5, 1]}>
            <spriteMaterial map={glow} color="#ffb347" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          <sprite scale={[SUN_R * 14, SUN_R * 14, 1]}>
            <spriteMaterial map={glow} color="#ff8a2a" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          {[0.4, 2.3, 4.1].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * SUN_R * 0.98, Math.sin(a) * SUN_R * 0.98, 0.5]} rotation={[0, 0, a - Math.PI / 2]}>
              <torusGeometry args={[0.9 + i * 0.3, 0.09, 8, 32, Math.PI]} />
              <meshBasicMaterial color="#ff7a24" transparent opacity={0.85} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      {p.shell > 0.01 && sunI < 0.5 && (
        <>
          <mesh material={shellMat} scale={Math.max(p.shell_r, SUN_R)}>
            <sphereGeometry args={[1, 96, 64]} />
          </mesh>
          <lineSegments geometry={streaks.g}>
            <lineBasicMaterial color="#ffd08a" transparent opacity={0.55 * p.shell} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </lineSegments>
        </>
      )}
      {p.orbit_trail > 0.001 && <primitive object={ringLine} />}
      {p.orbit_trail > 0.001 && p.orbit_t > p.release_deg && <EarthPath p={p} />}

      {p.planets > 0.01 && PLANETS.map((pl) => {
        setLit(mats[pl.key], pl.dist);
        const l = litAt(p, pl.dist);
        return (
          <group key={pl.key} position={planetPos(pl)}>
            <mesh material={mats[pl.key]} rotation={[pl.tilt ?? 0.1, simT * 0.2, 0]}>
              <sphereGeometry args={[pl.r, 48, 32]} />
            </mesh>
            {pl.ring && (
              <mesh material={mats.ring} rotation={[Math.PI / 2 - (pl.tilt ?? 0), 0, 0]}>
                <ringGeometry args={[pl.r * 1.35, pl.r * 2.3, 96]} />
              </mesh>
            )}
            {l > 0.05 && (
              <sprite scale={[pl.r * (pl.key === "neptune" ? 3.2 + 6 * p.neptune : 3.2), pl.r * (pl.key === "neptune" ? 3.2 + 6 * p.neptune : 3.2), 1]}>
                <spriteMaterial map={glow} color={pl.key === "neptune" && p.neptune > 0 ? "#9cc0ff" : "#fff1d6"} transparent opacity={(0.12 + (pl.key === "neptune" ? 0.6 * p.neptune : 0)) * l} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
              </sprite>
            )}
          </group>
        );
      })}

      {p.neptune_ray > 0.001 && p.neptune_ray < 0.999 && (() => {
        // Neptune's last reflected sunlight, still in flight toward Earth
        const from = planetPos(PLANETS[PLANETS.length - 1]);
        const head = from.clone().lerp(earth, p.neptune_ray);
        const tail = from.clone().lerp(earth, Math.max(0, p.neptune_ray - 0.12));
        return (
          <group>
            <line>
              <bufferGeometry attach="geometry" onUpdate={(g) => g.setFromPoints([tail, head])} />
              <lineBasicMaterial attach="material" color="#9cc0ff" transparent opacity={0.9} toneMapped={false} />
            </line>
            <sprite position={head} scale={[7, 7, 1]}>
              <spriteMaterial map={glow} color="#bcd4ff" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
          </group>
        );
      })()}
      <group position={earth}>
        <Shields p={p} seed={seed} simT={simT} R={EARTH_R} earth={earth} />
        <mesh material={mats.earth} rotation={[0.41, simT * 0.6, 0]}>
          <sphereGeometry args={[EARTH_R, 64, 48]} />
        </mesh>
        <mesh material={mats.clouds} rotation={[0.41, simT * 0.75, 0]}>
          <sphereGeometry args={[EARTH_R * 1.015, 64, 48]} />
        </mesh>
        {p.impact_glow > 0.01 && (
          <group position={new THREE.Vector3(-0.55, 0.75, 0.6).normalize().multiplyScalar(EARTH_R * 1.01)}>
            <sprite scale={[EARTH_R * 0.9 * p.impact_glow, EARTH_R * 0.9 * p.impact_glow, 1]} renderOrder={6}>
              <spriteMaterial map={glow} color="#fff3d0" transparent opacity={p.impact_glow} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite scale={[EARTH_R * 2.6 * p.impact_glow, EARTH_R * 2.6 * p.impact_glow, 1]} renderOrder={6}>
              <spriteMaterial map={glow} color="#ff8a3d" transparent opacity={0.6 * p.impact_glow} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
          </group>
        )}
        {p.core_glow > 0.01 && (
          <>
            <sprite scale={[EARTH_R * 1.5, EARTH_R * 1.5, 1]} renderOrder={5}>
              <spriteMaterial map={glow} color="#ff7a2e" transparent opacity={0.32 * p.core_glow} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite scale={[EARTH_R * 0.6, EARTH_R * 0.6, 1]} renderOrder={6}>
              <spriteMaterial map={glow} color="#ffd18a" transparent opacity={0.35 * p.core_glow} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
          </>
        )}
        {p.aurora > 0.01 && (
          // auroral ovals around both magnetic poles (the last solar wind still arriving)
          <group rotation={[0.41, simT * 0.6, 0]}>
            {[1, -1].map((s) => [0, 1, 2].map((k) => (
              <mesh key={`${s}${k}`} position={[0, s * EARTH_R * (0.9 - k * 0.012), 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[EARTH_R * (0.42 + k * 0.03), EARTH_R * (0.012 + k * 0.008), 6, 128]} />
                <meshBasicMaterial color={k === 2 ? "#7dffc0" : "#5dffa8"} transparent opacity={p.aurora * (0.55 - k * 0.15) * (0.85 + 0.15 * Math.sin(simT * 3 + k))} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
            )))}
          </group>
        )}
        <sprite scale={[EARTH_R * 3.2, EARTH_R * 3.2, 1]}>
          <spriteMaterial map={glow} color="#6fa8ff" transparent opacity={0.1 + 0.18 * eLit} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </group>
      <mesh position={moonPos} material={mats.moon}>
        <sphereGeometry args={[0.42, 32, 24]} />
      </mesh>
    </group>
  );
};
