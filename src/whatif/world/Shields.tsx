import { useMemo } from "react";
import * as THREE from "three";
import type { ParamValues } from "./params";
import { mulberry32 } from "./rng";
import { radialTexture } from "./Sky";

/**
 * Earth's invisible shields and interior, drawn around the globe in the cosmic layer.
 * All geometry is Earth-local (the parent group sits at Earth's position). The Sun is at the world
 * origin, so "sunward" is -earth.normalize().
 */

const FRESNEL_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRESNEL_FRAG = /* glsl */ `
uniform vec3 color; uniform float strength; uniform vec3 sunDir; uniform float dayOnly; varying vec3 vN; varying vec3 vW;
void main() {
  vec3 V = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(normalize(vN), V)), 2.5);
  float day = mix(1.0, smoothstep(-0.1, 0.6, dot(normalize(vN), sunDir)), dayOnly);
  gl_FragColor = vec4(color, (0.08 + 0.9 * f) * strength * day);
}`;

function fresnelMat(color: string) {
  return new THREE.ShaderMaterial({
    vertexShader: FRESNEL_VERT, fragmentShader: FRESNEL_FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { color: { value: new THREE.Color(color) }, strength: { value: 0 }, sunDir: { value: new THREE.Vector3(-1, 0, 0) }, dayOnly: { value: 0 } },
  });
}

/** Dipole field lines r = L sin^2(theta), squashed on the day side and stretched into a tail at night. */
function fieldLines(R: number, sun: THREE.Vector3) {
  const pts: THREE.Vector3[] = [];
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.19);
  for (const L of [1.5, 2.0, 2.7, 3.6, 4.8]) {
    for (let k = 0; k < 12; k++) {
      const phi = (k / 12) * Math.PI * 2;
      let prev: THREE.Vector3 | null = null;
      for (let j = 0; j <= 48; j++) {
        const th = 0.12 + (j / 48) * (Math.PI - 0.24);
        const r = L * R * Math.sin(th) ** 2;
        const v = new THREE.Vector3(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi)).applyQuaternion(tilt);
        const d = v.clone().normalize().dot(sun);
        v.multiplyScalar(d > 0 ? 1 - 0.6 * d : 1 + 3.6 * -d * (L / 4.8));
        if (prev) pts.push(prev, v);
        prev = v;
      }
    }
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

