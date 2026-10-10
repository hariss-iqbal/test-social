import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { loadFont as loadSerif } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import type { HudItem, WhatIfProps, WhatIfTimeline } from "./types";
import { sampleAll, sampleCamera, simTimeTable, type CamState, type ParamValues } from "./world/params";
import { Sky, SUN_DIR } from "./world/Sky";
import { City } from "./world/City";
import { IceGlints, Snow } from "./world/Particles";
import { Cosmic, earthPosition, shellAnchor } from "./world/Cosmic";
import { REAL_KITS, type KitOpts } from "./real/Kits";

const serif = loadSerif("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
loadSerif("italic", { weights: ["400", "500"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;
const mono = loadMono("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

const KITS: Record<string, React.FC<{ p: ParamValues; seed: number; simT: number }>> = { city: City };

/** Applies a pose to the default R3F camera every frame (Remotion renders each frame independently). */
const CameraRig: React.FC<{ cam: CamState; follow?: THREE.Vector3 | null; shake: number; frame: number; quake?: number }> = ({ cam, follow, shake, frame, quake = 0 }) => {
  const c = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  const o = follow ?? new THREE.Vector3();
  // subtle handheld breathing so the POV feels like a person, not a drone
  const sx = Math.sin(frame * 0.051) * 0.6 + Math.sin(frame * 0.137) * 0.3;
  const sy = Math.sin(frame * 0.043 + 1.3) * 0.5 + Math.sin(frame * 0.11) * 0.25;
  const dist = Math.hypot(cam.target[0] - cam.pos[0], cam.target[1] - cam.pos[1], cam.target[2] - cam.pos[2]);
  c.near = Math.max(0.05, Math.min(5, cam.pos[1] * 0.01));
  c.far = 9000;
  c.fov = cam.fov;
  const qa = quake * Math.max(0.15, Math.min(3, cam.pos[1] * 0.08));
  const qx = (Math.sin(frame * 2.31) + Math.sin(frame * 5.17) * 0.5) * qa * 0.25, qy = (Math.sin(frame * 3.07 + 1) + Math.sin(frame * 6.3) * 0.5) * qa * 0.2;
  c.position.set(cam.pos[0] + o.x + qx, cam.pos[1] + o.y + qy, cam.pos[2] + o.z);
  c.lookAt(cam.target[0] + o.x + sx * shake * dist * 0.0015, cam.target[1] + o.y + sy * shake * dist * 0.0015, cam.target[2] + o.z);
  c.updateProjectionMatrix();
  return null;
};

const LocalScene: React.FC<{ tl: WhatIfTimeline; p: ParamValues; cam: CamState; simT: number; frame: number }> = ({ tl, p, cam, simT, frame }) => {
  const Kit = KITS[tl.kit] ?? City;
  const sunI = p.sky_sun * p.day;
  const fogColor = new THREE.Color().setRGB(0.012, 0.016, 0.035).lerp(new THREE.Color(0.7, 0.82, 0.94), p.day).lerp(new THREE.Color(1, 0.62, 0.4), p.sunset * p.day * 0.6);
  const sunPos = SUN_DIR.clone().multiplyScalar(400).add(new THREE.Vector3(cam.pos[0], 0, cam.pos[2]));
  return (
    <>
      <CameraRig cam={cam} shake={cam.pos[1] < 5 ? 1 : 0.2} frame={frame} quake={p.shake} />
      {/* fog thins with altitude so a rising camera fades toward the sky, not into grey soup */}
      <fog attach="fog" args={[fogColor.clone().lerp(new THREE.Color("#0b1630"), Math.min(1, cam.pos[1] / 1500)).lerp(new THREE.Color("#8a7c68").multiplyScalar(0.35 + 0.65 * p.day), p.dust * 0.85), (120 + cam.pos[1] * 1.5) * (1 - 0.9 * p.dust), (1700 + 1500 * (1 - p.day) + cam.pos[1] * 4) * (1 - 0.8 * p.dust)]} />
      {/* night stays readable (stylised starlight); frost/snow bounce more of it */}
      <ambientLight intensity={(0.3 + 0.28 * p.day + 0.3 * p.frost * (1 - p.day)) * p.exposure} color={p.day > 0.3 ? "#cfe0ff" : "#7d93d6"} />
      <hemisphereLight args={["#bcd6ff", "#5a5040", 0.55 * p.day * p.exposure]} />
      <directionalLight
        position={sunPos}
        target-position={[cam.pos[0], 0, cam.pos[2] - 40]}
        intensity={2.4 * sunI * p.exposure * (1 + 0.6 * p.uv) * (1 - 0.6 * p.sky_dim)}
        color={p.sunset > 0.3 ? "#ffb27a" : "#fff4e2"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-far={1200}
        shadow-bias={-0.0004}
      />
      <Sky p={p} seed={tl.seed} simT={simT} />
      <Kit p={p} seed={tl.seed} simT={simT} />
      <Snow p={p} seed={tl.seed} simT={simT} center={cam.pos} />
      <IceGlints p={p} seed={tl.seed} frame={frame} center={cam.pos} />
    </>
  );
};

/** Realistic kits: HDRI-lit places with scanned models and animated people/animals (src/whatif/real). */
const RealLocalScene: React.FC<{ tl: WhatIfTimeline; p: ParamValues; cam: CamState; simT: number; frame: number }> = ({ tl, p, cam, simT, frame }) => {
  const Kit = REAL_KITS[tl.kit];
  return (
    <>
      <CameraRig cam={cam} shake={cam.pos[1] < 5 ? 0.6 : 0.15} frame={frame} quake={p.shake} />
      <Kit p={p} seed={tl.seed} simT={simT} t={frame / tl.fps} actors={tl.actors ?? []} opts={tl.kitOpts as KitOpts | undefined} />
    </>
  );
};

const CosmicScene: React.FC<{ tl: WhatIfTimeline; p: ParamValues; cam: CamState; simT: number; frame: number }> = ({ tl, p, cam, simT, frame }) => (
  <>
    <CameraRig cam={cam} shake={0.15} frame={frame} quake={p.shake * 0.3} />
    <Cosmic p={p} seed={tl.seed} simT={simT} />
  </>
);

// ---------- 2D overlays ----------

// fast clocks (time-lapse) drop the milliseconds: at 60x they would only ever show .000
const fmtClock = (s: number, ms = true) => {
  const neg = s < 0;
  s = Math.abs(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  const sec = s - h * 3600 - m * 60;
  const ss = ms && h === 0 ? sec.toFixed(1).padStart(4, "0") : String(Math.floor(sec)).padStart(2, "0");
  return `${neg ? "-" : ""}${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${ss}`;
};

const hudValue = (h: HudItem, frame: number, fps: number) => {
  const v = h.value;
  const t = (frame - h.from) / fps;
  if (v.kind === "countdown") return `${v.prefix ?? ""}${fmtClock(Math.max(0, v.start_s - t * v.rate), v.rate < 10)}`;
  if (v.kind === "counter") {
    const k = Math.min(1, Math.max(0, (frame - h.from) / Math.max(1, h.to - h.from)));
    const e = v.ease === "linear" ? k : 1 - (1 - k) ** 2;
    const x = v.from_v + (v.to_v - v.from_v) * e;
    const s = x.toLocaleString("en-US", { minimumFractionDigits: v.decimals ?? 0, maximumFractionDigits: v.decimals ?? 0 });
    // "1 WEEKS" -> "1 WEEK"
    const unit = v.unit && s === "1" && /S$/i.test(v.unit) && !/^(S|MIN|H|KM\/S)$/i.test(v.unit) ? v.unit.slice(0, -1) : v.unit;
    return `${s}${unit ? ` ${unit}` : ""}`;
  }
  return v.text;
};

const Hud: React.FC<{ tl: WhatIfTimeline; frame: number }> = ({ tl, frame }) => {
  const items = tl.hud.filter((h) => frame >= h.from && frame < h.to);
  return (
    <div style={{ position: "absolute", left: 72, top: 600, display: "flex", flexDirection: "column", gap: 34 }}>
      {items.map((h, i) => {
        const fade = Math.min(1, h.joinPrev ? 1 : (frame - h.from) / 8, h.joinNext ? 1 : (h.to - frame) / 8);
        const sub = [...(h.subs ?? [])].reverse().find(([f]) => frame >= f)?.[1] ?? h.sub;
        return (
          <div key={i} style={{ opacity: fade, color: "#f7f4ee", background: "rgba(8,10,16,0.55)", borderLeft: "6px solid #ffcf6e", borderRadius: 10, padding: "18px 26px 20px 24px", maxWidth: 900, boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}>
            <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: "#ffcf6e" }}>{h.label}</div>
            <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 80, lineHeight: 1.02, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{hudValue(h, frame, tl.fps)}</div>
            {sub && <div style={{ fontFamily: inter, fontWeight: 600, fontSize: 32, letterSpacing: 1.5, opacity: 0.95, marginTop: 10, lineHeight: 1.3 }}>{sub}</div>}
          </div>
        );
      })}
    </div>
  );
};

/** Lower-third card: WHO (amber, small) / WHAT HAPPENS (large sentence) / WHY (small). */
const HudBottom: React.FC<{ tl: WhatIfTimeline; frame: number }> = ({ tl, frame }) => {
  const h = tl.hud.find((x) => frame >= x.from && frame < x.to);
  if (!h) return null;
  const fade = Math.min(1, h.joinPrev ? 1 : (frame - h.from) / 8, h.joinNext ? 1 : (h.to - frame) / 8);
  const rise = interpolate(frame - h.from, [0, 10], [h.joinPrev ? 0 : 16, 0], { extrapolateRight: "clamp" });
  const sub = [...(h.subs ?? [])].reverse().find(([f]) => frame >= f)?.[1] ?? h.sub;
  return (
    <div style={{ position: "absolute", left: 56, right: 56, top: 1270, opacity: fade, transform: `translateY(${rise}px)` }}>
      <div style={{ background: "rgba(8,10,16,0.66)", borderRadius: 22, padding: "26px 34px 30px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 32, letterSpacing: 3.5, color: "#ffcf6e" }}>{h.label}</div>
        <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 70, lineHeight: 1.08, color: "#fffdf8", marginTop: 8 }}>{hudValue(h, frame, tl.fps)}</div>
        {sub && <div style={{ fontFamily: inter, fontWeight: 500, fontSize: 36, lineHeight: 1.3, color: "rgba(247,244,238,0.86)", marginTop: 14 }}>{sub}</div>}
      </div>
    </div>
  );
};

/** Slowed countdown: label, big number, 1-second segments filling with the story clock. */
const Clock: React.FC<{ tl: WhatIfTimeline; frame: number }> = ({ tl, frame }) => {
  const items = tl.clock ?? [];
  const c = items.find((x) => frame >= x.from && frame < x.to);
  if (!c) return null;
  const i = items.indexOf(c);
  const joinedPrev = i > 0 && items[i - 1].to === c.from;
  const joinedNext = i + 1 < items.length && items[i + 1].from === c.to;
  const fade = Math.min(1, joinedPrev ? 1 : (frame - c.from) / 8, joinedNext ? 1 : (c.to - frame) / 8);
  const k = (frame - c.from) / Math.max(1, c.to - c.from);
  const s = c.s0 + (c.s1 - c.s0) * k;
  const segs = Math.round(c.total_s);
  const back = c.n === "0";
  return (
    <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: fade }}>
      <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 34, letterSpacing: 4, color: back ? "#8ff0b0" : "#ffcf6e", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>{c.label}</div>
      {/* time left with milliseconds: in slow motion the digits crawl, so the stretch is felt */}
      <div style={{ fontFamily: mono, fontWeight: 400, fontSize: 168, lineHeight: 1.1, color: "#fffdf8", textShadow: "0 6px 40px rgba(0,0,0,0.6)", marginTop: 10, letterSpacing: -4 }}>
        {Math.max(0, c.total_s - s).toFixed(3)}<span style={{ fontSize: 70, letterSpacing: 0, marginLeft: 14 }}>s</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {Array.from({ length: segs }, (_, j) => {
          const f = Math.max(0, Math.min(1, s - j));
          return (
            <div key={j} style={{ width: 128, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.28)", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}>
              <div style={{ width: `${f * 100}%`, height: "100%", background: back ? "#8ff0b0" : "#ffcf6e" }} />
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: mono, fontSize: 30, color: "rgba(255,253,248,0.92)", marginTop: 14, letterSpacing: 1.5, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
        {c.slow ?? (back ? "BACK TO NORMAL SPEED" : "")}
      </div>
    </div>
  );
};

/** Ladder of milestones (e.g. how long a person lasts without oxygen); the "now" row is green, the rest redden with danger. */
const Meter: React.FC<{ tl: WhatIfTimeline; frame: number }> = ({ tl, frame }) => {
  const m = (tl.meters ?? []).find((x) => frame >= x.from && frame < x.to);
  if (!m) return null;
  const fade = Math.min(1, (frame - m.from) / 8, (m.to - frame) / 8);
  return (
    <div style={{ position: "absolute", left: 56, right: 56, top: 590, opacity: fade }}>
      <div style={{ background: "rgba(8,10,16,0.72)", borderRadius: 22, padding: "26px 34px 18px" }}>
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: "#ffcf6e", marginBottom: 10 }}>{m.title}</div>
        {m.rows.map((r, j) => {
          const appear = Math.min(1, Math.max(0, (frame - m.from - 10 - j * 12) / 8));
          const col = r.now ? "#8ff0b0" : `rgb(255,${Math.round(225 - 150 * (r.danger ?? 0))},${Math.round(190 - 140 * (r.danger ?? 0))})`;
          return (
            <div key={j} style={{ display: "flex", alignItems: "center", gap: 22, padding: "12px 0", borderTop: j ? "1px solid rgba(255,255,255,0.12)" : "none", opacity: appear, transform: `translateX(${(1 - appear) * 30}px)` }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: col, boxShadow: r.now ? "0 0 18px #8ff0b0" : "none", flex: "none" }} />
              <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 54, color: col, width: 220, flex: "none", fontVariantNumeric: "tabular-nums" }}>{r.time}</div>
              <div style={{ fontFamily: inter, fontWeight: r.now ? 700 : 500, fontSize: 36, color: r.now ? "#eafff1" : "rgba(247,244,238,0.9)", lineHeight: 1.2 }}>{r.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Aftermath timeline: big active milestone + a dotted line of all milestones. */
const Strip: React.FC<{ tl: WhatIfTimeline; frame: number }> = ({ tl, frame }) => {
  const st = (tl.strips ?? []).find((x) => frame >= x.from && frame < x.to);
  if (!st) return null;
  const fade = Math.min(1, (frame - st.from) / 8, (st.to - frame) / 8);
  const key = [...st.keys].reverse().find(([f]) => frame >= f) ?? st.keys[0];
  const active = key[1];
  const pop = interpolate(frame - key[0], [0, 6, 12], [1.15, 0.97, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const big = [...(st.big ?? [])].reverse().find(([f]) => frame >= f)?.[1] ?? st.marks[active];
  return (
    <div style={{ position: "absolute", top: 170, left: 56, right: 56, opacity: fade, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 132, lineHeight: 1, color: "#fffdf8", transform: `scale(${pop})`, textShadow: "0 6px 34px rgba(0,0,0,0.65)" }}>{big}</div>
      <div style={{ position: "relative", width: "100%", height: 90, marginTop: 34 }}>
        <div style={{ position: "absolute", left: 40, right: 40, top: 16, height: 4, background: "rgba(255,255,255,0.45)", borderRadius: 2 }} />
        {st.marks.map((mk, j) => {
          const x = st.marks.length === 1 ? 50 : (j / (st.marks.length - 1)) * 100;
          const on = j === active, past = j < active;
          return (
            <div key={j} style={{ position: "absolute", left: `calc(40px + (100% - 80px) * ${x / 100})`, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: on ? 36 : 22, height: on ? 36 : 22, marginTop: on ? 0 : 7, borderRadius: 18, background: on ? "#ffcf6e" : past ? "#fffdf8" : "rgba(255,255,255,0.4)", boxShadow: on ? "0 0 20px #ffcf6e" : "0 2px 8px rgba(0,0,0,0.4)" }} />
              <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 26, letterSpacing: 1.5, color: on ? "#ffcf6e" : "rgba(255,253,248,0.9)", marginTop: 10, whiteSpace: "nowrap", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>{mk}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Captions: React.FC<{ tl: WhatIfTimeline; frame: number }> = ({ tl, frame }) => {
  if (tl.endCard && frame >= tl.endCard.from) return null;
  const c = tl.captions.find((x) => frame >= x.from && frame < x.to);
  if (!c) return null;
  const fade = Math.min(1, (frame - c.from) / 9, (c.to - frame) / 9);
  const rise = interpolate(frame - c.from, [0, 12], [10, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 1150, textAlign: "center", opacity: fade, transform: `translateY(${rise}px)` }}>
      <span style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 64, lineHeight: 1.3, color: "#fffdf8", background: "rgba(8,10,16,0.42)", padding: "6px 22px", borderRadius: 14, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>{c.text}</span>
    </div>
  );
};

const Title: React.FC<{ card: WhatIfTimeline["title"]; frame: number; solid?: boolean }> = ({ card, frame, solid }) => {
  if (!card || frame < card.from || frame >= card.to) return null;
  const fade = Math.min(1, card.from === 0 ? 1 : (frame - card.from) / 10, (card.to - frame) / 12);
  const parts = card.keyword ? card.text.split(card.keyword) : [card.text];
  return (
    <AbsoluteFill style={{ background: solid ? "#101113" : "transparent", opacity: solid ? Math.min(1, (frame - card.from) / 10) : 1 }}>
      <div style={{ position: "absolute", left: 70, right: 70, top: solid ? 760 : 360, textAlign: "center", opacity: fade }}>
        <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 96, lineHeight: 1.12, color: "#fffdf8", textShadow: solid ? "none" : "0 3px 26px rgba(0,0,0,0.75), 0 0 8px rgba(0,0,0,0.45)" }}>
          {parts[0]}
          {card.keyword && <span style={{ color: "#ffcf6e" }}>{card.keyword}</span>}
          {parts[1]}
        </div>
        {card.sub && <div style={{ fontFamily: mono, fontSize: 30, letterSpacing: 2.5, color: "rgba(244,240,232,0.85)", marginTop: 38, textTransform: "uppercase", lineHeight: 1.7, whiteSpace: "pre-line" }}>{card.sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

export const WhatIfVideo: React.FC<WhatIfProps> = ({ timeline: tl }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const simTable = useMemo(() => simTimeTable(tl.params, tl.durationInFrames, tl.fps), [tl]);
  const p = sampleAll(tl.params, frame);
  const simT = simTable[Math.min(frame, simTable.length - 1)];
  // Earth-following poses are resolved to absolute positions at the current frame, so glides between
  // "follow Earth" and fixed poses stay smooth while the Earth moves.
  const anchors = { earth: earthPosition(p).toArray(), shell: shellAnchor(p).toArray() };
  const camKeys = tl.camera.map(([f, pose, e]) => {
    if (!pose.follow) return [f, pose, e];
    const o = anchors[pose.follow];
    return [f, { ...pose, follow: null, pos: pose.pos.map((x, i) => x + o[i]), target: pose.target.map((x, i) => x + o[i]) }, e];
  }) as typeof tl.camera;
  const { a, b } = sampleCamera(camKeys, frame);
  const local = a.space === "local" ? a : b?.space === "local" ? b : null;
  const cosmic = a.space === "cosmic" ? a : b?.space === "cosmic" ? b : null;
  // crossfade weight of the cosmic layer (a -> b transition): b is the destination
  const cosmicW = !b ? (a.space === "cosmic" ? 1 : 0) : b.space === "cosmic" ? b.blend : 1 - b.blend;
  const flash = tl.flashes.reduce((acc, f) => {
    const t = (frame - f.at) / f.dur;
    if (t < 0 || t > 1) return acc;
    return { color: f.color, o: Math.max(acc.o, (f.peak ?? 1) * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85)) };
  }, { color: "#fff", o: 0 });
  const endCardOn = tl.endCard && tl.endCard.solid !== false && frame >= tl.endCard.from;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {local && cosmicW < 1 && !endCardOn && (
        <AbsoluteFill style={{ opacity: 1 - cosmicW }}>
          <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
            {REAL_KITS[tl.kit] ? <RealLocalScene tl={tl} p={p} cam={local} simT={simT} frame={frame} /> : <LocalScene tl={tl} p={p} cam={local} simT={simT} frame={frame} />}
          </ThreeCanvas>
        </AbsoluteFill>
      )}
      {cosmic && cosmicW > 0 && !endCardOn && (
        <AbsoluteFill style={{ opacity: cosmicW }}>
          <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
            <CosmicScene tl={tl} p={p} cam={cosmic} simT={simT} frame={frame} />
          </ThreeCanvas>
        </AbsoluteFill>
      )}
      {/* soft vignette for text legibility */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)" }} />
      {p.uv > 0.01 && (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 75% 8%, rgba(245,238,255,1) 0%, rgba(215,200,255,0.6) 30%, rgba(190,170,255,0.15) 65%, rgba(180,160,255,0) 85%)", opacity: p.uv * 0.85 * (1 - cosmicW), mixBlendMode: "screen" }} />
      )}
      {p.dust > 0.01 && (
        <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(150,132,105,0.95) 0%, rgba(150,132,105,0.6) 45%, rgba(150,132,105,0.15) 100%)", opacity: p.dust * 0.75 * (1 - cosmicW) }} />
      )}
      {p.rewind > 0.01 && (
        <AbsoluteFill style={{ opacity: p.rewind, background: `repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 2px, transparent 2px, transparent ${7 + (frame % 5)}px)`, mixBlendMode: "screen", transform: `translateX(${Math.sin(frame * 1.7) * 12 * p.rewind}px)` }} />
      )}
      {Math.abs(p.grade) > 0.01 && (
        <AbsoluteFill style={{ background: p.grade > 0 ? "#ffb35c" : "#3d6bff", opacity: Math.abs(p.grade) * 0.22, mixBlendMode: "soft-light" }} />
      )}
      {p.grain > 0.01 && (
        <AbsoluteFill style={{ opacity: 0.09 * p.grain, mixBlendMode: "overlay", backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='${frame % 50}'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")` }} />
      )}
      {(tl.tags ?? []).filter((g) => frame >= g.from && frame < g.to).map((g, i) => (
        <div key={i} style={{ position: "absolute", top: 240, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, (frame - g.from) / 8, (g.to - frame) / 8) }}>
          <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: "#101114", background: g.text.includes("2") ? "#ff8a5c" : "#9fd8ff", padding: "10px 24px", borderRadius: 999 }}>{g.text}</div>
        </div>
      ))}
      {tl.hudStyle === "bottom" ? <HudBottom tl={tl} frame={frame} /> : <Hud tl={tl} frame={frame} />}
      {((tl.clock ?? []).some((c) => frame >= c.from && frame < c.to) || (tl.strips ?? []).some((c) => frame >= c.from && frame < c.to)) && (
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 22%, rgba(0,0,0,0) 38%)" }} />
      )}
      <Clock tl={tl} frame={frame} />
      <Strip tl={tl} frame={frame} />
      <Meter tl={tl} frame={frame} />
      <Captions tl={tl} frame={frame} />
      <Title card={tl.title} frame={frame} />
      {flash.o > 0 && <AbsoluteFill style={{ background: flash.color, opacity: flash.o }} />}
      <Title card={tl.endCard} frame={frame} solid={tl.endCard?.solid !== false} />
    </AbsoluteFill>
  );
};
