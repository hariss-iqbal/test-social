import { useMemo } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useGLTF } from "./assets";

/**
 * A timed action list for an animated character/animal: [[startSeconds, clipName], ...].
 * Clips that should end in a pose (Death, Defeat, SitDown) hold their last frame.
 * Time is driven by the frame (never by a clock), so renders are deterministic.
 */
export type Script = [number, string][];
const HOLD = new Set(["Death", "Defeat", "SitDown", "StandUp", "Jump_toIdle", "Jump_ToIdle"]);

function useInstance(path: string, skin?: string) {
  const gltf = useGLTF(path);
  return useMemo(() => {
    if (!gltf) return null;
    const root = cloneSkinned(gltf.scene) as THREE.Object3D;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        // the character pack ships near-black "Skin": give each person a real skin tone (material cloned per instance)
        if (skin) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          const out = mats.map((mt) => (mt.name === "Skin" ? Object.assign(mt.clone(), { color: new THREE.Color(skin) }) : mt));
          m.material = Array.isArray(m.material) ? out : out[0];
        }
      }
    });
    const mixer = new THREE.AnimationMixer(root);
    return { root, mixer, clips: gltf.animations };
  }, [gltf, skin]);
}

export const Actor: React.FC<{
  path: string; t: number; script: Script; position: [number, number, number]; rotationY?: number; scale?: number;
  /** metres per second while a Walk/Run/Gallop clip plays, along the facing direction */
  speed?: number; visible?: boolean; skin?: string;
}> = ({ path, t, script, position, rotationY = 0, scale = 1, speed = 0, visible = true, skin }) => {
  const inst = useInstance(path, skin);
  if (!inst) return null;
  // current segment + distance travelled so far (only moving clips advance the actor)
  let cur = script[0];
  let travelled = 0;
  for (let i = 0; i < script.length; i++) {
    const [s, clip] = script[i];
    if (t < s) break;
    cur = script[i];
    const end = Math.min(t, i + 1 < script.length ? script[i + 1][0] : t);
    if (/Walk|Run|Gallop/.test(clip)) travelled += (end - s) * speed * (/Run|Gallop/.test(clip) ? 2.6 : 1);
  }
  const [start, name] = cur;
  const clip = inst.clips.find((c) => c.name === name) ?? inst.clips.find((c) => c.name.includes(name)) ?? inst.clips[0];
  inst.mixer.stopAllAction();
  const action = inst.mixer.clipAction(clip);
  action.reset();
  action.setLoop(HOLD.has(clip.name) ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  action.clampWhenFinished = true;
  action.play();
  const local = Math.max(0, t - start);
  action.time = HOLD.has(clip.name) ? Math.min(local, clip.duration - 1e-3) : local % clip.duration;
  inst.mixer.update(0);
  const fx = Math.sin(rotationY) * travelled, fz = Math.cos(rotationY) * travelled;
  return (
    <primitive object={inst.root} position={[position[0] + fx, position[1], position[2] + fz]} rotation-y={rotationY} scale={scale} visible={visible} />
  );
};

/** Static scanned model (Poly Haven glTF), cloned so it can be placed many times. */
export const Model: React.FC<{ path: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number]; shadows?: boolean }> = ({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, shadows = true }) => {
  const gltf = useGLTF(path);
  const obj = useMemo(() => {
    if (!gltf) return null;
    const o = gltf.scene.clone(true);
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) { m.castShadow = shadows; m.receiveShadow = true; }
    });
    return o;
  }, [gltf, shadows]);
  if (!obj) return null;
  return <primitive object={obj} position={position} rotation={rotation} scale={scale} />;
};
