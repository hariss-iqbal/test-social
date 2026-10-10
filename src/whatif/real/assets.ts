import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { staticFile } from "remotion";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

/**
 * Asset loading for the realistic kits. useLoader suspends; Remotion's ThreeCanvas holds the frame
 * (delayRender) while anything inside it is suspended, so every frame renders with all assets present.
 * useLoader caches per URL, so a model used by twenty characters is fetched and parsed once per tab.
 * Files live in assets/whatif_public (the render's publicDir): whatif/{hdri,models,tex,chars,animals}/...
 */
export function useHDRI(name: string): THREE.DataTexture {
  const t = useLoader(HDRLoader, staticFile(`whatif/hdri/${name}.hdr`)) as THREE.DataTexture;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

export function useGLTF(path: string): GLTF {
  return useLoader(GLTFLoader, staticFile(`whatif/${path}`)) as GLTF;
}

export interface TexSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture }

/** Poly Haven PBR set (diff/nor/rough), tiled `repeat` times (clones share the image). */
export function useTexSet(id: string, repeat: [number, number]): TexSet {
  const base = useLoader(THREE.TextureLoader, ["diff", "nor", "rough"].map((k) => staticFile(`whatif/tex/${id}/${k}.jpg`))) as THREE.Texture[];
  return useMemo(() => {
    const [map, normalMap, roughnessMap] = base.map((t) => {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(repeat[0], repeat[1]);
      c.anisotropy = 8;
      c.needsUpdate = true;
      return c;
    });
    map.colorSpace = THREE.SRGBColorSpace;
    return { map, normalMap, roughnessMap };
  }, [base, repeat[0], repeat[1]]); // eslint-disable-line react-hooks/exhaustive-deps
}