export const Shields: React.FC<{ p: ParamValues; seed: number; simT: number; R: number; earth: THREE.Vector3 }> = ({ p, seed, simT, R, earth }) => {
  const sun = useMemo(() => earth.clone().normalize().negate(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const lines = useMemo(() => fieldLines(R, sun), [R, sun]);
  const ozone = useMemo(() => fresnelMat("#5fb4ff"), []);
  const hit = useMemo(() => fresnelMat("#ff7a6a"), []);
  const glow = radialTexture();

  // solar wind: streaks flowing anti-sunward past Earth; with the field on they part around a bow
  const wind = useMemo(() => {
    const r = mulberry32(seed + 61);
    const n = 1500;
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * 9 * R; a.set([r(), Math.cos(ang) * rad, Math.sin(ang) * rad, 0.7 + r() * 0.6], i * 4); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    return { a, g, n };
  }, [seed, R]);
  const tail = useMemo(() => {
    const r = mulberry32(seed + 67);
    const n = 700;
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) a.set([r(), (r() - 0.5) * 2, (r() - 0.5) * 2, 0.6 + r() * 0.8], i * 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return { a, g, n };
  }, [seed]);

  // basis: x along the wind (anti-sunward), y/z across it
  const ax = sun.clone().negate();
  const ay = new THREE.Vector3(0, 1, 0);
  const az = new THREE.Vector3().crossVectors(ax, ay).normalize();

  if (p.wind > 0.01) {
    const pos = wind.g.attributes.position as THREE.BufferAttribute;
    const Rm0 = 5.2 * R;
    for (let i = 0; i < wind.n; i++) {
      const [u, cy, cz, sp] = [wind.a[i * 4], wind.a[i * 4 + 1], wind.a[i * 4 + 2], wind.a[i * 4 + 3]];
      const span = 34 * R;
      const x = -22 * R + ((u * span + simT * 9 * R * sp) % span);
      let y = cy, z = cz;
      const rr = Math.hypot(y, z) || 1e-6;
      // magnetopause: paraboloid opening downwind; field strength blends the deflection in
      const bound = x > -Rm0 ? Rm0 * Math.sqrt(Math.max(0, (x + Rm0) / Rm0)) * 1.15 : 0;
      if (rr < bound) { const k = 1 + (bound / rr - 1) * p.field; y *= k; z *= k; }
      // no field: particles that reach the atmosphere on the day side stop there
      const absorbed = p.field < 0.5 && x > -R * 1.05 && Math.hypot(y, z) < R && x < R;
      const P = ax.clone().multiplyScalar(absorbed ? -R : x).add(ay.clone().multiplyScalar(y)).add(az.clone().multiplyScalar(z));
      const Q = P.clone().sub(ax.clone().multiplyScalar(0.9 * R * sp));
      pos.setXYZ(i * 2, P.x, P.y, P.z);
      pos.setXYZ(i * 2 + 1, Q.x, Q.y, Q.z);
    }
    pos.needsUpdate = true;
  }
  if (p.atmo_loss > 0.01) {
    const pos = tail.g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tail.n; i++) {
      const [u, sy, sz] = [tail.a[i * 4], tail.a[i * 4 + 1], tail.a[i * 4 + 2]];
      const s = (u + simT * 0.12 * tail.a[i * 4 + 3]) % 1;
      const d = R * (1.0 + s * 14);
      const spread = R * (0.6 + s * 2.4);
      const P = ax.clone().multiplyScalar(d).add(ay.clone().multiplyScalar(sy * spread)).add(az.clone().multiplyScalar(sz * spread));
      pos.setXYZ(i, P.x, P.y, P.z);
    }
    pos.needsUpdate = true;
  }
  ozone.uniforms.strength.value = p.ozone_layer;
  hit.uniforms.strength.value = p.air_hit * 0.6;
  hit.uniforms.dayOnly.value = 1;
  hit.uniforms.sunDir.value.copy(sun);
  const probeOn = Math.abs(p.probe_t) <= 1 && p.xray > 0.01;

  const satList = useMemo(() => {
    const r = mulberry32(seed + 71);
    return Array.from({ length: 16 }, () => ({ rad: R * (1.25 + r() * 1.1), inc: (r() - 0.5) * 2.2, ph: r() * Math.PI * 2, sp: 0.35 + r() * 0.5, k: r() }));
  }, [seed, R]);
  const hashF = (n: number) => { const x = Math.sin(n * 91.3) * 43758.5; return x - Math.floor(x); };

  return (
    <group>
      {p.sats > 0.01 && satList.map((st, i) => {
        const a = st.ph + simT * st.sp;
        const pos = new THREE.Vector3(Math.cos(a) * st.rad, 0, Math.sin(a) * st.rad).applyAxisAngle(new THREE.Vector3(1, 0, 0), st.inc);
        const dead = p.sat_hit > st.k;
        const blink = p.sat_hit > 0.01 && hashF(i * 13 + Math.floor(simT * 14)) < 0.45;
        const col = dead ? "#5a1e18" : blink ? "#ff5a3c" : "#e8eef8";
        return (
          <group key={i} position={pos} rotation={[st.inc, a, 0]} scale={R * 0.05 * p.sats}>
            <mesh><boxGeometry args={[0.6, 0.6, 0.9]} /><meshBasicMaterial color={col} toneMapped={false} /></mesh>
            <mesh position={[1.3, 0, 0]}><boxGeometry args={[1.8, 0.05, 0.8]} /><meshBasicMaterial color={dead ? "#2a1a18" : "#3f6fd8"} toneMapped={false} /></mesh>
            <mesh position={[-1.3, 0, 0]}><boxGeometry args={[1.8, 0.05, 0.8]} /><meshBasicMaterial color={dead ? "#2a1a18" : "#3f6fd8"} toneMapped={false} /></mesh>
          </group>
        );
      })}
      {p.field > 0.01 && (
        <lineSegments geometry={lines}>
          <lineBasicMaterial color="#7fd8ff" transparent opacity={Math.min(1, 0.3 + 0.6 * p.field) * Math.min(1, p.field * 6)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </lineSegments>
      )}
      {p.wind > 0.01 && (
        <lineSegments geometry={wind.g} frustumCulled={false}>
          <lineBasicMaterial color="#ffd27a" transparent opacity={0.42 * p.wind} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </lineSegments>
      )}
      {p.air_hit > 0.01 && (
        // unshielded day side glows where the wind slams into the air
        <mesh material={hit} scale={R * 1.06}>
          <sphereGeometry args={[1, 48, 32]} />
        </mesh>
      )}
      {p.atmo_loss > 0.01 && (
        <points geometry={tail.g} frustumCulled={false}>
          <pointsMaterial map={glow} size={0.35 * R} color="#9fd0ff" transparent opacity={0.55 * p.atmo_loss} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation toneMapped={false} />
        </points>
      )}
      {p.ozone_layer > 0.01 && (
        <mesh material={ozone} scale={R * 1.05}>
          <sphereGeometry args={[1, 64, 48]} />
        </mesh>
      )}
      {p.xray > 0.01 && (
        <group rotation={[0.41, 0, 0]}>
          <mesh renderOrder={1}>
            <sphereGeometry args={[R * 0.93, 48, 32]} />
            <meshBasicMaterial color="#c2552a" transparent opacity={0.22 * p.xray} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh renderOrder={2}>
            <sphereGeometry args={[R * 0.55, 48, 32]} />
            <meshBasicMaterial color="#ffad42" transparent opacity={0.55 * p.xray} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh renderOrder={3}>
            <sphereGeometry args={[R * 0.19, 32, 24]} />
            <meshBasicMaterial color="#fff2c4" transparent opacity={0.95 * p.xray} depthWrite={false} toneMapped={false} />
          </mesh>
          {probeOn && (
            <group>
              <mesh position={[0, R * (1 + p.probe_t) / 2 - R * 0 + 0, 0]} renderOrder={4} visible={false} />
              <sprite position={[0, p.probe_t * R, 0]} scale={[R * 0.32, R * 0.32, 1]} renderOrder={5}>
                <spriteMaterial map={glow} color="#e9f3ff" transparent opacity={1} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
              </sprite>
              <mesh position={[0, (R + p.probe_t * R) / 2, 0]} renderOrder={4}>
                <cylinderGeometry args={[R * 0.012, R * 0.012, Math.max(0.001, R - p.probe_t * R), 6]} />
                <meshBasicMaterial color="#cfe2ff" transparent opacity={0.8} depthTest={false} depthWrite={false} toneMapped={false} />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
};
