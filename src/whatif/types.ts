// Timeline for the "whatif" profile. Produced by pipeline/whatif/timeline.py from scenario.json + world.json.
// One continuous world: the camera never hard-cuts; everything changes through keyframed params.

export type Ease = "linear" | "in" | "out" | "inout" | "step";
/** [frame, value, ease-into-this-key] */
export type Key = [number, number, Ease?];
export type Track = Key[];

/** Camera pose: position + look-at target, in the scale space named by `space`. */
export interface Pose {
  space: "local" | "cosmic";
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
  /** cosmic only: pos/target are offsets from the moving Earth */
  follow?: "earth" | "shell" | null;
}
/** [frame, pose, ease] — the camera glides between consecutive keys (no cuts). */
export type CamKey = [number, Pose, Ease?];

export interface Caption { from: number; to: number; text: string }

export type HudValue =
  | { kind: "countdown"; start_s: number; rate: number; prefix?: string }   // m:ss.mmm, rate = story-seconds per screen-second
  | { kind: "counter"; from_v: number; to_v: number; decimals?: number; unit?: string; ease?: Ease }
  | { kind: "text"; text: string };

export interface HudItem { from: number; to: number; label: string; value: HudValue; sub?: string | null; subs?: [number, string][]; joinPrev?: boolean; joinNext?: boolean }

export interface TitleCard { text: string; keyword?: string; sub?: string; from: number; to: number; solid?: boolean }

export interface Flash { at: number; dur: number; color: string; peak?: number }

/** A named character/animal the director scripts precisely: [[seconds, clip], ...] (Idle, Walk, Run, Death, Defeat, SitDown…). */
export interface ActorSpec { id: string; kind: "char" | "animal"; model: string; pos: [number, number, number]; rotY: number; script: [number, string][]; speed?: number; scale?: number }

export interface WhatIfTimeline {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  kit: string;                          // local world kit: "city" (more kits register in world/kits.ts)
  seed: number;
  params: Record<string, Track>;        // see world/params.ts PARAMS for names + defaults
  camera: CamKey[];
  captions: Caption[];
  hud: HudItem[];
  title: TitleCard | null;              // opening question over the live world
  endCard: TitleCard | null;            // loop card (same text as title -> seamless replay)
  flashes: Flash[];
  actors?: ActorSpec[];
  tags?: { from: number; to: number; text: string }[];
  /** real kits: per-video set dressing (see real/Kits.tsx KitOpts) */
  kitOpts?: Record<string, unknown>;
  /** "card" (default: left panel mid-screen) | "bottom" (WHO small, WHAT HAPPENS large, WHY small; lower third) */
  hudStyle?: "card" | "bottom";
  /** slowed countdown: big number n while the story clock runs s0 -> s1 (of total_s) across the item */
  clock?: ClockItem[];
  /** survival-style ladder: milestones with times, one row marked as "now" */
  meters?: MeterItem[];
  /** aftermath timeline strip: milestone labels, keys say which one is active from which frame */
  strips?: StripItem[];
}

export interface ClockItem { from: number; to: number; n: string; s0: number; s1: number; total_s: number; label: string; slow?: string | null }
export interface MeterItem { from: number; to: number; title: string; rows: { time: string; text: string; now?: boolean; danger?: number }[] }
export interface StripItem { from: number; to: number; marks: string[]; keys: [number, number][]; big?: [number, string][] }

export type WhatIfProps = { timeline: WhatIfTimeline };
