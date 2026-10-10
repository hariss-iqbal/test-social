import type { CamKey, Ease, Pose, Track } from "../types";

/**
 * Generic world controls. Every kit reads the subset it supports; unknown params are ignored.
 * The director agent keyframes these in world.json; defaults apply when a track is absent.
 */
export const PARAMS: Record<string, { def: number; doc: string }> = {
  day: { def: 1, doc: "sky daylight 0 (black) .. 1 (noon blue)" },
  sunset: { def: 0, doc: "warm low-sun colouring 0..1" },
  sun: { def: 1, doc: "cosmic: the Sun exists 0..1 (planets stay lit until the last-light shell passes)" },
  sky_sun: { def: 1, doc: "local: Sun disc + sunlight seen from the ground 0..1 (goes out when the last light arrives)" },
  stars: { def: 0, doc: "star field visibility 0..1 (includes the Milky Way band)" },
  clouds: { def: 0.6, doc: "cumulus coverage 0..1 (drift with timescale = visible time-lapse)" },
  moon: { def: 0.35, doc: "Moon brightness in the sky 0..1 (0 = dark disc)" },
  venus: { def: 0, doc: "Venus dot near where the Sun was 0..1" },
  jupiter: { def: 0, doc: "Jupiter dot 0..1" },
  saturn: { def: 0, doc: "Saturn dot 0..1" },
  frost: { def: 0, doc: "ice coverage on every surface 0..1" },
  snow: { def: 0, doc: "falling ice crystals density 0..1" },
  lights: { def: 0, doc: "city windows + street lights on 0..1" },
  life: { def: 1, doc: "people/cars present 0..1 (fade out = empty world)" },
  plants: { def: 1, doc: "vegetation alive 1 (green) .. 0 (dead grey)" },
  timescale: { def: 1, doc: "speed of people/cars/clouds (time-lapse > 1, slow-mo < 1)" },
  exposure: { def: 1, doc: "overall brightness multiplier" },
  breath: { def: 0, doc: "cold breath / haze near camera 0..1" },
  // cosmic layer
  orbit: { def: 1, doc: "Earth follows its orbit 1 .. 0 = released along the tangent (progress via orbit_t)" },
  orbit_t: { def: 0, doc: "Earth travel along its path, in orbit-degrees (tangent after release)" },
  release_deg: { def: 1e9, doc: "orbit-degree where Earth leaves the circle" },
  orbit_trail: { def: 0, doc: "dashed old-orbit ring visibility 0..1" },
  earth_ice: { def: 0, doc: "globe whitening 0..1" },
  labels: { def: 0, doc: "cosmic labels visibility 0..1" },
  neptune: { def: 0, doc: "cosmic: extra highlight glow on Neptune (the last lit planet) 0..1" },
  neptune_ray: { def: 0, doc: "cosmic: progress 0..1 of Neptune's last reflected light travelling to Earth" },
  planets: { def: 1, doc: "cosmic: show the other planets (hide for Earth-only topics) 0..1" },
  impact_glow: { def: 0, doc: "cosmic: a blinding blast glow on Earth's surface 0..1" },
  earth_dry: { def: 0, doc: "cosmic: oceans vanish (dry grey-brown basins) 0..1" },
  clouds_off: { def: 0, doc: "cosmic: Earth's clouds vanish 0..1" },
  earth_lights: { def: 1, doc: "cosmic: city lights on Earth's night side 0..1" },
  core_glow: { def: 0, doc: "cosmic: Earth's internal heat glowing through the dark globe 0..1" },
  shell: { def: 0, doc: "cosmic: visibility of the last-light shell 0..1 (only after the Sun is gone)" },
  shell_r: { def: 0, doc: "cosmic: radius of the last-light shell (Earth orbit = 60; planets go dark as it passes)" },
  aurora: { def: 0, doc: "local: aurora curtains in the night sky 0..1 (need field lines)" },
  airglow: { def: 0, doc: "local: diffuse green-red glow over the whole night sky 0..1 (no-field aurora)" },
  air_hit: { def: 0, doc: "cosmic: dayside atmosphere glows where particles slam in 0..1" },
  // disaster tools (local)
  crumble: { def: 0, doc: "buildings crumble and collapse into dust 0..1 (staggered)" },
  dust: { def: 0, doc: "dust/debris haze 0..1" },
  shake: { def: 0, doc: "ground/camera shake 0..1" },
  slide: { def: 0, doc: "friction loss: people stop walking, tip over and glide 0..1" },
  slide_d: { def: 0, doc: "metres people/cars have glided since friction vanished (ramp it)" },
  pond_empty: { def: 0, doc: "pond water vanishes (mud basin) 0..1" },
  uv: { def: 0, doc: "harsh UV glare, white-violet cast 0..1" },
  sky_dim: { def: 0, doc: "sky darkens 0..1 (daylight sky only)" },
  flicker: { def: 0, doc: "city lights flicker/fail 0..1" },
  sea_level: { def: 1, doc: "real kits: the sea 1 = full .. 0 = gone (seabed exposed)" },
  gulls: { def: 0, doc: "real kits: seagulls circling overhead 0..1" },
  boat_x: { def: -16, doc: "seaside: motorboat position along the bay in metres (ramp it to move the boat; hold to stop it)" },
  boat_wake: { def: 1, doc: "seaside: motorboat engine running 1 (white wake, exhaust) .. 0 (stalled, drifting)" },
  festoon: { def: 1, doc: "seaside: café string lights over the quay 1 = on .. 0 = off (bulbs go out one row after another)" },
  smoke: { def: 0, doc: "real kits: grey smoke rising from the grill (after its flame dies) 0..1" },
  gulls_fall: { def: 0, doc: "real kits: gulls stop flying and drop 0..1" },
  fires: { def: 0, doc: "local: barbecue/campfire flames in the park 0..1 (0 = out, >1 = flare)" },
  speck: { def: 0, doc: "a tiny blinding speck in the park 0..1" },
  speck_y: { def: 60, doc: "speck height above the lawn in metres (falls to 0)" },
  hole: { def: 0, doc: "crater/hole at the speck's impact point 0..1" },
  // shields & interior (cosmic)
  field: { def: 0, doc: "cosmic: Earth's magnetic field lines 0..1" },
  wind: { def: 0, doc: "cosmic: solar-wind particles from the Sun side 0..1" },
  atmo_loss: { def: 0, doc: "cosmic: atmosphere stripped away in a glowing tail 0..1" },
  sats: { def: 0, doc: "cosmic: satellites orbiting Earth 0..1" },
  sat_hit: { def: 0, doc: "cosmic: satellites glitch/die (flicker, go dark red) 0..1" },
  ozone_layer: { def: 0, doc: "cosmic: thin blue ozone shell around Earth 0..1" },
  xray: { def: 0, doc: "cosmic: see-through Earth with layers and core 0..1" },
  probe_t: { def: -2, doc: "cosmic: glowing dot inside X-ray Earth, -1..1 along a diameter (|v|>1 hidden)" },
  rewind: { def: 0, doc: "rewind effect overlay 0..1 (streaks + tint; pair with negative timescale)" },
  grade: { def: 0, doc: "colour grade -1 (cold blue) .. 0 (neutral) .. 1 (warm gold)" },
  grain: { def: 0.5, doc: "film grain overlay strength 0..1" },
};

