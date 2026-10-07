// Animated illustrated scenes: our own motion-graphic assets (no stock, no AI images of real people).
// All text stays inside the caption-safe box (x 64-930, y 230-1050); SOURCE line at y 1040; captions sit at y≈1120-1380 (centre 1250).
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: DISPLAY } = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: SERIF } = loadSerif("italic", { weights: ["600"], subsets: ["latin"] });
const { fontFamily: MONO } = loadMono("normal", { weights: ["700"], subsets: ["latin"] });

const AMBER = "#D4A841";
const RED = "#E0342F";
const PAPER = "#EDE6D6";
const INK = "#1b1b1f";

export type SceneName = "judge" | "stamp" | "hatch" | "faucet" | "counter" | "route" | "pills" | "tanklevel"
  | "pinmap" | "dnaprofile" | "wanted" | "swab" | "evidence";
export interface SceneProps { [k: string]: unknown }

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Slow camera drift shared by all scenes so nothing is ever static.
const Drift: React.FC<{ children: React.ReactNode; dur: number; shake?: number }> = ({ children, dur, shake = 0 }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], [1.0, 1.06], clamp);
  const sx = shake ? Math.sin(f * 2.3) * shake : 0;
  const sy = shake ? Math.cos(f * 1.7) * shake : 0;
  return <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${s})` }}>{children}</AbsoluteFill>;
};

const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(0,0,0,0.85) 100%)" }} />
);

// Text revealed line by line with a soft rise.
const Lines: React.FC<{ lines: string[]; start: number; step: number; style: React.CSSProperties }> = ({ lines, start, step, style }) => {
  const f = useCurrentFrame();
  return (
    <>
      {lines.map((l, i) => {
        const t = f - start - i * step;
        return (
          <div key={i} style={{
            ...style, opacity: interpolate(t, [0, 6], [0, 1], clamp),
            transform: `translateY(${interpolate(t, [0, 8], [18, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px)`,
          }}>{l}</div>
        );
      })}
    </>
  );
};

// ---------- judge: courtroom, robed silhouette at the bench, gavel strike ----------
const Judge: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const hit = Number(p.hit_frame ?? 14);
  const lift = interpolate(f, [0, hit - 6, hit], [-10, -48, 4], { ...clamp, easing: Easing.in(Easing.quad) });
  const bounce = f > hit ? -8 * Math.exp(-(f - hit) / 3) * Math.abs(Math.sin((f - hit) / 1.5)) : 0;
  const shake = f >= hit && f < hit + 6 ? 5 : 0;
  const flash = interpolate(f, [hit, hit + 5], [0.35, 0], clamp);
  const quote = String(p.quote ?? "");
  const words = quote.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > 26) { lines.push(cur.trim()); cur = w; } else cur += " " + w; }
  if (cur.trim()) lines.push(cur.trim());
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#22160d 0%,#3a2616 45%,#1a110a 100%)" }}>
      <Drift dur={dur} shake={shake}>
        {/* wood panelling */}
        <AbsoluteFill style={{ background: "repeating-linear-gradient(90deg, rgba(255,200,140,0.035) 0 70px, rgba(0,0,0,0.12) 70px 74px)" }} />
        {/* court seal */}
        <svg width={1080} height={1920} style={{ position: "absolute", opacity: 0.24 }}>
          <circle cx={540} cy={620} r={250} fill="none" stroke={AMBER} strokeWidth={6} />
          <circle cx={540} cy={620} r={225} fill="none" stroke={AMBER} strokeWidth={2} />
          <line x1={540} y1={470} x2={540} y2={760} stroke={AMBER} strokeWidth={8} />
          <line x1={420} y1={520} x2={660} y2={520} stroke={AMBER} strokeWidth={8} />
          <path d="M420 520 L380 620 L460 620 Z M660 520 L620 620 L700 620 Z" fill="none" stroke={AMBER} strokeWidth={5} />
          <path d="M370 620 Q420 660 470 620 M610 620 Q660 660 710 620" fill="none" stroke={AMBER} strokeWidth={5} />
        </svg>
        {/* judge silhouette: head, robe, collar */}
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <ellipse cx={540} cy={690} rx={78} ry={92} fill="#050303" />
          <path d="M330 1010 Q360 800 540 790 Q720 800 750 1010 Z" fill="#050303" />
          <path d="M505 792 L540 850 L575 792" fill="none" stroke="#2a2a2a" strokeWidth={6} />
          {/* bench */}
          <rect x={120} y={930} width={840} height={180} rx={10} fill="url(#wood)" />
          <rect x={120} y={918} width={840} height={24} rx={6} fill="#6b4424" />
          <defs>
            <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5a3a20" /><stop offset="1" stopColor="#2c1a0d" />
            </linearGradient>
          </defs>
          {/* sound block + gavel */}
          <rect x={690} y={892} width={110} height={30} rx={8} fill="#3d2513" />
          <g transform={`translate(745 ${880 + bounce}) rotate(${lift} 60 0)`}>
            <rect x={-10} y={-8} width={150} height={16} rx={8} fill="#7a4e2a" />
            <rect x={-60} y={-34} width={70} height={68} rx={12} fill="#8a5a31" />
            <rect x={-60} y={-34} width={12} height={68} rx={4} fill="#a8733f" />
          </g>
        </svg>
      </Drift>
      <AbsoluteFill style={{ background: `rgba(255,236,200,${flash})` }} />
      <Vignette />
      {/* quote over a dark scrim at the top */}
      <div style={{ position: "absolute", top: 250, left: 90, right: 150, padding: "26px 30px", background: "rgba(8,5,3,0.72)", borderLeft: `8px solid ${AMBER}` }}>
        <Lines lines={lines} start={hit - 2} step={4} style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 58, lineHeight: 1.18, color: "#F5EEDF" }} />
        <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 26, color: AMBER, letterSpacing: 2, opacity: interpolate(f, [hit + 10, hit + 18], [0, 1], clamp) }}>
          {String(p.attribution ?? "")}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- stamp: document on a desk, ruling stamp slams ----------
const Stamp: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hit = Number(p.hit_frame ?? 16);
  const rows = (p.rows as { label: string; value: string }[]) ?? [];
  const slide = interpolate(f, [0, 8], [-160, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const s = spring({ frame: f - hit + 4, fps, config: { damping: 11, mass: 0.6 } });
  const stampScale = interpolate(s, [0, 1], [1.5, 1]);  // v17: the big rubber-stamp slam read as a movie prop
  const stampOp = interpolate(f, [hit - 4, hit - 1], [0, 1], clamp);
  const shake = f >= hit && f < hit + 5 ? 4 : 0;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #2a2622 0%, #0d0c0b 75%)" }}>
      <Drift dur={dur} shake={shake}>
        <div style={{
          position: "absolute", left: 130, top: 250 + slide, width: 820, height: 780, background: PAPER,
          transform: "rotate(-2.2deg)", boxShadow: "0 40px 90px rgba(0,0,0,0.7)", padding: "44px 52px",
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0 2px, transparent 2px 38px)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 30, color: INK, letterSpacing: 3 }}>{String(p.header ?? "")}</div>
          <div style={{ fontFamily: MONO, fontSize: 22, color: "#555", marginTop: 6 }}>{String(p.subheader ?? "")}</div>
          <div style={{ height: 3, background: INK, margin: "18px 0 26px" }} />
          {rows.map((r, i) => (
            <div key={i} style={{ marginBottom: 22, opacity: interpolate(f, [4 + i * 3, 9 + i * 3], [0, 1], clamp) }}>
              <div style={{ fontFamily: MONO, fontSize: 22, color: "#666", letterSpacing: 2 }}>{r.label}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 70, color: INK, lineHeight: 1.05 }}>{r.value}</div>
            </div>
          ))}
          <div style={{
            position: "absolute", right: 50, bottom: 60, transform: `rotate(-3deg) scale(${stampScale})`, opacity: stampOp,
            border: `8px solid ${RED}`, color: RED, fontFamily: DISPLAY, fontSize: 104, padding: "0 26px",
            letterSpacing: 4, mixBlendMode: "multiply",
          }}>{String(p.stamp ?? "")}</div>
        </div>
      </Drift>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------- hatch: tank with lid flipping OPEN -> CLOSED, sources labelled ----------
const Hatch: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const flip = Number(p.flip_frame ?? Math.round(dur * 0.5));
  // order "open_first" (default): OPEN then flips CLOSED. "closed_first": the claim (CLOSED) then the
  // correction (OPEN) - matches a script that states the reported claim first and the sworn accounts after.
  const closedFirst = p.order === "closed_first";
  const lidAngle = closedFirst
    ? interpolate(f, [flip - 3, flip + 5], [0, -72], { ...clamp, easing: Easing.out(Easing.quad) })
    : interpolate(f, [flip - 5, flip + 3], [-72, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  const first = interpolate(f, [2, 8, flip - 4, flip], [0, 1, 1, 0.25], clamp);
  const second = interpolate(f, [flip, flip + 6], [0, 1], clamp);
  const openOp = closedFirst ? second : first;
  const closedOp = closedFirst ? first : second;
  const shake = f >= flip + 3 && f < flip + 8 ? 4 : 0;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#0b1017 0%,#141c26 60%,#0a0d12 100%)" }}>
      <Drift dur={dur} shake={shake}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          {/* skyline hint */}
          <path d="M0 1010 L0 900 L90 900 L90 860 L180 860 L180 930 L300 930 L300 880 L360 880 L360 1010 Z M720 1010 L720 870 L800 870 L800 910 L900 910 L900 850 L1080 850 L1080 1010 Z" fill="#0e141c" />
          {/* tank body */}
          <rect x={330} y={620} width={420} height={400} fill="url(#steel)" />
          <ellipse cx={540} cy={1020} rx={210} ry={40} fill="#3b4652" />
          <ellipse cx={540} cy={620} rx={210} ry={48} fill="#8c98a4" />
          <ellipse cx={540} cy={620} rx={70} ry={18} fill="#0a0d12" />
          {[680, 760, 840, 920].map((y) => <line key={y} x1={330} y1={y} x2={750} y2={y} stroke="rgba(0,0,0,0.25)" strokeWidth={3} />)}
          {/* ladder */}
          <g stroke="#5b6570" strokeWidth={7}>
            <line x1={760} y1={600} x2={760} y2={1020} /><line x1={800} y1={600} x2={800} y2={1020} />
            {[640, 690, 740, 790, 840, 890, 940, 990].map((y) => <line key={y} x1={760} y1={y} x2={800} y2={y} />)}
          </g>
          {/* lid, hinged at left edge of the opening */}
          <g transform={`rotate(${lidAngle} 470 612)`}>
            <ellipse cx={540} cy={612} rx={76} ry={20} fill="#b5c0ca" stroke="#5b6570" strokeWidth={4} />
            <rect x={530} y={598} width={20} height={8} fill="#5b6570" />
          </g>
          <defs>
            <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#4a5561" /><stop offset="0.45" stopColor="#8a96a2" /><stop offset="1" stopColor="#3a444f" />
            </linearGradient>
          </defs>
        </svg>
      </Drift>
      <Vignette />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 30, color: AMBER, letterSpacing: 6 }}>
        {String(p.title ?? "THE TANK HATCH")}
      </div>
      <div style={{ position: "absolute", top: 305, left: 80, width: 420, opacity: openOp, textAlign: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 116, color: "white", lineHeight: 1 }}>OPEN</div>
        <div style={{ fontFamily: MONO, fontSize: 34, color: "#fff", marginTop: 10, lineHeight: 1.3 }}>{String(p.open_source ?? "")}</div>
      </div>
      <div style={{ position: "absolute", top: 305, left: 520, width: 420, opacity: closedOp, textAlign: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 116, color: AMBER, lineHeight: 1 }}>CLOSED</div>
        <div style={{ fontFamily: MONO, fontSize: 34, color: "#fff", marginTop: 10, lineHeight: 1.3 }}>{String(p.closed_source ?? "")}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- faucet: a tap that only trickles, with the guests' words ----------
const Faucet: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const drops = [0, 11, 19, 33, 41, 58, 66, 80];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#0e1112 0%,#1b2022 60%,#0b0d0e 100%)" }}>
      <Drift dur={dur}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          {/* tiles */}
          {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={i * 135} y1={0} x2={i * 135} y2={1920} stroke="rgba(255,255,255,0.04)" strokeWidth={3} />)}
          {Array.from({ length: 15 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 135} x2={1080} y2={i * 135} stroke="rgba(255,255,255,0.04)" strokeWidth={3} />)}
          <g transform="translate(0 170)">
          {/* faucet */}
          <rect x={220} y={560} width={60} height={200} rx={14} fill="#9aa4ab" />
          <path d="M250 580 Q250 500 360 500 L560 500 Q600 500 600 540 L600 600 L560 600 L560 560 Q560 545 545 545 L360 545 Q290 545 290 580 Z" fill="#b9c2c8" />
          <rect x={330} y={455} width={80} height={30} rx={10} fill="#cfd6db" />
          {/* sink */}
          <path d="M180 860 L900 860 Q890 950 540 960 Q190 950 180 860 Z" fill="#d9dee1" opacity={0.85} />
          <ellipse cx={580} cy={900} rx={30} ry={8} fill="#2a2f33" />
          {drops.map((d, i) => {
            const t = (f - d) % 90;
            if (t < 0) return null;
            const y = interpolate(t, [0, 10, 26], [600, 610, 895], clamp);
            const op = interpolate(t, [0, 3, 24, 27], [0, 1, 1, 0], clamp);
            return <ellipse key={i} cx={580} cy={y} rx={9} ry={14} fill="#9fd3ff" opacity={op} />;
          })}
          </g>
        </svg>
      </Drift>
      <Vignette />
      <div style={{ position: "absolute", top: 250, left: 90, right: 150, textAlign: "center" }}>
        <Lines lines={(p.lines as string[]) ?? []} start={4} step={5} style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 64, lineHeight: 1.15, color: "#F2F6F8" }} />
        <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 26, color: AMBER, letterSpacing: 2, opacity: interpolate(f, [14, 20], [0, 1], clamp) }}>
          {String(p.attribution ?? "")}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- counter: days tick from start to end date ----------
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const Counter: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const days = Number(p.days ?? 19);
  const start = new Date(String(p.start ?? "2013-01-31") + "T12:00:00Z");
  const n = Math.round(interpolate(f, [3, Math.max(4, dur - 10)], [0, days], { ...clamp, easing: Easing.in(Easing.quad) }));
  const d = new Date(start.getTime() + n * 86400000);
  const pop = interpolate((f % 4), [0, 3], [1.04, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 35%, #1c2330 0%, #07090d 75%)" }}>
      <Drift dur={dur}>
        <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 30, color: AMBER, letterSpacing: 8 }}>{String(p.label_top ?? "DAYS IN THE TANK")}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 380, color: "white", lineHeight: 1, transform: `scale(${pop})` }}>{n}</div>
          <div style={{
            display: "inline-block", marginTop: 10, background: PAPER, color: INK, fontFamily: DISPLAY, fontSize: 64,
            padding: "6px 34px", transform: "rotate(-1.5deg)",
          }}>{MONTHS[d.getUTCMonth()]} {d.getUTCDate()}, {d.getUTCFullYear()}</div>
          <div style={{ marginTop: 30, fontFamily: MONO, fontSize: 26, color: "#aab", opacity: interpolate(f, [dur - 12, dur - 4], [0, 1], clamp) }}>
            {String(p.label_bottom ?? "")}
          </div>
        </div>
      </Drift>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------- route: the path she would have had to take ----------
const Route: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const steps = (p.steps as { title: string; note?: string; at?: number }[]) ?? [];
  const per = Math.max(8, Math.floor((dur - 10) / Math.max(1, steps.length)));
  // Optional per-step `at` (frame within the shot) lets the director cue each step to its spoken word.
  const at = (i: number) => (steps[i] && typeof steps[i].at === "number" ? Number(steps[i].at) : i * per);
  const y0 = 300;
  const gap = Math.min(200, 560 / Math.max(1, steps.length - 1));  // last step + note ends above y~950 (source line + captions below)
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#0a0c10 0%,#121823 100%)" }}>
      <Drift dur={dur}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          {steps.slice(1).map((_, i) => {
            const prog = interpolate(f, [at(i) + 4, Math.max(at(i) + 5, at(i + 1))], [0, 1], clamp);
            const ya = y0 + i * gap + 40, yb = y0 + (i + 1) * gap;
            return <line key={i} x1={170} y1={ya} x2={170} y2={ya + (yb - ya) * prog} stroke={AMBER} strokeWidth={8} strokeDasharray="18 12" />;
          })}
          {steps.map((_, i) => {
            const on = f >= at(i);
            return <circle key={i} cx={170} cy={y0 + i * gap + 20} r={on ? 24 : 16} fill={on ? (i === steps.length - 1 ? RED : AMBER) : "#333"} />;
          })}
        </svg>
        {steps.map((s, i) => {
          const t = f - at(i);
          return (
            <div key={i} style={{
              position: "absolute", left: 230, top: y0 + i * gap - 22, width: 690,
              opacity: interpolate(t, [0, 6], [0.15, 1], clamp),
              transform: `translateX(${interpolate(t, [0, 8], [30, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px)`,
            }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 72, color: i === steps.length - 1 ? RED : "white", lineHeight: 1 }}>{s.title}</div>
              {s.note && <div style={{ fontFamily: MONO, fontSize: 34, color: "#d6d9e0", marginTop: 6 }}>{s.note}</div>}
            </div>
          );
        })}
      </Drift>
      <Vignette />
    </AbsoluteFill>
  );
};


// ---------- pills: prescription bottles draining to the recorded remaining counts ----------
const Pills: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const items = (p.items as { name: string; remaining: number; issued: number }[]) ?? [];
  const w = 220, gapX = 60;
  const x0 = (1080 - (items.length * w + (items.length - 1) * gapX)) / 2;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #22262b 0%, #0a0b0d 75%)" }}>
      <Drift dur={dur}>
        <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 30, color: AMBER, letterSpacing: 6 }}>{String(p.title ?? "")}</div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: "#aab", marginTop: 8 }}>{String(p.subtitle ?? "")}</div>
        </div>
        {items.map((it, i) => {
          const t = f - 4 - i * 5;
          const ratio = it.issued ? it.remaining / it.issued : 0;
          const level = interpolate(t, [0, 18], [1, ratio], { ...clamp, easing: Easing.out(Easing.cubic) });
          const shown = it.remaining;  // static numbers: viewers read them (v13 panel: counting numbers were unreadable)
          const x = x0 + i * (w + gapX);
          const top = 470, h = 380;
          return (
            <div key={i} style={{ position: "absolute", left: x, top, width: w, opacity: interpolate(t, [0, 5], [0, 1], clamp) }}>
              <div style={{ width: w * 0.8, height: 56, margin: "0 auto", background: "#e9e6df", borderRadius: 8 }} />
              <div style={{ position: "relative", width: w, height: h, marginTop: 6, background: "rgba(214,120,30,0.28)", borderRadius: 22, overflow: "hidden", border: "3px solid rgba(255,190,120,0.5)" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${level * 100}%`,
                  background: "repeating-radial-gradient(circle at 30% 30%, #f3efe6 0 10px, #d8d2c6 10px 13px)", opacity: 0.9 }} />
                <div style={{ position: "absolute", top: 110, left: 12, right: 12, background: PAPER, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 26, color: INK, letterSpacing: 0 }}>{it.name}</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 70, color: INK, lineHeight: 1.05 }}>{shown}/{it.issued}</div>
                  <div style={{ fontFamily: MONO, fontSize: 16, color: "#555" }}>LEFT</div>
                </div>
              </div>
            </div>
          );
        })}
      </Drift>
      <Vignette />
    </AbsoluteFill>
  );
};


