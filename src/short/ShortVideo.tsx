import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import type { Callout, CaptionPage, Overlay, Shot, ShortProps } from "./types";
import { Scene, type SceneName } from "./scenes";

const { fontFamily: CAPTION_FONT } = loadMontserrat("normal", { weights: ["800"], subsets: ["latin"] });
const { fontFamily: HOOK_FONT } = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: MONO_FONT } = loadMono("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: DOC_FONT } = loadInter("normal", { weights: ["600"], subsets: ["latin"] });
export const RED = "#E5322D";

export const W = 1080;
export const H = 1920;
// contain_blur panel geometry: captions occupy ~1120-1380 (centered at 1250, v5).
const PANEL_BOTTOM = 1080;
const PANEL_TOP_MIN = 250;
const PANEL_MAX_H = PANEL_BOTTOM - PANEL_TOP_MIN;
const HOOK_BOTTOM = 490;

const GRADE: Record<Shot["treatment"], string> = {
  doc: "contrast(1.07) saturate(0.82) brightness(0.95)",
  cctv: "contrast(1.14) saturate(0.72) brightness(1.03)",
  archival: "grayscale(0.35) sepia(0.18) contrast(1.06) brightness(0.95)",
  card: "none",
};

// Camera move -> (scale, focus offset) as a function of eased progress p in [0,1].
function moveAt(move: Shot["move"], p: number, k: number): { s: number; dx: number; dy: number } {
  switch (move) {
    case "push_in": return { s: 1 + 0.1 * k * p, dx: 0, dy: 0 };
    case "push_in_fast": return { s: 1 + 0.22 * k * p, dx: 0, dy: 0 };
    case "pull_out": return { s: 1 + 0.12 * k * (1 - p), dx: 0, dy: 0 };
    case "pan_left": return { s: 1.08, dx: 0.14 * k * (0.5 - p), dy: 0 };
    case "pan_right": return { s: 1.08, dx: 0.14 * k * (p - 0.5), dy: 0 };
    case "drift_up": return { s: 1.07, dx: 0, dy: 0.08 * k * (0.5 - p) };
    case "drift_down": return { s: 1.07, dx: 0, dy: 0.08 * k * (p - 0.5) };
    default: return { s: 1.02, dx: 0, dy: 0 };
  }
}

// Place a (cropped) source so it covers box bw x bh, centering on focus, never exposing edges.
export function coverRect(
  srcW: number, srcH: number, crop: [number, number, number, number] | null,
  focus: [number, number], scale: number, bw: number, bh: number,
) {
  const [cxn, cyn, cwn, chn] = crop ?? [0, 0, 1, 1];
  const cx = cxn * srcW, cy = cyn * srcH, cw = cwn * srcW, ch = chn * srcH;
  const k = Math.max(bw / cw, bh / ch) * scale;
  const fx = cx + focus[0] * cw;
  const fy = cy + focus[1] * ch;
  let left = bw / 2 - fx * k;
  let top = bh / 2 - fy * k;
  left = Math.min(-cx * k, Math.max(bw - (cx + cw) * k, left));
  top = Math.min(-cy * k, Math.max(bh - (cy + ch) * k, top));
  return { position: "absolute" as const, left, top, width: srcW * k, height: srcH * k };
}

const Media: React.FC<{ shot: Shot; style: React.CSSProperties; still?: boolean }> = ({ shot, style, still }) => {
  if (shot.kind === "video" && !still) {
    return (
      <OffthreadVideo
        src={staticFile(shot.src)}
        startFrom={shot.startFrom ?? 0}
        playbackRate={shot.playbackRate ?? 1}
        muted
        style={{ ...style, maxWidth: "none" }}
      />
    );
  }
  const src = shot.kind === "video" ? shot.still! : shot.src;
  return <Img src={staticFile(src)} style={{ ...style, maxWidth: "none" }} />;
};

const ShotView: React.FC<{ shot: Shot; hookEnd: number; captionsEnd: number }> = ({ shot, hookEnd, captionsEnd }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, Math.max(1, shot.duration - 1)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 0, 0.45, 1),
  });
  const m = moveAt(shot.move, p, shot.intensity ?? 1);
  const punch = shot.transition === "punch"
    ? interpolate(frame, [0, 6], [1.12, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })
    : 1;
  const focus: [number, number] = [
    Math.min(1, Math.max(0, shot.focus[0] + m.dx)),
    Math.min(1, Math.max(0, shot.focus[1] + m.dy)),
  ];
  const filter = GRADE[shot.treatment] ?? GRADE.doc;

  let content: React.ReactNode;
  if (shot.kind === "graphic") {
    content = <Scene name={shot.scene as SceneName} props={shot.sceneProps ?? {}} dur={shot.duration} />;
  } else if (shot.layout === "cover") {
    content = (
      <AbsoluteFill style={{ overflow: "hidden", filter }}>
        <Media shot={shot} style={coverRect(shot.srcW, shot.srcH, shot.crop, focus, m.s * punch, W, H)} />
        {shot.highlight && <Highlight rect={shot.highlight} place={coverRect(shot.srcW, shot.srcH, shot.crop, focus, m.s * punch, W, H)} />}
      </AbsoluteFill>
    );
    if (shot.callout) {
      content = (<>
        {content}
        <AbsoluteFill><CalloutMark c={shot.callout} place={coverRect(shot.srcW, shot.srcH, shot.crop, focus, m.s * punch, W, H)} /></AbsoluteFill>
      </>);
    }
  } else {
    // contain_blur: full-width foreground panel over a blurred, darkened fill of the same image.
    const [, , cwn, chn] = shot.crop ?? [0, 0, 1, 1];
    const aspect = (cwn * shot.srcW) / (chn * shot.srcH);
    let bw = W;
    let bh = W / aspect;
    if (bh > PANEL_MAX_H) { bh = PANEL_MAX_H; bw = bh * aspect; }
    // Stack: hook/labels above, panel bottom pinned just above the caption band, captions below.
    // While the hook text is on screen, keep the panel below it (hook block ends ~y 480).
    const topMin = shot.from < hookEnd ? HOOK_BOTTOM : PANEL_TOP_MIN;
    if (bh > PANEL_BOTTOM - topMin) { bh = PANEL_BOTTOM - topMin; bw = bh * aspect; }
    const bx2 = (W - bw) / 2;
    const by = Math.max(topMin, PANEL_BOTTOM - bh);
    content = (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {/* video: the fill is the SAME footage, live + blurred, so the whole frame moves (v10/v11 panel:
            a frozen dark fill read as a "smudge"; full-frame 352px CCTV turned her into a blur) */}
        <AbsoluteFill style={{ filter: shot.kind === "video" ? "blur(28px) brightness(0.85) saturate(1.1)" : "blur(34px) brightness(0.66) saturate(0.95)", transform: "scale(1.2)" }}>
          <Media shot={shot} still={shot.kind !== "video"} style={coverRect(shot.srcW, shot.srcH, shot.crop, [0.5, 0.5], 1, W, H)} />
        </AbsoluteFill>
        <div style={{
          position: "absolute", left: bx2, top: by, width: bw, height: bh, overflow: "hidden",
          filter, boxShadow: "0 30px 80px rgba(0,0,0,0.65)", transform: `scale(${punch})`,
        }}>
          <Media shot={shot} style={coverRect(shot.srcW, shot.srcH, shot.crop, focus, m.s, bw, bh)} />
          {shot.highlight && <Highlight rect={shot.highlight} place={coverRect(shot.srcW, shot.srcH, shot.crop, focus, m.s, bw, bh)} />}
          {shot.treatment === "cctv" && (
            <AbsoluteFill style={{
              background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 2px, transparent 2px, transparent 5px)",
            }} />
          )}
        </div>
        {shot.callout && (
          // same box + punch as the panel, but ungraded and unclipped so the ring keeps its red and its shadow
          <div style={{ position: "absolute", left: bx2, top: by, width: bw, height: bh, transform: `scale(${punch})` }}>
            <CalloutMark c={shot.callout} place={coverRect(shot.srcW, shot.srcH, shot.crop, focus, m.s, bw, bh)} />
          </div>
        )}
      </AbsoluteFill>
    );
  }

  const flash = shot.transition === "flash" ? interpolate(frame, [0, 4], [0.55, 0], { extrapolateRight: "clamp" }) : 0;
  const dip = shot.transition === "dip" ? interpolate(frame, [0, 9], [1, 0], { extrapolateRight: "clamp" }) : 0;
  // a "low" SOURCE line sits in the caption band, so it only appears once the last caption is gone (silent end card)
  let tagStart = shot.sourcePos === "low" ? Math.max(4, captionsEnd - shot.from + 2) : 4;
  // G2: frame 1 carries the hook only - a SOURCE line of a shot under the hook waits until the hook is gone (+4)
  if (shot.from < hookEnd) tagStart = Math.max(tagStart, hookEnd - shot.from + 4);
  const tagOp = interpolate(frame, [tagStart, tagStart + 6, Math.max(tagStart + 7, shot.duration - 4), Math.max(tagStart + 8, shot.duration)], [0, 0.9, 0.9, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {content}
      {shot.sourceTag && shot.duration > 14 && (
        <div style={{
          // top 1000, ONE line (v5 compliance C01: a wrapped 2-line credit touched 3-4-line captions starting ~1075)
          position: "absolute", left: 70, top: shot.sourcePos === "low" ? 1330 : 1000, opacity: tagOp, fontFamily: MONO_FONT, fontWeight: 700,
          fontSize: shot.sourceTag.length + 9 > 55 ? 21 : 26, color: "#F2F2F2", letterSpacing: shot.sourceTag.length + 9 > 55 ? 0 : 1,  // size on the full "SOURCE · …" line (C27)
          background: "rgba(0,0,0,0.62)", padding: "5px 12px", whiteSpace: "nowrap", maxWidth: 860, overflow: "hidden", textOverflow: "ellipsis",
        }}>SOURCE · {shot.sourceTag.toUpperCase()}</div>
      )}
      {flash > 0 && <AbsoluteFill style={{ backgroundColor: "white", opacity: flash }} />}
      {dip > 0 && <AbsoluteFill style={{ backgroundColor: "black", opacity: dip }} />}
    </AbsoluteFill>
  );
};