const ease = (e: Ease | undefined, t: number) => {
  switch (e) {
    case "linear": return t;
    case "in": return t * t * t;
    case "out": return 1 - (1 - t) ** 3;
    case "step": return t < 1 ? 0 : 1;
    default: return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; // inout
  }
};

export function sample(track: Track | undefined, frame: number, def: number): number {
  if (!track || track.length === 0) return def;
  if (frame <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    const [f1, v1, e] = track[i];
    const [f0, v0] = track[i - 1];
    if (frame <= f1) {
      const t = f1 === f0 ? 1 : (frame - f0) / (f1 - f0);
      return v0 + (v1 - v0) * ease(e, t);
    }
  }
  return track[track.length - 1][1];
}

export type ParamValues = Record<string, number>;

export function sampleAll(params: Record<string, Track>, frame: number): ParamValues {
  const out: ParamValues = {};
  for (const k of Object.keys(PARAMS)) out[k] = sample(params[k], frame, PARAMS[k].def);
  return out;
}

/** Integrated simulation time (seconds) so time-lapse speeds up motion without jumps. */
export function simTimeTable(params: Record<string, Track>, frames: number, fps: number): Float64Array {
  const t = new Float64Array(frames + 1);
  for (let f = 1; f <= frames; f++) t[f] = t[f - 1] + sample(params.timescale, f, 1) / fps;
  return t;
}

const lerp3 = (a: number[], b: number[], t: number) => a.map((x, i) => x + (b[i] - x) * t) as [number, number, number];

export interface CamState { space: Pose["space"]; pos: [number, number, number]; target: [number, number, number]; fov: number; blend: number }

/**
 * Camera between keys. Within one space it glides; across spaces (local <-> cosmic) `blend` runs 0..1
 * so the renderer can crossfade the two layers while both cameras keep moving (no hard cut).
 */
export function sampleCamera(keys: CamKey[], frame: number): { a: CamState; b: CamState | null } {
  const mk = (p: Pose, blend = 0): CamState => ({ space: p.space, pos: p.pos, target: p.target, fov: p.fov ?? 50, blend });
  if (keys.length === 0) return { a: mk({ space: "local", pos: [0, 1.7, 10], target: [0, 1.7, 0] }), b: null };
  if (frame <= keys[0][0]) return { a: mk(keys[0][1]), b: null };
  for (let i = 1; i < keys.length; i++) {
    const [f1, p1, e] = keys[i];
    const [f0, p0] = keys[i - 1];
    if (frame <= f1) {
      const t = ease(e, f1 === f0 ? 1 : (frame - f0) / (f1 - f0));
      if (p0.space === p1.space) {
        return {
          a: { space: p0.space, pos: lerp3(p0.pos, p1.pos, t), target: lerp3(p0.target, p1.target, t), fov: (p0.fov ?? 50) + ((p1.fov ?? 50) - (p0.fov ?? 50)) * t, blend: 0 },
          b: null,
        };
      }
      // cross-space: layers crossfade while both cameras keep moving, so it reads as one move.
      // local side: leaving = keeps rising away from its target, arriving = descends into it.
      // cosmic side: leaving = dives toward the globe, arriving = pulls out from close up.
      const drift = (p: Pose, s: number): CamState => {
        const k = p.space === "local" ? 0.9 * s : -0.6 * s;
        const pos = p.pos.map((x, i) => x + (x - p.target[i]) * k) as [number, number, number];
        return { space: p.space, pos, target: p.target, fov: p.fov ?? 50, blend: t };
      };
      return { a: drift(p0, t), b: drift(p1, 1 - t) };
    }
  }
  return { a: mk(keys[keys.length - 1][1]), b: null };
}
