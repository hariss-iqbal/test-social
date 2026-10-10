import { useMemo } from "react";
import * as THREE from "three";
import type { ParamValues } from "./params";
import { mulberry32, pick } from "./rng";
import { radialTexture } from "./Sky";

/**
 * "city" kit: a big downtown park with open sky, ringed by a skyline (wall of towers to the north, -z).
 * Units are metres, y up. Typical POV: standing on the lawn at about (0, 1.7, 10) looking toward -z.
 * Open sky matters: most "what if" topics happen in the sky (Sun, Moon, stars, asteroids).
 */

const ICE = new THREE.Color(0.86, 0.91, 0.98);
const DEAD = new THREE.Color(0.47, 0.42, 0.32);

interface Tower { x: number; z: number; w: number; d: number; h: number; mat: number; tiers: number; spire: boolean }
interface Walker { x0: number; z0: number; ang: number; speed: number; color: THREE.Color; vis: number; h: number; sit: boolean }
interface Car { x: number; z0: number; dir: number; speed: number; color: THREE.Color; vis: number }

function facadeTexture(seed: number, base: string, lit: boolean) {
  const r = mulberry32(seed);
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = lit ? "#000" : base;
  g.fillRect(0, 0, 128, 256);
  const cols = 8, rows = 16;
  for (let j = 0; j < rows; j++) {
    // lit windows cluster by floor (offices), not uniform noise
    const floorLit = r() < 0.55;
    for (let i = 0; i < cols; i++) {
      const x = i * 16 + 3, y = j * 16 + 4;
      if (lit) {
        if (floorLit ? r() < 0.75 : r() < 0.08) {
          const w = 0.55 + r() * 0.45;
          g.fillStyle = `rgba(${255 * w | 0},${(200 + r() * 40) * w | 0},${(130 + r() * 70) * w | 0},1)`;
          g.fillRect(x, y, 10, 9);
        }
      } else {
        const t = 0.3 + r() * 0.3;
        g.fillStyle = `rgba(${120 * t + 70 | 0},${160 * t + 80 | 0},${200 * t + 90 | 0},1)`;
        g.fillRect(x, y, 10, 9);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

let _pit: THREE.Texture | null = null;
function pitTexture() {
  if (_pit) return _pit;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "#000000"); grd.addColorStop(0.55, "#050302"); grd.addColorStop(0.8, "#2b1e12"); grd.addColorStop(1, "#5a4129");
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  _pit = new THREE.CanvasTexture(c);
  _pit.colorSpace = THREE.SRGBColorSpace;
  return _pit;
}

function grassTexture(seed: number) {
  const r = mulberry32(seed + 900);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const x = r() * 256, y = r() * 256, l = 3 + r() * 7, v = 0.72 + r() * 0.4;
    g.strokeStyle = `rgba(${200 * v | 0},${255 * v > 255 ? 255 : 255 * v | 0},${180 * v | 0},0.55)`;
    g.lineWidth = 1 + r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - l); g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(90,110,60,${0.08 + r() * 0.1})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 10 + r() * 30, 6 + r() * 16, r() * 3, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(140, 110);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function boxWithFacadeUV(w: number, h: number, d: number, v0: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nrm = g.attributes.normal as THREE.BufferAttribute;
  // one texture tile = 8 windows x 16 floors = 24 m x 56 m
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
    const px = pos.getX(i), py = pos.getY(i) + h / 2, pz = pos.getZ(i);
    if (ny > 0.5) uv.setXY(i, 0.02, 0.02);
    else uv.setXY(i, (nx > 0.5 ? pz : px) / 24, (py + v0) / 56);
  }
  g.translate(0, h / 2, 0);
  return g;
}

const _geomCache = new Map<string, THREE.BufferGeometry>();
function geom(w: number, h: number, d: number, v0: number) {
  const k = `${w.toFixed(1)}|${h.toFixed(1)}|${d.toFixed(1)}|${v0.toFixed(0)}`;
  let g = _geomCache.get(k);
  if (!g) { g = boxWithFacadeUV(w, h, d, v0); _geomCache.set(k, g); }
  return g;
}

export const City: React.FC<{ p: ParamValues; seed: number; simT: number }> = ({ p, seed, simT }) => {
  const data = useMemo(() => {
    const r = mulberry32(seed);
    const towers: Tower[] = [];
    const place = (x: number, z: number, w: number, d: number, h: number) =>
      towers.push({ x, z, w, d, h, mat: Math.floor(r() * 8), tiers: h > 140 ? 2 + Math.floor(r() * 2) : 1, spire: h > 220 && r() < 0.5 });
    // north wall (the iconic skyline the POV looks at): dense, tall
    for (let row = 0; row < 4; row++) {
      let x = -620;
      while (x < 620) {
        const w = 22 + r() * 26;
        const z = -430 - row * 55 - r() * 15;
        const centre = 1 - Math.min(1, Math.abs(x) / 650);
        const h = 40 + r() ** 1.4 * (90 + 240 * centre) * (row === 0 ? 0.7 : 1);
        if (r() > 0.1) place(x + w / 2, z, w - 2, 30 + r() * 12, h);
        x += w;
      }
    }
    // east / west walls
    for (const side of [-1, 1]) {
      for (let z = 120; z > -430; z -= 34 + r() * 10) {
        for (let row = 0; row < 3; row++) {
          if (r() < 0.12) continue;
          place(side * (300 + row * 50 + r() * 10), z, 26 + r() * 10, 28 + r() * 8, 30 + r() ** 1.6 * 160);
        }
      }
    }
    // south (behind the POV), lower
    for (let x = -400; x < 400; x += 34 + r() * 10) place(x, 150 + r() * 30, 28, 28, 25 + r() * 70);
    // far background mass for depth
    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI * 2, R = 800 + r() * 700;
      place(Math.cos(a) * R, Math.sin(a) * R - 300, 30 + r() * 30, 30 + r() * 30, 30 + r() ** 2 * 300);
    }

    const walkers: Walker[] = [];
    const clothes = ["#d94f3d", "#3a6fd8", "#f2c14e", "#2f9e6e", "#ece6da", "#3a3f4a", "#8e5bd0", "#f08a4b", "#5bb3d0"];
    for (let i = 0; i < 260; i++) {
      const sit = r() < 0.35;
      walkers.push({
        x0: (r() - 0.5) * 380, z0: 60 - r() * 440, ang: r() * Math.PI * 2, speed: sit ? 0 : 0.8 + r() * 0.7,
        color: new THREE.Color(pick(r, clothes)), vis: r(), h: 1.55 + r() * 0.3, sit,
      });
    }
    // near the POV so the frame never feels empty (camera usually at x 0, z 10, facing -z)
    for (let i = 0; i < 110; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.4, d = 9 + r() ** 1.3 * 42;
      const sit = r() < 0.45;
      walkers.push({ x0: Math.cos(a) * d * 1.3, z0: 10 + Math.sin(a) * d, ang: r() * Math.PI * 2, speed: sit ? 0 : 0.5 + r() * 0.6,
        color: new THREE.Color(pick(r, clothes)), vis: r(), h: 1.55 + r() * 0.3, sit });
    }
    const cars: Car[] = [];
    const paints = ["#f4c20d", "#f4c20d", "#e8e8e8", "#1d1f24", "#b3262b", "#2c5aa0", "#8a9099"];
    for (let i = 0; i < 120; i++) {
      const dir = i % 2 ? 1 : -1;
      cars.push({ x: 0, z0: r() * 1200 - 600, dir, speed: 9 + r() * 6, color: new THREE.Color(pick(r, paints)), vis: r() });
    }
    const trees: [number, number, number, number][] = [];
    // clustered groves leave open lawns (and open sky) around the POV
    for (let k = 0; k < 26; k++) {
      const cx = (r() - 0.5) * 540, cz = 70 - r() * 460;
      if (Math.hypot(cx, cz - 5) < 45) continue;
      const n = 4 + Math.floor(r() * 10);
      for (let i = 0; i < n; i++) trees.push([cx + (r() - 0.5) * 40, cz + (r() - 0.5) * 30, 0.9 + r() * 0.8, r()]);
    }
    // hero trees close to the POV: foreground depth, and they visibly die / frost over
    for (const [x, z, sc] of [[-15, -8, 1.7], [13, -16, 1.9], [-7, -30, 1.6], [22, -4, 1.5], [-24, -20, 1.8], [30, -26, 1.7]]) trees.push([x, z, sc, 0.37]);
    // tree line along the park's north edge (frames the skyline)
    for (let x = -300; x < 300; x += 9 + r() * 5) trees.push([x, -392 + (r() - 0.5) * 8, 1.1 + r() * 0.6, r()]);
    const tufts: [number, number, number][] = [];
    for (let i = 0; i < 0; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.6, d = 3 + r() ** 1.3 * 40; tufts.push([Math.cos(a) * d * 1.2, 10 + Math.sin(a) * d, 0.5 + r() * 0.8]); }
    const blankets: [number, number, number, string][] = [];
    const cloth = ["#e9e2d0", "#3f6fb5", "#d65a4a", "#f0c35a", "#6aa36f"];
    for (let i = 0; i < 26; i++) blankets.push([(r() - 0.5) * 120, 40 - r() * 160, r() * Math.PI, pick(r, cloth)]);
    for (let i = 0; i < 8; i++) blankets.push([(r() - 0.5) * 50, -8 - r() * 30, r() * Math.PI, pick(r, cloth)]);
    return { towers, walkers, cars, trees, blankets, tufts };
  }, [seed]);

  const mats = useMemo(() => {
    const bases = ["#cfc6b8", "#8d98a6", "#b8a58c", "#727b88", "#dcd8d0", "#a65a42", "#4f7392", "#e3d9c6"];
    const facade = bases.map((b, i) => new THREE.MeshStandardMaterial({
      map: facadeTexture(seed + i * 11, b, false), emissiveMap: facadeTexture(seed + i * 13 + 5, b, true),
      emissive: new THREE.Color("#ffd49a"), roughness: 0.7, metalness: 0.15,
    }));
    const mk = (c: string, rough = 0.95) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: rough, flatShading: true }); m.userData.base = new THREE.Color(c); return m; };
    return {
      facade,
      grass: Object.assign(mk("#6d9a43"), { map: grassTexture(seed) }), grass2: mk("#5c8a3a"), path: mk("#d4c9b2"), road: mk("#3d4046"),
      trunk: mk("#5e4733"), leafA: mk("#4e8c3a", 0.85), leafB: mk("#6aa046", 0.85), leafC: mk("#3f7a37", 0.85),
      skin: mk("#c99a78"), dark: mk("#2a2d35"), water: new THREE.MeshStandardMaterial({ color: "#5d87a8", roughness: 0.15, metalness: 0.3 }),
    };
  }, [seed]);

  const frost = Math.min(1, p.frost);
  for (const k of ["grass", "grass2", "path", "road", "trunk", "leafA", "leafB", "leafC"] as const) {
    const m = mats[k];
    m.color.copy(m.userData.base as THREE.Color);
    if (k.startsWith("leaf") || k.startsWith("grass")) m.color.lerp(DEAD, 1 - p.plants);
    m.color.lerp(ICE, frost * 0.9);
  }
  mats.water.color.set("#5d87a8").lerp(new THREE.Color("#f4f8ff"), frost).lerp(new THREE.Color("#5b4a36"), p.pond_empty);
  mats.water.roughness = 0.15 + frost * 0.2;
  mats.water.emissive.set("#9fc4ff");
  mats.water.emissiveIntensity = frost * 0.35;
  // flicker: lights drop out in irregular bursts (deterministic per tenth of a second)
  const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const lightsEff = p.lights * (p.flicker > 0 && hash(Math.floor(simT * 9)) < p.flicker * 0.75 ? 0.06 : 1);
  for (const m of mats.facade) {
    m.color.setRGB(1, 1, 1).lerp(ICE, frost * 0.5).lerp(new THREE.Color(0.45, 0.42, 0.38), p.crumble * 0.5);
    m.emissiveIntensity = lightsEff * 1.6 * (1 - p.crumble);
  }
  const leaves = [mats.leafA, mats.leafB, mats.leafC];
  const glow = radialTexture();
  const t = simT;
  const wrap = (v: number, lo: number, hi: number) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

  return (
    <group>
      {/* lawn: two tones in big patches so the ground has texture at a glance */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -140]} material={mats.grass} receiveShadow>
        <planeGeometry args={[640, 500]} />
      </mesh>
      {data.trees.slice(0, 18).map(([x, z], i) => (
        <mesh key={`p${i}`} rotation-x={-Math.PI / 2} position={[x * 0.8, 0.01, z * 0.9]} material={mats.grass2} receiveShadow>
          <circleGeometry args={[24 + (i % 5) * 7, 7]} />
        </mesh>
      ))}
      {/* paths */}
      <mesh rotation-x={-Math.PI / 2} rotation-z={0.35} position={[-30, 0.02, -60]} material={mats.path} receiveShadow>
        <planeGeometry args={[5, 420]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} rotation-z={-1.2} position={[40, 0.02, -40]} material={mats.path} receiveShadow>
        <planeGeometry args={[4, 420]} />
      </mesh>
      {/* pond (freezes) */}
      <mesh rotation-x={-Math.PI / 2} position={[95, 0.03, -150]} material={mats.water} receiveShadow>
        <circleGeometry args={[42, 24]} />
      </mesh>
      {p.hole > 0.01 && (
        <group position={[0, 0.06, -30]}>
          {/* a pit: gradient disc (black centre -> earth wall) reads as depth from any low angle */}
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[6 * p.hole, 48]} />
            <meshBasicMaterial map={pitTexture()} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
            <ringGeometry args={[6 * p.hole, 6 * p.hole + 4 * p.hole, 40]} />
            <meshStandardMaterial color="#6b5236" roughness={1} />
          </mesh>
        </group>
      )}
      {/* grills near the POV: flames flicker; fires = 0 puts them out, > 1 makes them flare */}
      {[[-4, -3], [3, -6], [-7, -10], [6, -1.5], [0, -14]].map(([x, z], i) => (
        <group key={`g${i}`} position={[x, 0, z]} visible={p.crumble < 0.5}>
          <mesh position={[0, 0.45, 0]} material={mats.dark}>
            <cylinderGeometry args={[0.45, 0.35, 0.3, 10]} />
          </mesh>
          {p.fires > 0.01 && [0, 1, 2].map((k) => {
            const fl = 0.75 + 0.25 * Math.sin(simT * 17 + i * 3 + k * 2.1) * Math.sin(simT * 7.3 + k);
            const sz = (1.5 + k * 0.4) * p.fires * fl;
            return (
              <sprite key={k} position={[(k - 1) * 0.15, 0.75 + 0.25 * k * p.fires, 0]} scale={[sz, sz * 1.5, 1]}>
                <spriteMaterial map={glow} color={k === 0 ? "#ffd27a" : k === 1 ? "#ff8a2a" : "#ff5a1f"} transparent opacity={Math.min(1, p.fires)} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
              </sprite>
            );
          })}
        </group>
      ))}
      {p.speck > 0.01 && (
        <group position={[0, Math.max(0.3, p.speck_y), -30]}>
          <sprite scale={[3.5 * p.speck, 3.5 * p.speck, 1]}>
            <spriteMaterial map={glow} color="#e9f1ff" transparent opacity={p.speck} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          <sprite scale={[16 * p.speck, 16 * p.speck, 1]}>
            <spriteMaterial map={glow} color="#6f8cff" transparent opacity={0.7 * p.speck} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          <pointLight intensity={30 * p.speck} distance={60} color="#cfe0ff" />
          {p.speck_y > 1.5 && (
            // falling trail
            <mesh position={[0, 9, 0]}>
              <cylinderGeometry args={[0.08, 0.5, 18, 8, 1, true]} />
              <meshBasicMaterial color="#9fbcff" transparent opacity={0.55 * p.speck} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      )}
      {Array.from({ length: 60 }, (_, i) => (
        <mesh key={`lm${i}`} rotation-x={-Math.PI / 2} position={[-300 + i * 10, 0.01, -410]} material={mats.path}>
          <planeGeometry args={[4, 0.2]} />
        </mesh>
      ))}
      {/* city floor + perimeter avenue */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -300]} material={mats.road} receiveShadow>
        <planeGeometry args={[4000, 4000]} />
      </mesh>

      {data.towers.map((b, i) => {
        const tiers = [];
        let y = 0, w = b.w, d = b.d;
        for (let k = 0; k < b.tiers; k++) {
          const h = k === b.tiers - 1 ? b.h - y : b.h * (k === 0 ? 0.55 : 0.25);
          tiers.push(<mesh key={k} position={[b.x, y, b.z]} material={mats.facade[b.mat]} castShadow receiveShadow geometry={geom(w, h, d, y)} />);
          y += h; w *= 0.72; d *= 0.72;
        }
        if (!b.spire && (i % 3 === 0)) tiers.push(
          <mesh key="r1" position={[b.x + w * 0.18, y + 3, b.z - d * 0.12]} material={mats.dark}>
            <boxGeometry args={[w * 0.35, 6, d * 0.3]} />
          </mesh>,
        );
        if (i % 5 === 1) tiers.push(
          <mesh key="r2" position={[b.x - w * 0.22, y + 2.6, b.z + d * 0.15]} material={mats.trunk}>
            <cylinderGeometry args={[1.6, 1.6, 4.2, 10]} />
          </mesh>,
        );
        if (i % 7 === 2) tiers.push(
          <mesh key="r3" position={[b.x, y + 9, b.z]} material={mats.dark}>
            <cylinderGeometry args={[0.18, 0.25, 18, 5]} />
          </mesh>,
        );
        if (b.spire) tiers.push(
          <mesh key="s" position={[b.x, y + 18, b.z]} material={mats.dark}>
            <coneGeometry args={[1.4, 36, 6]} />
          </mesh>,
        );
        if (p.crumble > 0.001) {
          // staggered collapse: each tower starts at its own moment and sinks into its own dust
          const c = THREE.MathUtils.clamp((p.crumble - ((i * 0.618) % 1) * 0.5) / 0.3, 0, 1);
          return (
            <group key={i}>
              <group scale={[1, Math.max(0.03, 1 - 0.97 * c), 1]} position={[Math.sin(i + simT * 30) * c * (1 - c) * 2, 0, 0]}>{tiers}</group>
              {c > 0.02 && c < 0.999 && b.h > 40 && (
                // billowing dust where the tower comes down
                <sprite position={[b.x, b.h * (1 - c) * 0.6 + 10, b.z]} scale={[b.w * 3.2 * (0.6 + c), b.h * 0.9 * (0.4 + c), 1]}>
                  <spriteMaterial map={glow} color="#b8a88e" transparent opacity={0.75 * Math.sin(Math.PI * c)} depthWrite={false} />
                </sprite>
              )}
            </group>
          );
        }
        return <group key={i}>{tiers}</group>;
      })}

      {data.trees.map(([x, z, s, v], i) => (
        // destruction flattens the trees too
        <group key={i} position={[x, 0, z]} scale={[s, s * (1 - 0.92 * p.crumble), s]}>
          <mesh position={[0, 1.7, 0]} material={mats.trunk} castShadow>
            <cylinderGeometry args={[0.18, 0.26, 3.4, 5]} />
          </mesh>
          <mesh position={[0, 4.6, 0]} rotation-y={v * 6} material={leaves[Math.floor(v * 3) % 3]} castShadow>
            <icosahedronGeometry args={[2.6 * (0.5 + 0.5 * p.plants), 0]} />
          </mesh>
          <mesh position={[0.9, 3.7, 0.4]} rotation-y={v * 3} material={leaves[(Math.floor(v * 3) + 1) % 3]} castShadow>
            <icosahedronGeometry args={[1.7 * (0.5 + 0.5 * p.plants), 0]} />
          </mesh>
        </group>
      ))}

      {data.tufts.map(([x, z, sc], i) => (
        <mesh key={`t${i}`} position={[x, 0.05 * sc, z]} rotation-y={i * 1.7} scale={[sc, sc * 0.6, sc]} material={i % 3 ? mats.grass2 : mats.leafB}>
          <coneGeometry args={[0.07, 0.16, 3]} />
        </mesh>
      ))}
      {data.blankets.map(([x, z, a, c], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} rotation-z={a} position={[x, 0.04, z]} receiveShadow>
          <planeGeometry args={[2.2, 1.6]} />
          <meshStandardMaterial color={new THREE.Color(c).lerp(ICE, frost * 0.7)} roughness={1} />
        </mesh>
      ))}

      {data.walkers.map((w, i) => {
        if (w.vis > p.life) return null;
        const dx = Math.cos(w.ang), dz = Math.sin(w.ang);
        const x = wrap(w.x0 + dx * w.speed * t, -200, 200);
        const z = wrap(w.z0 + dz * w.speed * t, -380, 65);
        if (p.hole > 0.01 && Math.hypot(x - 0, z + 30) < 11 * p.hole) return null;
        // never walk through the POV's standing spot (camera lives around x 0, z 10)
        if (Math.hypot(x, z - 10) < 4.5) return null;
        const sl = p.slide;
        const bob = w.sit || sl > 0.2 ? 0 : Math.abs(Math.sin(t * w.speed * 3.4 + i)) * 0.06;
        const hh = w.sit ? w.h * 0.62 : w.h;
        // friction gone: glide along a random heading, and a growing share of people tip over
        const ga = w.vis * 40 + i;
        const gk = w.sit ? 0 : p.slide_d * (0.5 + w.vis);
        const gx = Math.cos(ga) * gk, gz = Math.sin(ga) * gk;
        // only people mid-stride lose their footing; seated/standing-still people stay put
        const fall = w.sit ? 0 : THREE.MathUtils.clamp((sl - w.vis * 0.8) / 0.25, 0, 1);
        return (
          <group key={i} position={[x + gx, bob, z + gz]} rotation-y={-w.ang + Math.PI / 2} rotation-x={-fall * Math.PI / 2}>
            <mesh position={[0, w.sit ? hh * 0.42 : hh * 0.58, 0]} castShadow>
              <boxGeometry args={[0.48, w.sit ? hh * 0.6 : hh * 0.42, 0.3]} />
              <meshStandardMaterial color={w.color.clone().lerp(ICE, frost * 0.5)} roughness={0.9} flatShading />
            </mesh>
            {!w.sit && [-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.11, hh * 0.19, sl > 0.2 ? 0 : Math.sin(t * w.speed * 3.4 + i + (sd > 0 ? Math.PI : 0)) * 0.12]} material={mats.dark}>
                <boxGeometry args={[0.15, hh * 0.38, 0.17]} />
              </mesh>
            ))}
            {w.sit && (
              <mesh position={[0, 0.1, 0.25]} material={mats.dark}>
                <boxGeometry args={[0.4, 0.18, 0.55]} />
              </mesh>
            )}
            <mesh position={[0, w.sit ? hh * 0.78 : hh * 0.88, 0]} material={mats.skin}>
              <icosahedronGeometry args={[0.14, 1]} />
            </mesh>
          </group>
        );
      })}

      {/* avenue along the north edge of the park */}
      {data.cars.map((c, i) => {
        if (c.vis > p.life) return null;
        const x = wrap(c.z0 + c.dir * c.speed * t, -600, 600);
        const z = -410 + (c.dir > 0 ? -3 : 3) + p.slide_d * (c.vis - 0.5) * 0.8;
        return (
          <group key={i} position={[x, 0, z]} rotation-y={Math.PI / 2 + p.slide_d * (c.vis - 0.5) * 0.12}>
            <mesh position={[0, 0.65, 0]} castShadow>
              <boxGeometry args={[1.9, 0.9, 4.4]} />
              <meshStandardMaterial color={c.color.clone().lerp(ICE, frost * 0.6)} roughness={0.35} metalness={0.4} />
            </mesh>
            <mesh position={[0, 1.3, 0.2]} material={mats.dark}>
              <boxGeometry args={[1.7, 0.6, 2.4]} />
            </mesh>
            {lightsEff > 0.01 && (
              <sprite position={[0, 0.8, c.dir > 0 ? 2.4 : -2.4]} scale={[3, 3, 1]}>
                <spriteMaterial map={glow} color="#fff4dc" transparent opacity={lightsEff} depthWrite={false} blending={THREE.AdditiveBlending} />
              </sprite>
            )}
          </group>
        );
      })}

      {/* park lamps */}
      {lightsEff > 0.01 && Array.from({ length: 40 }, (_, i) => {
        const x = -30 + Math.sin(i * 1.7) * 6 + (i - 20) * 7.5 * Math.sin(0.35), z = -60 + (i - 20) * 9.5;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 2.1, 0]} material={mats.dark}>
              <cylinderGeometry args={[0.05, 0.07, 4.2, 5]} />
            </mesh>
            <sprite position={[0, 4.3, 0]} scale={[2.2, 2.2, 1]}>
              <spriteMaterial map={glow} color="#ffd59a" transparent opacity={lightsEff} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          </group>
        );
      })}
    </group>
  );
};