// ---------- tanklevel: cross-section of a tank; the water line sinks (abstract, no figure) ----------
const TankLevel: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const from = Number(p.from_level ?? 0.92), to = Number(p.to_level ?? 0.35);
  const level = interpolate(f, [6, Math.max(8, dur - 8)], [from, to], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const tx = 300, tw = 480, ty = 330, th = 560;           // tank box: bottom y=890, taps to ~990 (source line at 1040 below)
  const waterTop = ty + th * (1 - level);
  const ripple = Math.sin(f / 5) * 4;
  const reach = ty + th * 0.12;                           // the opening at the top
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#07090c 0%,#0e141b 100%)" }}>
      <Drift dur={dur}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="wat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3f6f8f" stopOpacity="0.95" /><stop offset="1" stopColor="#0f2233" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* tank walls + open hatch at the top */}
          <rect x={tx} y={ty} width={tw} height={th} fill="#11161c" stroke="#8c98a4" strokeWidth={8} rx={10} />
          <rect x={tx + tw / 2 - 60} y={ty - 6} width={120} height={14} fill="#07090c" />
          <line x1={tx + tw / 2 - 60} y1={ty} x2={tx + tw / 2 - 105} y2={ty - 36} stroke="#b5c0ca" strokeWidth={8} />
          {/* water */}
          <path d={`M ${tx + 4} ${waterTop + ripple} Q ${tx + tw / 2} ${waterTop - ripple} ${tx + tw - 4} ${waterTop + ripple} L ${tx + tw - 4} ${ty + th - 4} L ${tx + 4} ${ty + th - 4} Z`} fill="url(#wat)" />
          {/* reach line: how far below the opening the surface is */}
          <line x1={tx + tw + 30} y1={reach} x2={tx + tw + 30} y2={waterTop} stroke={RED} strokeWidth={5} strokeDasharray="10 8" />
          <line x1={tx + tw + 14} y1={reach} x2={tx + tw + 46} y2={reach} stroke={RED} strokeWidth={5} />
          <line x1={tx + tw + 14} y1={waterTop} x2={tx + tw + 46} y2={waterTop} stroke={RED} strokeWidth={5} />
          {/* guests' taps drawing water out at the bottom */}
          <line x1={tx + 40} y1={ty + th} x2={tx + 40} y2={ty + th + 60} stroke="#8c98a4" strokeWidth={10} />
          {[0, 1, 2].map((i) => {
            const t = ((f + i * 9) % 27) / 27;
            return <circle key={i} cx={tx + 40} cy={ty + th + 60 + t * 40} r={7} fill="#9fd3ff" opacity={1 - t} />;
          })}
        </svg>
      </Drift>
      <Vignette />
      <div style={{ position: "absolute", top: 240, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 30, color: AMBER, letterSpacing: 6 }}>
        {String(p.title ?? "")}
      </div>
    </AbsoluteFill>
  );
};

