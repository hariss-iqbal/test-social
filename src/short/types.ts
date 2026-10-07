export type Move =
  | "push_in" | "push_in_fast" | "pull_out" | "pan_left" | "pan_right"
  | "drift_up" | "drift_down" | "static";

export interface Shot {
  id: string;
  beat: string;
  from: number;
  duration: number;
  kind: "image" | "video" | "graphic";
  scene?: string;
  sceneProps?: Record<string, unknown>;
  src: string;
  srcW: number;
  srcH: number;
  layout: "cover" | "contain_blur";
  move: Move;
  intensity: number;
  focus: [number, number];
  crop: [number, number, number, number] | null;
  treatment: "doc" | "cctv" | "archival" | "card";
  transition: "cut" | "punch" | "flash" | "dip";
  overlay: { text: string; style: string } | null;
  sourceTag?: string | null;
  sourcePos?: "low" | null;
  highlight?: [number, number, number, number] | null;
  // G6: red evidence ring/box on a normalized SOURCE rect (after crop), drawn on at at_s seconds into the shot
  callout?: Callout | null;
  startFrom?: number;
  playbackRate?: number;
  still?: string;
}

export interface Callout { rect: [number, number, number, number]; shape: "circle" | "box"; at_s?: number }

export interface CaptionWord { text: string; from: number; to: number; emph: boolean }
export interface CaptionPage { from: number; to: number; big?: boolean; fadeOut?: boolean; words: CaptionWord[] }
export interface Overlay { kind: "hook" | "label"; text: string; style?: string; pos?: "low" | "top" | null; from: number; to: number }

export interface Timeline {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  shots: Shot[];
  captions: CaptionPage[];
  overlays: Overlay[];
  safe: { top: number; bottom: number; left: number; right: number };
  endFade?: boolean;                 // G1: false = no fade to black (loop edits cut straight back into frame 1)
  captionStyle?: "bold" | "doc";     // G9: "doc" = sentence-case documentary captions (A/B)
  channelMark?: string | null;       // G7: small top-left wordmark from 4 s on (off unless C.CHANNEL_MARK)
  cover?: CoverProps | null;         // G5: cover still spec (rendered by the Cover composition)
}

export type CoverProps = {
  src: string;                       // image path relative to publicDir
  srcW: number;
  srcH: number;
  focus: [number, number];
  crop?: [number, number, number, number] | null;
  text: string;                      // <= 4 words
  keyword?: string | null;           // one word in red
  circle?: [number, number, number, number] | null;
};

export type ShortProps = { timeline: Timeline };