// Marker sweep over a normalized source rect, drawn in the same box as the media.
const Highlight: React.FC<{ rect: [number, number, number, number]; place: { left: number; top: number; width: number; height: number } }> = ({ rect, place }) => {
  const f = useCurrentFrame();
  const sweep = interpolate(f, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{
      position: "absolute", left: place.left + rect[0] * place.width, top: place.top + rect[1] * place.height,
      width: rect[2] * place.width * sweep, height: rect[3] * place.height,
      background: "rgba(255, 214, 0, 0.38)", mixBlendMode: "multiply", borderRadius: 4,
    }} />
  );
};

// G6: red evidence ring/box drawn on over ~8 frames at c.at_s, on a normalized source rect
// (same coordinate space as `highlight` / `crop`: full source picture, mapped through the media box).
export const CalloutMark: React.FC<{ c: Callout; place: { left: number; top: number; width: number; height: number }; still?: boolean }> = ({ c, place, still }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.round((c.at_s ?? 0.4) * fps);
  const p = still ? 1 : interpolate(f, [start, start + 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  if (p <= 0) return null;
  const STROKE = 8;
  const x = place.left + c.rect[0] * place.width;
  const y = place.top + c.rect[1] * place.height;
  const w = c.rect[2] * place.width;
  const h = c.rect[3] * place.height;
  const circle = c.shape !== "box";
  // an ellipse needs ~1.3x the rect to enclose it; a box gets a small margin
  const padX = circle ? w * 0.18 + 10 : 12;
  const padY = circle ? h * 0.18 + 10 : 12;
  const bx = x - padX, by = y - padY, bw = w + 2 * padX;
  let bh = h + 2 * padY;
  // v6 compliance C23/C26: a ring never reaches the SOURCE line (y 1000) or the captions below it
  if (!still && by + bh > 985) bh = Math.max(40, 985 - by);
  const m = STROKE + 20; // svg margin so stroke + shadow never clip
  const common = {
    fill: "none", stroke: RED, strokeWidth: STROKE, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p,
  };
  return (
    <svg width={bw + 2 * m} height={bh + 2 * m} style={{
      position: "absolute", left: bx - m, top: by - m, overflow: "visible",
      filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.55))",
    }}>
      {circle
        // start at 12 o'clock-ish and go clockwise, like a hand-drawn ring
        // rotate -90 so the stroke starts at 12 o'clock; rx/ry are swapped to compensate (v6: the -100° rotation
        // without the swap turned a wide rect into a tall ~590 px ring that crossed the captions)
        ? <ellipse cx={m + bw / 2} cy={m + bh / 2} rx={bh / 2} ry={bw / 2} transform={`rotate(-90 ${m + bw / 2} ${m + bh / 2})`} {...common} />
        : <rect x={m} y={m} width={bw} height={bh} rx={6} {...common} />}
    </svg>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.09, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width={W} height={H}>
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

// Caption spec: research/captions-style.md. Page is laid out in full (no reflow); each word
// appears when spoken with a 4-frame scale pop; one red keyword accent max; no active-word recolor.
// v4 user: captions a little lower. Block centre y 1250 keeps a 3-line page (~1118-1382) above the platform UI (1440).
export const CAPTION_CENTER_Y = 1250;

const Captions: React.FC<{ page: CaptionPage; centerY: number }> = ({ page, centerY }) => {
  const frame = useCurrentFrame() + page.from; // absolute frame
  const local = frame - page.from;
  const len = page.to - page.from;
  const opacity = Math.min(
    interpolate(local, [0, 2], [0.35, 1], { extrapolateRight: "clamp" }),
    page.fadeOut ? interpolate(local, [len - 4, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1,
  );
  // v7 compliance C03: a 110 px big page in an 800 px box wrapped to 4 lines and ran into the platform UI (> y 1440).
  // Big pages get the full safe width and 100 px, so 1-2 short phrases stay within 3 lines.
  const size = page.big ? 100 : 84;
  return (
    <div style={{
      position: "absolute", left: page.big ? 70 : 140, width: page.big ? 860 : 800, top: centerY, transform: "translateY(-50%)",
      textAlign: "center", textWrap: "balance", opacity,
    }}>
      {page.words.map((w, i) => {
        // v8 audience test: sound-off viewers need the whole phrase at once (no one-word frames).
        const shown = true;
        const next = page.words[i + 1]?.from ?? page.to;
        const active = frame >= w.from && frame < next;
        const pop = active ? interpolate(frame - w.from, [0, 4], [1.08, 1.03], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
        }) : 1;
        return (
          <span key={i} style={{
            fontFamily: CAPTION_FONT, fontWeight: 800, fontSize: size, lineHeight: 1.05,
            letterSpacing: "-0.01em", textTransform: "uppercase",
            color: w.emph ? "#E0342F" : active ? "#FFFFFF" : "#E9E9E9",
            WebkitTextStroke: "16px #000", paintOrder: "stroke fill",
            textShadow: "0 6px 18px rgba(0,0,0,0.55)",
            display: "inline-block", margin: "0 0.2em", opacity: shown ? 1 : 0,
            transform: `scale(${pop})`,
          }}>{w.text.replace(/[“”"]/g, "")}</span>
        );
      })}
    </div>
  );
};

// G9 "doc" preset (A/B): sentence case, Inter 600 on a soft dark box, max 2 lines, active word
// emboldened in place (stroke, no reflow), no pop, no red accent. Same centre y as the default.
const DocCaptions: React.FC<{ page: CaptionPage; centerY: number }> = ({ page, centerY }) => {
  const frame = useCurrentFrame() + page.from;
  const local = frame - page.from;
  const len = page.to - page.from;
  const opacity = Math.min(
    interpolate(local, [0, 2], [0.35, 1], { extrapolateRight: "clamp" }),
    page.fadeOut ? interpolate(local, [len - 4, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1,
  );
  const chars = page.words.reduce((n, w) => n + w.text.length + 1, 0);
  const size = chars > 34 ? 52 : 58;
  return (
    <div style={{
      position: "absolute", left: 90, width: 900, top: centerY, transform: "translateY(-50%)",
      display: "flex", justifyContent: "center", opacity,
    }}>
      <div style={{
        background: "rgba(0,0,0,0.6)", borderRadius: 18, padding: "12px 26px", textAlign: "center",
        textWrap: "balance", maxWidth: 900, fontFamily: DOC_FONT, fontWeight: 600, fontSize: size, lineHeight: 1.22,
        color: "rgba(255,255,255,0.86)",
      }}>
        {page.words.map((w, i) => {
          const next = page.words[i + 1]?.from ?? page.to;
          const active = frame >= w.from && frame < next;
          return (
            <span key={i} style={{
              color: active ? "#FFFFFF" : undefined,
              WebkitTextStroke: active ? "1.4px #FFFFFF" : undefined,
            }}>{w.text.replace(/[“”"]/g, "")}{i < page.words.length - 1 ? " " : ""}</span>
          );
        })}
      </div>
    </div>
  );
};

const ChannelMark: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", left: 64, top: 150, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 26,
      color: "white", letterSpacing: 2, textTransform: "uppercase",
      opacity: 0.7 * interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
    }}>{text}</div>
  );
};

const Hook: React.FC<{ o: Overlay; top: number }> = ({ o, top }) => {
  const f = useCurrentFrame();
  const len = o.to - o.from;
  // Fully visible from frame 0 (the first frame is the thumbnail on some feeds); only a short settle-in slide.
  const inT = 1;
  const slide = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [len - 6, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", top: top + (1 - slide) * -18, left: 90, right: 90, textAlign: "center",
      opacity: Math.min(inT, out), textWrap: "balance",
    }}>
      <span style={{
        fontFamily: HOOK_FONT, fontSize: 96, lineHeight: 1.42, color: "white", textTransform: "uppercase",
        background: "rgba(10,10,10,0.78)", padding: "4px 22px", boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone", borderLeft: "10px solid #E5322D",
      }}>{o.text}</span>
    </div>
  );
};

// Big pull-quote (documents): the key line in readable type over the page.
const Pull: React.FC<{ o: Overlay; top: number }> = ({ o, top }) => {
  const f = useCurrentFrame();
  const len = o.to - o.from;
  const op = Math.min(interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(f, [len - 5, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ position: "absolute", top, left: 80, right: 150, opacity: op,
      transform: `translateY(${interpolate(f, [0, 8], [16, 0], { extrapolateRight: "clamp" })}px)` }}>
      <span style={{ fontFamily: HOOK_FONT, fontSize: 76, lineHeight: 1.15, color: "#111", background: "#FFD600",
        padding: "4px 18px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", textTransform: "uppercase" }}>{o.text}</span>
    </div>
  );
};

const Label: React.FC<{ o: Overlay; top: number; left: number }> = ({ o, top, left }) => {
  const f = useCurrentFrame();
  const len = o.to - o.from;
  const chars = o.text.length;  // labels appear whole (v17/v18: half-typed "MISSING 1…" / "ELISA LAM · 199" read as errors)
  const out = interpolate(f, [len - 5, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top, left, opacity: Math.min(out, interpolate(f, [0, 5], [0, 1], { extrapolateRight: "clamp" })), display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 16, height: 16, background: "#E5322D", opacity: f % 30 < 18 ? 1 : 0.3 }} />
      <span style={{
        fontFamily: MONO_FONT, fontWeight: 700, fontSize: 38, color: "white", letterSpacing: 2,
        textTransform: "uppercase", background: "rgba(0,0,0,0.62)", padding: "8px 16px",
      }}>{o.text.slice(0, chars)}</span>
    </div>
  );
};

export const ShortVideo: React.FC<ShortProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shots, captions, overlays, safe, durationInFrames } = timeline;
  const CaptionView = timeline.captionStyle === "doc" ? DocCaptions : Captions;
  const markFrom = Math.max(1, Math.round(4 * fps));
  const hookEnd = overlays.find((o) => o.kind === "hook")?.to ?? 0;
  const captionsEnd = captions.reduce((m, c) => Math.max(m, c.to), 0);
  const endFade = timeline.endFade === false ? 0 : interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {shots.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.duration} premountFor={30}>
          <ShotView shot={s} hookEnd={hookEnd} captionsEnd={captionsEnd} />
        </Sequence>
      ))}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 18%, transparent 52%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.2) 100%)" }} />
      <Grain />
      {overlays.map((o, i) => {
        // "low" labels share the caption band: they wait until the voice (and its captions) has ended
        const from = o.kind === "label" ? Math.max(o.from, hookEnd, o.pos === "low" ? captionsEnd + 2 : 0) : o.from;
        if (o.to - from < 12) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={o.to - from}>
            {o.kind === "hook"
              ? <Hook o={{ ...o, from }} top={safe.top + 20} />
              : o.style === "pull"
              ? <Pull o={{ ...o, from }} top={safe.top + 30} />
              : <Label o={{ ...o, from }} top={o.pos === "low" ? 1250 : safe.top + 20} left={safe.left + 10} />}
          </Sequence>
        );
      })}
      {captions.map((p, i) => (
        <Sequence key={i} from={p.from} durationInFrames={Math.max(1, p.to - p.from)}>
          <CaptionView page={p} centerY={CAPTION_CENTER_Y} />
        </Sequence>
      ))}
      {timeline.channelMark && durationInFrames > markFrom && (
        <Sequence from={markFrom} durationInFrames={durationInFrames - markFrom}>
          <ChannelMark text={timeline.channelMark} />
        </Sequence>
      )}
      {endFade > 0 && <AbsoluteFill style={{ backgroundColor: "black", opacity: endFade }} />}
    </AbsoluteFill>
  );
};