// ---------- pinmap: crime-scene pins land on an abstract map (real lat/lon), counter climbs ----------
// Pins are only the places the research names; the counter carries the total. No invented locations.
const PinMap: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const pins = (p.pins as { name: string; lat: number; lon: number; at?: number; year?: string; kind?: string }[]) ?? [];
  // Fit the view to the pins (equal-area-ish: 1° lat ≈ 1.5° lon at ~49°N), unless bounds are given.
  const fit = (): number[] => {
    if (!pins.length) return [5.5, 16.5, 46.3, 51.5];
    let a = Math.min(...pins.map((q) => q.lon)), b = Math.max(...pins.map((q) => q.lon));
    let c = Math.min(...pins.map((q) => q.lat)), d = Math.max(...pins.map((q) => q.lat));
    const cx = (a + b) / 2, cy = (c + d) / 2;
    let hw = Math.max((b - a) / 2, 1.5 * (d - c) / 2 * 1.0) * 1.35 + 0.3;
    const hh = hw / 1.5 * (600 / 900) * 1.5 / 1.0;   // keep 900x600 box aspect with the lon/lat ratio
    return [cx - hw, cx + hw, cy - hh / 1.5 * 1.0, cy + hh / 1.5 * 1.0];
  };
  const [lon0, lon1, lat0, lat1] = (p.bounds as number[]) ?? fit();
  const X = (lon: number) => 90 + ((lon - lon0) / (lon1 - lon0)) * 900;
  const Y = (lat: number) => 330 + ((lat1 - lat) / (lat1 - lat0)) * 600;
  // Label placement: right of the pin unless near the edge; nudge down/up to avoid overlapping earlier labels.
  // Label placement (v7 compliance C23: a nudged label floated ~140 px from its pin). Try spots around the pin,
  // nearest first; a label that has to move off its default spot gets a leader line to its pin.
  const LW = 310, LH = 62;
  const boxes: { x: number; y: number; right: boolean; leader: boolean }[] = [];
  const overlaps = (x: number, y: number) =>
    boxes.some((b) => x < b.x + LW && x + LW > b.x && y < b.y + LH && y + LH > b.y) ||
    pins.some((o) => { const ox = X(o.lon), oy = Y(o.lat); return ox > x - 8 && ox < x + LW + 8 && oy > y - 8 && oy < y + LH + 8; });
  pins.forEach((q) => {
    const px = X(q.lon), py = Y(q.lat);
    const preferRight = px <= 700;
    const R = { dx: 26, right: false }, L = { dx: -26 - LW, right: true };
    const sides = preferRight ? [R, L] : [L, R];
    const cands = [
      ...sides.map((sd) => ({ ...sd, dy: -58 })), ...sides.map((sd) => ({ ...sd, dy: 8 })),
      ...sides.map((sd) => ({ ...sd, dy: -124 })), ...sides.map((sd) => ({ ...sd, dy: 74 })),
    ];
    const fit = cands.find((c) => !overlaps(px + c.dx, py + c.dy) && px + c.dx >= 70 && px + c.dx + LW <= 1010);
    const c = fit ?? cands[0];
    boxes.push({ x: px + c.dx, y: py + c.dy, right: c.right, leader: c.dy !== -58 });
  });
  const per = Math.max(6, Math.floor((dur - 16) / Math.max(1, pins.length)));
  const at = (i: number) => (typeof pins[i]?.at === "number" ? Number(pins[i].at) : 4 + i * per);
  const countTo = Number(p.count_to ?? pins.length);
  const n = Math.round(interpolate(f, [4, Math.max(6, dur - 12)], [0, countTo], { ...clamp, easing: Easing.inOut(Easing.quad) }));
  const countries = (p.countries as { name: string; lat: number; lon: number }[]) ?? [
    { name: "GERMANY", lat: 50.6, lon: 9.6 }, { name: "FRANCE", lat: 48.7, lon: 6.4 }, { name: "AUSTRIA", lat: 47.4, lon: 13.8 }];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 45% 40%, #182029 0%, #06080b 80%)" }}>
      <Drift dur={dur}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v${i}`} x1={90 + i * 82} y1={330} x2={90 + i * 82} y2={930} stroke="#223040" strokeWidth={2} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h${i}`} x1={90} y1={330 + i * 120} x2={990} y2={330 + i * 120} stroke="#223040" strokeWidth={2} />
          ))}
          {pins.map((q, i) => {
            const b = boxes[i];
            if (!b.leader || f - at(i) < 4) return null;
            const lx = b.right ? b.x + LW : b.x, ly = b.y + LH / 2;
            return <line key={`ld${i}`} x1={X(q.lon)} y1={Y(q.lat)} x2={lx} y2={ly} stroke="#cfd8dc" strokeWidth={3}
              opacity={interpolate(f - at(i), [4, 10], [0, 0.8], clamp)} />;
          })}
          {pins.map((q, i) => {
            const t = f - at(i);
            if (t < 0) return null;
            const drop = interpolate(t, [0, 6], [-60, 0], { ...clamp, easing: Easing.in(Easing.quad) });
            const ring = interpolate(t, [5, 20], [0, 70], clamp);
            const col = q.kind === "murder" ? RED : AMBER;
            return (
              <g key={i}>
                <circle cx={X(q.lon)} cy={Y(q.lat)} r={ring} fill="none" stroke={col} strokeWidth={4} opacity={interpolate(t, [5, 20], [0.9, 0], clamp)} />
                <circle cx={X(q.lon)} cy={Y(q.lat) + drop} r={16} fill={col} stroke="#000" strokeWidth={3} />
              </g>
            );
          })}
        </svg>
        {countries.filter((c) => c.lon > lon0 && c.lon < lon1 && c.lat > lat0 && c.lat < lat1 - 0.15 * (lat1 - lat0))
          // a country name under a pin label reads as clutter (v8): drop it when any label box covers it
          .filter((c) => !boxes.some((b) => X(c.lon) + 130 > b.x && X(c.lon) - 130 < b.x + LW && Y(c.lat) + 20 > b.y && Y(c.lat) - 20 < b.y + LH))
          .map((c, i) => (
          <div key={i} style={{ position: "absolute", left: X(c.lon) - 200, width: 400, top: Y(c.lat) - 20, textAlign: "center",
            fontFamily: MONO, fontSize: 30, letterSpacing: 10, color: "#4d5f73" }}>{c.name}</div>
        ))}
        {pins.map((q, i) => {
          const t = f - at(i);
          const { x: lx, y: ly, right } = boxes[i];
          return (
            <div key={i} style={{ position: "absolute", top: ly, left: lx, width: 310,
              textAlign: right ? "right" : "left", opacity: interpolate(t, [4, 10], [0, 1], clamp) }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 38, color: "white", lineHeight: 1, textShadow: "0 3px 8px #000" }}>{q.name}</div>
              {q.year && <div style={{ fontFamily: MONO, fontSize: 24, color: q.kind === "murder" ? RED : AMBER }}>{q.year}</div>}
            </div>
          );
        })}
      </Drift>
      <Vignette />
      {p.region ? (
        <div style={{ position: "absolute", top: 880, left: 90, fontFamily: MONO, fontSize: 30, letterSpacing: 6, color: "#8aa0b6" }}>{String(p.region)}</div>
      ) : null}
      <div style={{ position: "absolute", top: 232, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 96, color: "white" }}>{n}</span>
        <span style={{ fontFamily: MONO, fontSize: 30, color: AMBER, letterSpacing: 6, marginLeft: 18 }}>{String(p.count_label ?? "CRIME SCENES")}</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------- dnaprofile: stacked electropherogram traces that turn out identical ----------
