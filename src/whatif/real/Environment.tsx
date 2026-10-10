import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { mulberry32 } from "../world/rng";
import { useHDRI, useTexSet } from "./assets";

/** Photographic lighting: the HDRI is both the sky you see and the light/reflections on every material. */
export const HDRISky: React.FC<{ name: string; exposure?: number; rotation?: number; blur?: number }> = ({ name, exposure = 1, rotation = 0, blur = 0 }) => {
  const hdri = useHDRI(name);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  if (hdri) {
    scene.environment = hdri;
    scene.background = hdri;
    scene.backgroundBlurriness = blur;
    scene.backgroundRotation.set(0, rotation, 0);
    scene.environmentRotation.set(0, rotation, 0);
    scene.backgroundIntensity = exposure;
    scene.environmentIntensity = exposure;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
  }
  return null;
};

/** Textured ground plane (Poly Haven PBR set). */
export const Ground: React.FC<{ tex: string; size: [number, number]; repeat: [number, number]; position?: [number, number, number]; tint?: string; rotationZ?: number }> = ({ tex, size, repeat, position = [0, 0, 0], tint = "#ffffff", rotationZ = 0 }) => {
  const t = useTexSet(tex, repeat);
  if (!t) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, rotationZ]} position={position} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={t.map} normalMap={t.normalMap} roughnessMap={t.roughnessMap} color={tint} />
    </mesh>
  );
};

let _waterNormals: THREE.Texture | null = null;
function waterNormals() {
  if (_waterNormals) return _waterNormals;
  // tiling normal map from summed sine ripples (no external file needed)
  const N = 512;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  const img = g.createImageData(N, N);
  const r = mulberry32(5);
  const waves = Array.from({ length: 14 }, () => ({ kx: Math.round((r() - 0.5) * 16), ky: Math.round((r() - 0.5) * 16), a: 0.4 + r(), ph: r() * 6.28 }));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let dx = 0, dy = 0;
      for (const w of waves) {
        const p = (w.kx * x + w.ky * y) * (Math.PI * 2 / N) + w.ph;
        dx += w.a * w.kx * Math.cos(p);
        dy += w.a * w.ky * Math.cos(p);
      }
      const v = new THREE.Vector3(-dx * 0.02, -dy * 0.02, 1).normalize();
      const o = (y * N + x) * 4;
      img.data[o] = (v.x * 0.5 + 0.5) * 255; img.data[o + 1] = (v.y * 0.5 + 0.5) * 255; img.data[o + 2] = (v.z * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  _waterNormals = new THREE.CanvasTexture(c);
  _waterNormals.wrapS = _waterNormals.wrapT = THREE.RepeatWrapping;
  return _waterNormals;
}

/** Reflective three.js Water (mirror pass). Does not show up under the headless ANGLE renderer; kept for reference. */
export const MirrorSea: React.FC<{ t: number; size?: number; position?: [number, number, number]; color?: string; sunDir?: THREE.Vector3; level?: number }> = ({ t, size = 4000, position = [0, 0, 0], color = "#0b3a52", sunDir = new THREE.Vector3(0.5, 0.3, -0.8), level = 1 }) => {
  const water = useMemo(() => {
    const w = new Water(new THREE.PlaneGeometry(size, size), {
      textureWidth: 1024, textureHeight: 1024, waterNormals: waterNormals(), sunDirection: sunDir.clone().normalize(),
      sunColor: 0xfff1d6, waterColor: new THREE.Color(color), distortionScale: 2.2, fog: false,
    });
    w.rotation.x = -Math.PI / 2;
    return w;
  }, [size, color]); // eslint-disable-line react-hooks/exhaustive-deps
  (water.material as THREE.ShaderMaterial).uniforms.time.value = t * 0.6;
  (water.material as THREE.ShaderMaterial).uniforms.size.value = 3.0;
  water.visible = level > 0.01;
  return <primitive object={water} position={[position[0], position[1] - (1 - level) * 3, position[2]]} />;
};

/**
 * Sea that renders everywhere: a glossy PBR plane reflecting the HDRI sky (scene.environment), with two
 * scrolling ripple normal maps. `level` lowers it (0 = gone).
 */
export const Sea: React.FC<{ t: number; size?: number; position?: [number, number, number]; color?: string; sunDir?: THREE.Vector3; level?: number }> = ({ t, size = 4000, position = [0, 0, 0], color = "#0b3a52", level = 1 }) => {
  const [n1, n2] = useMemo(() => [0, 1].map(() => {
    const n = waterNormals().clone();
    n.wrapS = n.wrapT = THREE.RepeatWrapping;
    n.needsUpdate = true;
    return n;
  }), []);
  n1.repeat.set(size / 4, size / 4);
  n1.offset.set(t * 0.011, t * 0.017);
  n2.repeat.set(size / 11, size / 11);
  n2.offset.set(-t * 0.007, t * 0.005);
  // envMapIntensity only applies to an explicit envMap: a bright HDRI sky otherwise turns the water milky white
  const env = useThree((st) => st.scene.environment);
  if (level < 0.01) return null;
  return (
    <group position={[position[0], position[1] - (1 - level) * 3, position[2]]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshPhysicalMaterial color={color} roughness={0.22} metalness={0} normalMap={n1} normalScale={new THREE.Vector2(0.18, 0.18)}
          envMap={env} clearcoat={0} clearcoatRoughness={0.1} clearcoatNormalMap={n2} clearcoatNormalScale={new THREE.Vector2(0.3, 0.3)} envMapIntensity={0.3} />
      </mesh>
    </group>
  );
};
