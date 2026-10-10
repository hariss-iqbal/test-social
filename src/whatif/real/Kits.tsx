import { useMemo } from "react";
import * as THREE from "three";
import type { ParamValues } from "../world/params";
import { mulberry32 } from "../world/rng";
import { radialTexture } from "../world/Sky";
import { Actor, Model, type Script } from "./Actors";
import { useTexSet } from "./assets";
import { Ground, HDRISky, Sea } from "./Environment";

/**
 * Realistic local kits: photographic HDRI light, scanned CC0 models, PBR textures and animated people/animals.
 * Each kit is a place; params (life, fires, …) and per-actor scripts drive what happens to whom.
 */
import type { ActorSpec } from "../types";

/** opts: per-video set dressing from world.json "kit_opts" (e.g. seaside: crowd, motorboat, festoon, grill position). */
export interface KitProps { p: ParamValues; seed: number; simT: number; t: number; actors?: ActorSpec[]; opts?: KitOpts }
export interface KitOpts {
  crowd?: boolean; pinnace?: boolean; pier?: boolean; motorboat?: { z: number }; festoon?: boolean;
  grill?: [number, number]; flame_size?: number; tables?: [number, number, number][];
}

// ---------- reusable pieces ----------

const Sun: React.FC<{ dir: [number, number, number]; intensity: number; color?: string; target?: [number, number, number] }> = ({ dir, intensity, color = "#ffe2b8", target = [0, 0, 0] }) => (
  <directionalLight
    position={[target[0] + dir[0] * 120, dir[1] * 120, target[2] + dir[2] * 120]}
    target-position={target}
    intensity={intensity}
    color={color}
    castShadow
    shadow-mapSize={[4096, 4096]}
    shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60}
    shadow-camera-far={400} shadow-bias={-0.0003} shadow-normalBias={0.02}
  />
);

/** Whitewashed house with clay-tile roof, shuttered windows and a door. */
const House: React.FC<{ pos: [number, number, number]; size: [number, number, number]; rotY?: number; tint?: string; seed: number; lit?: number; crumble?: number }> = ({ pos, size, rotY = 0, tint = "#f4efe6", seed, lit = 0, crumble = 0 }) => {
  const wall = useTexSet("painted_plaster_wall", [size[0] / 3, size[1] / 3]);
  const roof = useTexSet("clay_roof_tiles", [size[0] / 2, size[2] / 2]);
  const r = useMemo(() => mulberry32(seed), [seed]);
  const wins = useMemo(() => {
    const out: [number, number, string][] = [];
    const cols = Math.max(1, Math.floor(size[0] / 2.4)), rows = Math.max(1, Math.floor(size[1] / 3));
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      out.push([(i - (cols - 1) / 2) * 2.4, 1.6 + j * 3, ["#2f5d7c", "#3d6b4f", "#7a4b2a", "#2e4f6e"][Math.floor(r() * 4)]]);
    }
    return out;
  }, [size, r]);
  if (!wall || !roof) return null;
  const [w, h, d] = size;
  // staggered collapse into its own dust
  const c = THREE.MathUtils.clamp((crumble - ((seed * 0.618) % 1) * 0.5) / 0.35, 0, 1);
  const glow = radialTexture();
  return (
    <group position={pos} rotation-y={rotY}>
      {c > 0.02 && c < 0.995 && (
        <sprite position={[0, h * 0.5, 0]} scale={[w * 3, h * 1.8, 1]}>
          <spriteMaterial map={glow} color="#c9bba3" transparent opacity={0.8 * Math.sin(Math.PI * c)} depthWrite={false} />
        </sprite>
      )}
      <group scale={[1, Math.max(0.03, 1 - 0.97 * c), 1]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial map={wall.map} normalMap={wall.normalMap} roughnessMap={wall.roughnessMap} color={tint} />
      </mesh>
      <mesh position={[0, h + 0.18, 0]} castShadow>
        <boxGeometry args={[w + 0.6, 0.36, d + 0.6]} />
        <meshStandardMaterial map={roof.map} normalMap={roof.normalMap} roughnessMap={roof.roughnessMap} />
      </mesh>
      {wins.map(([x, y, c], i) => (
        <group key={i} position={[x, y, d / 2 + 0.02]}>
          <mesh>
            <planeGeometry args={[0.9, 1.3]} />
            <meshStandardMaterial color="#1b1a19" emissive="#ffc77a" emissiveIntensity={lit * (i % 3 === 0 ? 1.4 : 0.3)} roughness={0.3} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.62, 0, 0.01]}>
              <planeGeometry args={[0.32, 1.35]} />
              <meshStandardMaterial color={c} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[w * 0.25, 1.1, d / 2 + 0.02]}>
        <planeGeometry args={[1.1, 2.2]} />
        <meshStandardMaterial color="#5a3a24" roughness={0.7} />
      </mesh>
      </group>
    </group>
  );
};