const PEAKS = [0.08, 0.14, 0.23, 0.29, 0.37, 0.46, 0.52, 0.61, 0.69, 0.77, 0.84, 0.92];
const HEIGHTS = [0.55, 0.9, 0.4, 0.75, 1.0, 0.5, 0.85, 0.35, 0.95, 0.6, 0.45, 0.8];
const DnaProfile: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const traces = (p.traces as { label: string; at?: number; color?: string }[]) ?? [{ label: "SAMPLE" }];
  const matchF = Number(p.match_frame ?? Math.max(10, dur - 24));
  const per = Math.max(6, Math.floor((matchF - 6) / Math.max(1, traces.length)));
  const at = (i: number) => (typeof traces[i]?.at === "number" ? Number(traces[i].at) : 2 + i * per);
  const x0 = 110, w = 860, top = 340;
  const rowH = Math.min(190, 560 / traces.length);
  const matched = f >= matchF;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#05080a 0%,#0b1418 100%)" }}>
      <Drift dur={dur}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          {matched && PEAKS.map((px, k) => (
            <rect key={k} x={x0 + px * w - 12} y={top - 10} width={24} height={traces.length * rowH + 10}
              fill={RED} opacity={interpolate(f - matchF - k, [0, 4], [0, 0.28], clamp)} />
          ))}
          {traces.map((tr, i) => {
            const prog = interpolate(f - at(i), [0, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
            const base = top + (i + 1) * rowH - 30;
            const amp = rowH - 60;
            let d = `M ${x0} ${base}`;
            for (let s = 0; s <= 200; s++) {
              const u = s / 200;
              if (u > prog) break;
              let y = 0;
              PEAKS.forEach((px, k) => { y += HEIGHTS[(k + (Number(p.shift ?? 0) * i)) % HEIGHTS.length] * Math.exp(-((u - px) ** 2) / 0.00012); });
              y += 0.03 * Math.sin(u * 180 + i * 7);
              d += ` L ${x0 + u * w} ${base - y * amp}`;
            }
            return (
              <g key={i}>
                <line x1={x0} y1={base} x2={x0 + w} y2={base} stroke="#2a3a40" strokeWidth={2} />
                <path d={d} fill="none" stroke={tr.color ?? "#6fe3c1"} strokeWidth={5} />
              </g>
            );
          })}
        </svg>
        {traces.map((tr, i) => (
          <div key={i} style={{ position: "absolute", left: x0, top: top + i * rowH - 4, fontFamily: MONO, fontSize: 36, color: "#eef3f5", textShadow: "0 2px 6px #000",
            opacity: interpolate(f - at(i), [0, 5], [0, 1], clamp) }}>{tr.label}</div>
        ))}
      </Drift>
      <Vignette />
      <div style={{ position: "absolute", top: 240, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 38, color: AMBER, letterSpacing: 4 }}>
        {String(p.title ?? "DNA PROFILE")}
      </div>
      {p.verdict ? (
        <div style={{ position: "absolute", top: top + Math.floor(traces.length / 2) * rowH + 50, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ display: "inline-block", fontFamily: DISPLAY, fontSize: 76, boxShadow: "0 6px 14px rgba(0,0,0,.6)", color: "white", background: RED, padding: "2px 30px",
            transform: `scale(${interpolate(f - matchF, [0, 5], [1.4, 1], clamp)}) rotate(-2deg)`, opacity: matched ? 1 : 0 }}>{String(p.verdict)}</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- wanted: a poster with no face; the reward ticks up ----------
const fmtEuro = (n: number, sep = ",") => "€" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
const Wanted: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const from = Number(p.from ?? 100000), to = Number(p.to ?? 300000);
  const t0 = Number(p.tick_start ?? 12);
  const t1 = Number(p.tick_end ?? dur - 12);   // frame where the counter lands on `to` (cue it to the spoken number)
  const val = interpolate(f, [t0, Math.max(t0 + 2, t1)], [from, to], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const stepped = Math.round(val / 10000) * 10000;
  const land = interpolate(f, [0, 8], [0.9, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #2a2016 0%, #0a0806 80%)" }}>
      <Drift dur={dur}>
        <div style={{ position: "absolute", left: 200, top: 245, width: 680, height: 670, background: PAPER, boxShadow: "0 30px 60px rgba(0,0,0,.7)",
          transform: `rotate(-1.5deg) scale(${land})`, textAlign: "center", color: INK }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 104, lineHeight: 1.1, marginTop: 14, letterSpacing: 4 }}>{String(p.title ?? "GESUCHT")}</div>
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 6 }}>{String(p.subtitle ?? "WANTED")}</div>
          <svg width={260} height={280} style={{ marginTop: 10 }} viewBox="0 0 300 330">
            <rect x={0} y={0} width={300} height={330} fill="#cfc6b2" stroke={INK} strokeWidth={5} />
            <ellipse cx={150} cy={130} rx={70} ry={88} fill="#8d8474" />
            <path d="M 40 330 Q 150 190 260 330 Z" fill="#8d8474" />
            <text x={150} y={160} textAnchor="middle" fontFamily={DISPLAY} fontSize={110} fill={PAPER}>?</text>
          </svg>
          <div style={{ fontFamily: MONO, fontSize: 28, marginTop: 10, letterSpacing: 4 }}>{String(p.note ?? "NO FACE · NO NAME")}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 96, color: RED, lineHeight: 1.1 }}>{fmtEuro(stepped, p.locale === "de" ? "." : ",")}</div>
        </div>
      </Drift>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------- swab: a sealed 'sterile' swab; the tip lights up with human DNA ----------
const Swab: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const flip = Number(p.flip_frame ?? Math.floor(dur * 0.5));
  const on = f >= flip;
  const glow = interpolate(f - flip, [0, 10], [0, 1], clamp);
  const pulse = on ? 0.75 + 0.25 * Math.sin((f - flip) / 3) : 0;
  const cx = 540, tipY = 420;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#07090b 0%,#10151a 100%)" }}>
      <Drift dur={dur}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            <radialGradient id="dnaglow"><stop offset="0" stopColor="#7dffcf" stopOpacity="0.95" /><stop offset="1" stopColor="#7dffcf" stopOpacity="0" /></radialGradient>
          </defs>
          {/* tube */}
          <rect x={cx - 70} y={300} width={140} height={640} rx={60} fill="rgba(200,220,235,0.08)" stroke="#9fb3c2" strokeWidth={5} />
          <rect x={cx - 80} y={880} width={160} height={70} rx={12} fill="#c9362f" />
          {/* stick + cotton */}
          <rect x={cx - 7} y={tipY + 40} width={14} height={440} fill="#e8e0cc" />
          <ellipse cx={cx} cy={tipY} rx={34} ry={62} fill="#f4f1ea" />
          {on && <circle cx={cx} cy={tipY} r={140 * glow} fill="url(#dnaglow)" opacity={pulse} />}
          {on && Array.from({ length: 7 }).map((_, i) => (
            <circle key={i} cx={cx - 18 + ((i * 13) % 36)} cy={tipY - 40 + ((i * 23) % 80)} r={5} fill="#0b3" opacity={glow} />
          ))}
        </svg>
        <div style={{ position: "absolute", left: 640, top: 520, width: 340 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 66, color: "white", lineHeight: 1 }}>{String(p.label_a ?? "STERILE")}
            <span style={{ color: "#5fd38a", marginLeft: 12 }}>✓</span></div>
          <div style={{ fontFamily: DISPLAY, fontSize: 66, lineHeight: 1.1, marginTop: 20, color: RED, opacity: interpolate(f - flip, [4, 10], [0, 1], clamp) }}>
            {String(p.label_b ?? "DNA-FREE")}<span style={{ marginLeft: 12 }}>✗</span></div>
        </div>
      </Drift>
      <Vignette />
      <div style={{ position: "absolute", top: 232, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 30, color: AMBER, letterSpacing: 6 }}>
        {String(p.title ?? "")}
      </div>
    </AbsoluteFill>
  );
};

// ---------- evidence: sealed evidence bags land one by one (item, place/year) ----------
const EvIcon: React.FC<{ kind?: string }> = ({ kind }) => {
  const c = "#3a3226";
  switch (kind) {
    case "biscuit": return (<svg width={170} height={170} viewBox="0 0 100 100"><circle cx={50} cy={50} r={40} fill="#c89a5a" stroke={c} strokeWidth={3} />
      <circle cx={88} cy={30} r={16} fill={PAPER} />{[[35, 40], [55, 60], [42, 68], [62, 38]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill={c} />)}</svg>);
    case "syringe": return (<svg width={170} height={170} viewBox="0 0 100 100"><g transform="rotate(-35 50 50)"><rect x={14} y={38} width={56} height={24} rx={4} fill="#dfe8ee" stroke={c} strokeWidth={3} />
      <rect x={70} y={47} width={26} height={6} fill={c} /><rect x={2} y={32} width={12} height={36} fill={c} /><rect x={22} y={42} width={30} height={16} fill="#b33" opacity={0.6} /></g></svg>);
    case "cup": return (<svg width={170} height={170} viewBox="0 0 100 100"><path d="M25 30 L75 30 L68 85 L32 85 Z" fill="#e9e4d8" stroke={c} strokeWidth={3} /><path d="M75 42 Q92 50 72 66" fill="none" stroke={c} strokeWidth={4} /></svg>);
    case "stone": return (<svg width={170} height={170} viewBox="0 0 100 100"><path d="M20 65 Q18 35 45 28 Q78 22 84 52 Q88 78 55 80 Q25 82 20 65 Z" fill="#8c8c86" stroke={c} strokeWidth={3} /></svg>);
    case "car": return (<svg width={170} height={170} viewBox="0 0 100 100"><path d="M10 62 L18 44 L38 36 L66 36 L82 48 L92 52 L92 64 Z" fill="#dfe6df" stroke={c} strokeWidth={3} />
      <rect x={10} y={50} width={82} height={8} fill="#2e8b57" /><circle cx={28} cy={66} r={9} fill={c} /><circle cx={74} cy={66} r={9} fill={c} /></svg>);
    case "fingerprint": return (<svg width={170} height={170} viewBox="0 0 100 100">{[10, 18, 26, 34].map((r, i) => <ellipse key={i} cx={50} cy={52} rx={r * 0.8} ry={r} fill="none" stroke={c} strokeWidth={3} />)}</svg>);
    default: return null;
  }
};
const Evidence: React.FC<{ p: SceneProps; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame();
  const items = (p.items as { label: string; sub?: string; icon?: string; at?: number }[]) ?? [];
  const per = Math.max(8, Math.floor((dur - 10) / Math.max(1, items.length)));
  const at = (i: number) => (typeof items[i]?.at === "number" ? Number(items[i].at) : 2 + i * per);
  const n = items.length;
  const h = n <= 1 ? 540 : n === 2 ? 300 : 186;          // bags stack inside y 310-920 (source line at 1040)
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1d1a16 0%, #080706 80%)" }}>
      <Drift dur={dur}>
        {items.map((it, i) => {
          const t = f - at(i);
          const y = 310 + i * (h + 18);
          const land = interpolate(t, [0, 6], [-120, 0], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
          return (
            <div key={i} style={{ position: "absolute", left: 110, top: y, width: 860, height: h, opacity: interpolate(t, [0, 3], [0, 1], clamp),
              transform: `translateY(${land}px) rotate(${i % 2 ? 1.2 : -1.2}deg)`, background: "rgba(225,232,238,0.13)",
              border: "4px solid rgba(225,232,238,0.45)", borderRadius: 14, boxShadow: "0 20px 40px rgba(0,0,0,.6)", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, background: RED, color: "white", fontFamily: MONO, fontSize: 24,
                letterSpacing: 8, lineHeight: "44px", paddingLeft: 20 }}>BEWEISMITTEL · EVIDENCE</div>
              <div style={{ position: "absolute", left: 24, top: 44 + (h - 44 - 170) / 2, transform: `scale(${n >= 3 ? 0.8 : 1})` }}><EvIcon kind={it.icon} /></div>
              <div style={{ position: "absolute", left: it.icon ? 220 : 40, right: 24, top: 44 + (h - 44) / 2 - (n >= 3 ? 48 : 58), background: PAPER, padding: n >= 3 ? "6px 16px" : "10px 20px", transform: "rotate(-0.8deg)" }}>
                <div style={{ fontFamily: DISPLAY, fontSize: n >= 3 ? 50 : 70, color: INK, lineHeight: 1.05 }}>{it.label}</div>
                {it.sub && <div style={{ fontFamily: MONO, fontSize: n >= 3 ? 22 : 28, color: "#6b2a24", marginTop: 2, whiteSpace: "nowrap" }}>{it.sub}</div>}
              </div>
            </div>
          );
        })}
      </Drift>
      <Vignette />
      {p.title ? <div style={{ position: "absolute", top: 236, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 34, color: AMBER, letterSpacing: 5 }}>{String(p.title)}</div> : null}
    </AbsoluteFill>
  );
};

export const Scene: React.FC<{ name: SceneName; props: SceneProps; dur: number }> = ({ name, props, dur }) => {
  switch (name) {
    case "judge": return <Judge p={props} dur={dur} />;
    case "stamp": return <Stamp p={props} dur={dur} />;
    case "hatch": return <Hatch p={props} dur={dur} />;
    case "faucet": return <Faucet p={props} dur={dur} />;
    case "counter": return <Counter p={props} dur={dur} />;
    case "route": return <Route p={props} dur={dur} />;
    case "pills": return <Pills p={props} dur={dur} />;
    case "tanklevel": return <TankLevel p={props} dur={dur} />;
    case "pinmap": return <PinMap p={props} dur={dur} />;
    case "dnaprofile": return <DnaProfile p={props} dur={dur} />;
    case "wanted": return <Wanted p={props} dur={dur} />;
    case "swab": return <Swab p={props} dur={dur} />;
    case "evidence": return <Evidence p={props} dur={dur} />;
    default: return <AbsoluteFill style={{ background: "black" }} />;
  }
};