/** Wooden chalet with a snowy gable roof and warm windows. */
const Chalet: React.FC<{ pos: [number, number, number]; size: [number, number, number]; rotY?: number; lit?: number }> = ({ pos, size, rotY = 0, lit = 1 }) => {
  const wood = useTexSet("wood_planks", [size[0] / 2, size[1] / 2]);
  const snow = useTexSet("snow_02", [2, 2]);
  const roofGeo = useMemo(() => {
    const [w, , d] = size;
    const s = new THREE.Shape();
    s.moveTo(-w / 2 - 0.6, 0); s.lineTo(0, w * 0.42); s.lineTo(w / 2 + 0.6, 0); s.lineTo(-w / 2 - 0.6, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d + 1.0, bevelEnabled: false });
    g.translate(0, 0, -(d + 1.0) / 2);
    return g;
  }, [size]);
  if (!wood || !snow) return null;
  const [w, h, d] = size;
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} roughnessMap={wood.roughnessMap} color="#c89a6a" />
      </mesh>
      <mesh geometry={roofGeo} position={[0, h, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={snow.map} normalMap={snow.normalMap} roughnessMap={snow.roughnessMap} color="#f6f8fb" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.25, h * 0.55, d / 2 + 0.03]}>
          <planeGeometry args={[1.1, 1.2]} />
          <meshStandardMaterial color="#201812" emissive="#ffb35c" emissiveIntensity={1.6 * lit} />
        </mesh>
      ))}
    </group>
  );
};

/** Fir tree: stacked cones with snow on the tips (scanned conifers are too heavy to render en masse). */
const Fir: React.FC<{ pos: [number, number, number]; h: number; snow?: number }> = ({ pos, h, snow = 0 }) => (
  <group position={pos}>
    <mesh position={[0, h * 0.08, 0]} castShadow><cylinderGeometry args={[h * 0.025, h * 0.035, h * 0.16, 6]} /><meshStandardMaterial color="#3b2a1d" roughness={1} /></mesh>
    {[0, 1, 2, 3].map((k) => (
      <mesh key={k} position={[0, h * (0.28 + k * 0.17), 0]} castShadow receiveShadow>
        <coneGeometry args={[h * (0.26 - k * 0.05), h * 0.32, 9]} />
        <meshStandardMaterial color={new THREE.Color("#1f3a2a").lerp(new THREE.Color("#e9eef4"), snow * (0.25 + k * 0.12))} roughness={0.95} flatShading />
      </mesh>
    ))}
  </group>
);

/** Flickering flames for a fire pit / grill. fires: 0 = out, 1 = burning, >1 = flaring. */
const Flames: React.FC<{ pos: [number, number, number]; fires: number; t: number; size?: number }> = ({ pos, fires, t, size = 1 }) => {
  const glow = radialTexture();
  if (fires < 0.01) return null;
  return (
    <group position={pos}>
      {[0, 1, 2, 3].map((k) => {
        const fl = 0.75 + 0.25 * Math.sin(t * 17 + k * 2.1) * Math.sin(t * 7.3 + k);
        const s = size * (0.9 + k * 0.35) * Math.min(fires, 1.5) * fl;
        return (
          <sprite key={k} position={[(k % 2 - 0.5) * 0.2 * size, (0.35 + 0.22 * k) * size * fires, 0]} scale={[s, s * 1.6, 1]}>
            <spriteMaterial map={glow} color={["#fff1b0", "#ffc04a", "#ff7a1f", "#ff4a12"][k]} transparent opacity={Math.min(1, fires)} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        );
      })}
      <pointLight position={[0, 0.8 * size, 0]} intensity={18 * Math.min(fires, 1.5) * size} distance={14 * size} color="#ff9a4a" />
    </group>
  );
};

/** Seagulls circling; gulls_fall makes them fold their wings and drop one after another. */
const Gulls: React.FC<{ p: ParamValues; simT: number; center: [number, number, number]; n?: number }> = ({ p, simT, center, n = 9 }) => {
  const birds = useMemo(() => { const r = mulberry32(77); return Array.from({ length: n }, () => ({ rad: 6 + r() * 16, h: 9 + r() * 10, sp: 0.25 + r() * 0.25, ph: r() * 6.28, k: r() })); }, [n]);
  if (p.gulls < 0.01) return null;
  return (
    <group position={center}>
      {birds.map((b, i) => {
        const a = b.ph + simT * b.sp;
        const fall = THREE.MathUtils.clamp((p.gulls_fall - b.k * 0.7) / 0.3, 0, 1);
        const y = b.h * (1 - fall) + Math.sin(simT * 1.3 + i) * 0.4 * (1 - fall);
        const flap = fall > 0 ? 0.9 : Math.sin(simT * 9 + i) * 0.6;
        return (
          <group key={i} position={[Math.cos(a) * b.rad, Math.max(0.15, y), Math.sin(a) * b.rad]} rotation={[fall * 1.2, -a, fall * 2.5]} scale={0.6}>
            <mesh><sphereGeometry args={[0.28, 10, 8]} /><meshStandardMaterial color="#f2f2ee" roughness={0.6} /></mesh>
            <mesh position={[0, 0.05, 0.3]}><sphereGeometry args={[0.15, 8, 6]} /><meshStandardMaterial color="#f7f7f3" /></mesh>
            <mesh position={[0, 0.02, 0.45]} rotation-x={Math.PI / 2}><coneGeometry args={[0.04, 0.16, 5]} /><meshStandardMaterial color="#e3a53a" /></mesh>
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.55, 0.05, 0]} rotation-z={sd * flap}>
                <boxGeometry args={[1.0, 0.03, 0.32]} />
                <meshStandardMaterial color={sd > 0 ? "#dfe2e6" : "#d5d9de"} roughness={0.7} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

/** Small white motorboat crossing the bay along x. Engine on (wake 1): foam trail + bow spray; stalled: it drifts and rocks. */
const Motorboat: React.FC<{ x: number; z: number; y: number; wake: number; simT: number }> = ({ x, z, y, wake, simT }) => {
  const hull = useMemo(() => {
    // top-view outline with a pointed bow, extruded upwards
    const s = new THREE.Shape();
    s.moveTo(-2.5, -0.95); s.lineTo(1.3, -0.95); s.quadraticCurveTo(2.5, -0.7, 3.0, 0); s.quadraticCurveTo(2.5, 0.7, 1.3, 0.95); s.lineTo(-2.5, 0.95); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.95, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.45, 0);
    return g;
  }, []);
  const glow = radialTexture();
  const rock = 1 + (1 - wake) * 1.8;
  return (
    <group position={[x, y + Math.sin(simT * 1.3) * 0.05 * rock, z]} rotation={[Math.sin(simT * 1.1) * 0.025 * rock, 0, Math.sin(simT * 0.9) * 0.02 * rock + wake * 0.05]}>
      <mesh geometry={hull} castShadow receiveShadow><meshStandardMaterial color="#f4f3ef" roughness={0.35} /></mesh>
      <mesh position={[-0.6, 0.18, 0]}><boxGeometry args={[3.9, 0.16, 2.12]} /><meshStandardMaterial color="#1e5d8c" roughness={0.4} /></mesh>
      <mesh position={[-0.4, 0.95, 0]} castShadow><boxGeometry args={[1.6, 0.9, 1.5]} /><meshStandardMaterial color="#efeee9" roughness={0.4} /></mesh>
      <mesh position={[0.45, 1.05, 0]} rotation-z={-0.5}><boxGeometry args={[0.06, 0.75, 1.45]} /><meshStandardMaterial color="#1a2630" roughness={0.1} metalness={0.4} /></mesh>
      <mesh position={[-2.75, 0.25, 0]} castShadow><boxGeometry args={[0.45, 0.9, 0.45]} /><meshStandardMaterial color="#202326" roughness={0.5} /></mesh>
      {wake > 0.01 && Array.from({ length: 16 }, (_, k) => {
        const d = k * 1.15 + ((simT * 3) % 1.15);
        const s = 0.9 + d * 0.32;
        return (
          <sprite key={k} position={[-2.9 - d, 0.3, (k % 2 ? 1 : -1) * d * 0.16]} scale={[s * 2.2, s * 0.6, 1]}>
            <spriteMaterial map={glow} color="#ffffff" transparent opacity={wake * Math.max(0, 1 - d / 19)} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        );
      })}
      {wake > 0.01 && (
        <sprite position={[2.6, 0.3, 0]} scale={[1.8, 0.6, 1]}>
          <spriteMaterial map={glow} color="#e8f2f4" transparent opacity={wake * 0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
};

/** Café string lights strung across the quay. Rows switch off one after another as `on` drops 1 -> 0. */
const Festoon: React.FC<{ on: number; rows: { a: [number, number, number]; b: [number, number, number] }[] }> = ({ on, rows }) => {
  const glow = radialTexture();
  return (
    <group>
      {rows.map(({ a, b }, r) => {
        const thr = 0.08 + (r / rows.length) * 0.8;
        const lit = THREE.MathUtils.clamp((on - thr) / 0.06, 0, 1);
        const n = Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.7);
        return (
          <group key={r}>
            {[a, b].map((q, i) => (
              <mesh key={i} position={[q[0], q[1] / 2, q[2]]} castShadow><cylinderGeometry args={[0.05, 0.06, q[1], 8]} /><meshStandardMaterial color="#2a2522" roughness={0.6} /></mesh>
            ))}
            {Array.from({ length: n + 1 }, (_, k) => {
              const u = k / n;
              const pos: [number, number, number] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(Math.PI * u) * 0.55, a[2] + (b[2] - a[2]) * u];
              return (
                <group key={k} position={pos}>
                  <mesh><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#3a332b" emissive="#ffcf80" emissiveIntensity={lit * 3.2} toneMapped={false} /></mesh>
                  {lit > 0.01 && (
                    <sprite scale={[0.55, 0.55, 1]}><spriteMaterial map={glow} color="#ffc56e" transparent opacity={0.85 * lit} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

/** Grey smoke curling up from a dead fire. */
const Smoke: React.FC<{ pos: [number, number, number]; amount: number; simT: number }> = ({ pos, amount, simT }) => {
  const glow = radialTexture();
  if (amount < 0.01) return null;
  return (
    <group position={pos}>
      {Array.from({ length: 10 }, (_, k) => {
        const u = ((simT * 0.35 + k / 10) % 1);
        const s = 0.35 + u * 1.4;
        return (
          <sprite key={k} position={[Math.sin(u * 5 + k) * 0.25 + u * 0.5, 0.2 + u * 2.6, Math.cos(u * 4 + k) * 0.2]} scale={[s, s, 1]}>
            <spriteMaterial map={glow} color="#6f6c68" transparent opacity={amount * 0.7 * Math.sin(Math.PI * u)} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        );
      })}
    </group>
  );
};

/** Round café table with two chairs. */
const CafeTable: React.FC<{ pos: [number, number, number]; rotY?: number }> = ({ pos, rotY = 0 }) => (
  <group position={pos} rotation-y={rotY}>
    <mesh position={[0, 0.74, 0]} castShadow receiveShadow><cylinderGeometry args={[0.42, 0.42, 0.04, 24]} /><meshStandardMaterial color="#e9e4da" roughness={0.5} /></mesh>
    <mesh position={[0, 0.37, 0]} castShadow><cylinderGeometry args={[0.035, 0.05, 0.74, 8]} /><meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.4} /></mesh>
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.62, 0, 0]} rotation-y={s * Math.PI / 2}>
        <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.42, 0.04, 0.42]} /><meshStandardMaterial color="#3c5f7a" roughness={0.6} /></mesh>
        <mesh position={[0, 0.7, -0.2]} castShadow><boxGeometry args={[0.42, 0.5, 0.04]} /><meshStandardMaterial color="#3c5f7a" roughness={0.6} /></mesh>
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b], i) => (
          <mesh key={i} position={[a * 0.18, 0.22, b * 0.18]}><cylinderGeometry args={[0.015, 0.015, 0.44, 6]} /><meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.4} /></mesh>
        ))}
      </group>
    ))}
  </group>
);

/** Director-scripted named actors (world.json "actors"). */
const Named: React.FC<{ actors: ActorSpec[]; t: number }> = ({ actors, t }) => (
  <>
    {actors.map((a) => (
      <Actor key={a.id} path={`${a.kind === "char" ? "chars" : "animals"}/${a.model}.gltf`} t={t} script={a.script} position={a.pos} rotationY={a.rotY} speed={a.speed ?? 0}
        skin={a.kind === "char" ? skinTone(a.id) : undefined}
        scale={a.scale ?? (a.kind === "char" ? 0.55 : SCALE_OF(a.model))} />
    ))}
  </>
);

// people/animal casting -------------------------------------------------------

const SKINS = ["#f2c9a8", "#e3b08c", "#c98f68", "#a46a45", "#7a4a2e", "#f6d9c2", "#d9a07a"];
/** Stable, varied skin tone per actor id. */
function skinTone(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SKINS[h % SKINS.length];
}

const CHARS = ["Casual_Female", "Casual_Male", "Casual2_Female", "Casual2_Male", "Casual3_Female", "Casual3_Male", "OldClassy_Female", "OldClassy_Male", "Worker_Male", "Suit_Female", "Suit_Male", "Chef_Male", "Doctor_Female_Young"];
export interface Cast { kind: "char" | "animal"; model: string; pos: [number, number, number]; rotY: number; script: Script; speed?: number; scale?: number }

/** Deterministic crowd: walkers along a line, idlers in groups. `collapse` (life < 1) makes people fall in turn. */
function crowd(seed: number, n: number, area: [number, number, number, number], opts: { walkFrac?: number; lineZ?: number } = {}): Cast[] {
  const r = mulberry32(seed);
  const out: Cast[] = [];
  for (let i = 0; i < n; i++) {
    const walk = r() < (opts.walkFrac ?? 0.4);
    const x = area[0] + r() * (area[1] - area[0]), z = area[2] + r() * (area[3] - area[2]);
    out.push({ kind: "char", model: CHARS[Math.floor(r() * CHARS.length)], pos: [x, 0, z], rotY: walk ? (r() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (r() - 0.5) * 0.3 : r() * Math.PI * 2, script: [[-10 - r() * 3, walk ? "Walk" : "Idle"]], speed: walk ? 1.1 + r() * 0.3 : 0 });
  }
  return out;
}

/** Applies the global 'life' param: as it drops, people/animals switch to their Death clip one after another. */
function withLife(c: Cast, i: number, p: ParamValues, t: number): Script {
  if (p.life >= 0.999) return c.script;
  const threshold = ((i * 0.618) % 1);
  if (threshold < 1 - p.life) {
    // fell at the moment life crossed this actor's threshold; approximate with a per-actor offset
    const at = t - 0.0001 - threshold * 0.6;
    return [...c.script.filter(([s]) => s < at), [at, c.kind === "char" ? "Death" : "Death"]];
  }
  return c.script;
}

// model units -> metres (Quaternius characters are ~3.2 units tall)
const SCALE: Record<string, number> = { Husky: 0.28, ShibaInu: 0.24, Cow: 0.3, Deer: 0.3, Horse: 0.32, Fox: 0.22, Alpaca: 0.3, Donkey: 0.3 };
function SCALE_OF(m: string) { return SCALE[m] ?? 0.3; }

const Crowd: React.FC<{ cast: Cast[]; p: ParamValues; t: number }> = ({ cast, p, t }) => (
  <>
    {cast.map((c, i) => (
      <Actor key={i} path={`${c.kind === "char" ? "chars" : "animals"}/${c.model}.gltf`} skin={c.kind === "char" ? skinTone(`crowd${i}`) : undefined} t={t} script={withLife(c, i, p, t)} position={c.pos} rotationY={c.rotY} speed={c.speed} scale={c.scale ?? (c.kind === "char" ? 0.55 : SCALE[c.model] ?? 0.3)} />
    ))}
  </>
);

// ---------- kits ----------

/** Mediterranean harbour at golden hour. Camera usually on the quay at (0, 1.7, 8) looking -z over the bay. */
export const Seaside: React.FC<KitProps> = ({ p, seed, simT, t, actors = [], opts = {} }) => {
  // background crowd further back; the story's people/animals come from world.json "actors"
  const cast = useMemo<Cast[]>(() => (opts.crowd === false ? [] : crowd(seed, 12, [-8, 7, -7, -1], { walkFrac: 0.45 })), [seed, opts.crowd]);
  const [gx, gz] = opts.grill ?? [-5.5, 5.5];
  const houses = useMemo(() => {
    const r = mulberry32(seed + 3);
    const out: { pos: [number, number, number]; size: [number, number, number]; rotY: number; tint: string }[] = [];
    // quay-front row on the left, facing the water
    for (let k = 0; k < 7; k++) out.push({ pos: [-11 - r() * 1.5, 0, 6 - k * 7.5], size: [6 + r() * 3, 7 + r() * 6, 6 + r() * 2], rotY: Math.PI / 2, tint: ["#f4efe6", "#f2e3c8", "#eec9a8", "#f6f1e8", "#e8d9c4"][k % 5] });
    // terraces climbing the hill behind
    for (let k = 0; k < 14; k++) out.push({ pos: [-22 - r() * 25, 4 + r() * 18, 10 - r() * 60], size: [6 + r() * 4, 6 + r() * 5, 6 + r() * 3], rotY: Math.PI / 2 + (r() - 0.5) * 0.3, tint: ["#f6f1e8", "#f2e3c8", "#efd2b4"][k % 3] });
    // the village on the far shore
    for (let k = 0; k < 26; k++) out.push({ pos: [-60 + r() * 140, 2 + r() * 26, -150 - r() * 40], size: [7 + r() * 5, 6 + r() * 6, 7], rotY: 0, tint: ["#f6f1e8", "#f2e3c8", "#efd2b4", "#e3e7ea"][k % 4] });
    return out;
  }, [seed]);
  const sunDir = new THREE.Vector3(0.55, 0.22, -0.8);
  return (
    <group>
      <HDRISky name="small_harbour_sunset" exposure={0.55} rotation={2.2} />
      <Sun dir={[sunDir.x, sunDir.y, sunDir.z]} intensity={2.6} color="#ffcf98" target={[0, 0, -10]} />
      {/* the sun is behind the bay (backlight): a soft fill from the land side keeps faces readable */}
      <directionalLight position={[6, 9, 30]} intensity={1.5} color="#fff0e0" />
      <hemisphereLight args={["#ffe6c8", "#5e5040", 0.55]} />
      <Ground tex="cobblestone_floor_001" size={[40, 26]} repeat={[14, 9]} position={[-2, 0.02, 4]} />
      {/* waterfront promenade under the left row of houses (they would otherwise stand in the sea) */}
      <Ground tex="cobblestone_floor_001" size={[14, 44]} repeat={[5, 16]} position={[-15, 0.03, -30]} />
      <mesh position={[-8.1, -1, -30]} castShadow receiveShadow><boxGeometry args={[0.6, 2.1, 44]} /><meshStandardMaterial color="#9c8f7f" roughness={0.9} /></mesh>
      <mesh position={[-2, -1, -9.2]} castShadow receiveShadow><boxGeometry args={[40, 2.1, 0.6]} /><meshStandardMaterial color="#9c8f7f" roughness={0.9} /></mesh>
      <Sea t={simT} position={[0, -0.8, -500]} sunDir={sunDir} color="#0a3044" level={p.sea_level} />
      {/* seabed revealed when the water goes */}
      <Ground tex="coast_sand_01" size={[600, 600]} repeat={[120, 120]} position={[0, -4.2, -300]} tint="#8e8577" />
      {houses.map((h, i) => <House key={i} pos={h.pos} size={h.size} rotY={h.rotY} tint={h.tint} seed={seed + i} lit={p.lights} crumble={p.crumble} />)}
      <Model path="models/coastal_cliff_01/coastal_cliff_01.gltf" position={[70, -2, -120]} scale={9} rotation={[0, -1.2, 0]} />
      <Model path="models/coastal_cliff_02/coastal_cliff_02.gltf" position={[-90, -2, -110]} scale={8} rotation={[0, 0.8, 0]} />
      {opts.pier !== false && <Model path="models/modular_wooden_pier/modular_wooden_pier.gltf" position={[6, -0.4, -12]} scale={1.6} rotation={[0, Math.PI / 2, 0]} />}
      <group position={[30, -0.5 - (1 - p.sea_level) * 3.4, -95]} rotation={[Math.sin(simT * 0.6) * 0.02 * p.sea_level, -0.6, Math.sin(simT * 0.8) * 0.03 * p.sea_level + (1 - p.sea_level) * 0.35]}>
        <Model path="models/dutch_ship_medium/dutch_ship_medium.gltf" scale={1.0} />
      </group>
      {opts.pinnace !== false && (
        <group position={[-4, -0.6 - (1 - p.sea_level) * 3.2, -30]} rotation={[Math.sin(simT * 0.9) * 0.03 * p.sea_level, 0.9, Math.sin(simT * 1.1) * 0.04 * p.sea_level - (1 - p.sea_level) * 0.45]}>
          <Model path="models/ship_pinnace/ship_pinnace.gltf" scale={1.0} />
        </group>
      )}
      {opts.motorboat && <Motorboat x={p.boat_x} z={opts.motorboat.z} y={-0.8 - (1 - p.sea_level) * 3} wake={p.boat_wake} simT={simT} />}
      <Model path="models/wooden_barrels_01/wooden_barrels_01.gltf" position={[-7.5, 0, -3]} scale={1.2} />
      <Model path="models/wooden_lantern_01/wooden_lantern_01.gltf" position={[-6.8, 0, 2]} scale={1.4} />
      <Model path="models/stone_fire_pit/stone_fire_pit.gltf" position={[gx, 0, gz]} scale={1.1} />
      <Flames pos={[gx, 0.35, gz]} fires={p.fires} t={simT} size={opts.flame_size ?? 1} />
      <Smoke pos={[gx, 0.4, gz]} amount={p.smoke} simT={simT} />
      {(opts.tables ?? []).map(([x, z, r], i) => <CafeTable key={i} pos={[x, 0, z]} rotY={r} />)}
      {opts.festoon && (
        <Festoon on={p.festoon} rows={[
          { a: [-6.5, 3.4, -1.5], b: [6.5, 3.4, -1.5] },
          { a: [-6.5, 3.4, 2.0], b: [6.5, 3.4, 2.0] },
          { a: [-6.5, 3.4, 5.5], b: [6.5, 3.4, 5.5] },
        ]} />
      )}
      <Gulls p={p} simT={simT} center={[0, 0, -6]} />
      <Crowd cast={cast} p={p} t={t} />
      <Named actors={actors} t={t} />
    </group>
  );
};

/** Alpine village at dusk in snow. Camera on the village path at (0, 1.7, 10) looking -z toward the mountains. */
export const Mountain: React.FC<KitProps> = ({ p, seed, simT, t }) => {
  const cast = useMemo<Cast[]>(() => [
    ...crowd(seed + 1, 10, [-5, 5, -2, 6], { walkFrac: 0.5 }),
    { kind: "animal", model: "Husky", pos: [1.5, 0, 4], rotY: -Math.PI / 2, script: [[-5, "Walk"]], speed: 1.0 },
    { kind: "animal", model: "Deer", pos: [-9, 0, -16], rotY: 0.9, script: [[-5, "Eating"]] },
    { kind: "animal", model: "Horse", pos: [7, 0, -6], rotY: -2.2, script: [[-5, "Idle"]] },
  ], [seed]);
  const r = mulberry32(seed + 9);
  const chalets = useMemo(() => Array.from({ length: 12 }, (_, k) => ({ pos: [(k % 2 ? 1 : -1) * (9 + r() * 6), 0, 4 - Math.floor(k / 2) * 10 - r() * 3] as [number, number, number], size: [6 + r() * 3, 4 + r() * 2.5, 6 + r() * 2] as [number, number, number], rotY: (k % 2 ? -1 : 1) * Math.PI / 2 })), [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const firs = useMemo(() => Array.from({ length: 70 }, () => [(r() - 0.5) * 120, 0, -20 - r() * 120, 7 + r() * 9] as [number, number, number, number]), [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      <HDRISky name="snowy_hillside" exposure={0.8} rotation={0.4} />
      <Sun dir={[-0.5, 0.25, -0.8]} intensity={1.4} color="#ffd2a8" target={[0, 0, -8]} />
      <Ground tex="snow_02" size={[300, 300]} repeat={[60, 60]} position={[0, 0, -60]} />
      {chalets.map((c, i) => <Chalet key={i} pos={c.pos} size={c.size} rotY={c.rotY} lit={p.lights > 0 ? 1 : 0.4} />)}
      {firs.map(([x, , z, h], i) => (Math.abs(x) > 16 || z < -70) && <Fir key={i} pos={[x, 0, z]} h={h} snow={0.6} />)}
      <Model path="models/stone_fire_pit/stone_fire_pit.gltf" position={[-2.5, 0, 2]} scale={1.1} />
      <Flames pos={[-2.5, 0.35, 2]} fires={p.fires} t={simT} />
      <Crowd cast={cast} p={p} t={t} />
    </group>
  );
};

/** Tropical beach at sunrise. Camera on the sand at (0, 1.7, 8) looking -z out to sea. */
export const Beach: React.FC<KitProps> = ({ p, seed, simT, t }) => {
  const cast = useMemo<Cast[]>(() => [
    ...crowd(seed + 2, 12, [-7, 7, -3, 6], { walkFrac: 0.4 }),
    { kind: "animal", model: "ShibaInu", pos: [-2, 0, 0], rotY: Math.PI / 2, script: [[-5, "Gallop"]], speed: 1.4 },
  ], [seed]);
  return (
    <group>
      <HDRISky name="umhlanga_sunrise" exposure={1.0} rotation={0} />
      <Sun dir={[0.2, 0.25, -0.9]} intensity={2.4} color="#ffdcae" target={[0, 0, -8]} />
      <Ground tex="coast_sand_01" size={[200, 60]} repeat={[50, 15]} position={[0, 0, 0]} />
      <Sea t={simT} position={[0, -0.25, -530]} sunDir={new THREE.Vector3(0.2, 0.25, -0.9)} color="#0f5e6e" />
      <Model path="models/island_tree_01/island_tree_01.gltf" position={[-9, 0, 2]} scale={1.2} />
      <Model path="models/island_tree_02/island_tree_02.gltf" position={[10, 0, -2]} scale={1.3} rotation={[0, 1.2, 0]} />
      <Model path="models/island_tree_01/island_tree_01.gltf" position={[14, 0, 6]} scale={1.0} rotation={[0, 2.4, 0]} />
      <Model path="models/wooden_barrels_01/wooden_barrels_01.gltf" position={[-6, 0, 5]} scale={1.2} />
      <Model path="models/stone_fire_pit/stone_fire_pit.gltf" position={[4, 0, 4]} scale={1.1} />
      <Flames pos={[4, 0.35, 4]} fires={p.fires} t={simT} />
      <Crowd cast={cast} p={p} t={t} />
    </group>
  );
};

/** City street at night. Camera on the sidewalk at (0, 1.7, 8) looking -z down the street. */
export const NightStreet: React.FC<KitProps> = ({ p, seed, simT, t }) => {
  const cast = useMemo<Cast[]>(() => [
    ...crowd(seed + 3, 16, [-5, 5, -20, 6], { walkFrac: 0.6 }),
    { kind: "animal", model: "Husky", pos: [2.5, 0, 2], rotY: Math.PI, script: [[-5, "Walk"]], speed: 0.9 },
  ], [seed]);
  return (
    <group>
      <HDRISky name="cobblestone_street_night" exposure={0.9} rotation={1.6} />
      <ambientLight intensity={0.15} />
      <Ground tex="asphalt_02" size={[10, 200]} repeat={[3, 60]} position={[0, 0.01, -60]} />
      {[-1, 1].map((s) => <Ground key={s} tex="brick_floor" size={[5, 200]} repeat={[2, 70]} position={[s * 7.5, 0.06, -60]} />)}
      {Array.from({ length: 8 }, (_, k) => [-1, 1].map((s) => (
        <Model key={`${k}${s}`} path="models/modular_urban_apartments_facade/modular_urban_apartments_facade.gltf" position={[s * 10.5, 0, 6 - k * 14]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} scale={1.6} />
      )))}
      {Array.from({ length: 6 }, (_, k) => [-1, 1].map((s) => (
        <group key={`l${k}${s}`} position={[s * 5.6, 0, 4 - k * 16]}>
          <Model path="models/street_lamp_01/street_lamp_01.gltf" scale={1.2} rotation={[0, s > 0 ? Math.PI : 0, 0]} />
          <pointLight position={[0, 4.5, 0]} intensity={40 * Math.max(0.05, p.lights)} distance={18} color="#ffc98a" />
        </group>
      )))}
      <Model path="models/modular_street_seating/modular_street_seating.gltf" position={[-6.5, 0.06, -4]} scale={1.2} rotation={[0, Math.PI / 2, 0]} />
      <Model path="models/fire_hydrant/fire_hydrant.gltf" position={[5.8, 0.06, 1]} scale={1.2} />
      <Model path="models/stone_fire_pit/stone_fire_pit.gltf" position={[-6.8, 0.06, 4]} scale={1.0} />
      <Flames pos={[-6.8, 0.4, 4]} fires={p.fires} t={simT} />
      <Crowd cast={cast} p={p} t={t} />
    </group>
  );
};

export const REAL_KITS: Record<string, React.FC<KitProps>> = { seaside: Seaside, mountain: Mountain, beach: Beach, night_street: NightStreet };
