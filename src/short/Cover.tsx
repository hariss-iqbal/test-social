// G5 cover still (1080x1920): one focal picture full-bleed, 1-4 words in Anton with one red keyword,
// optional red ring on the evidence. No SOURCE line, no captions (research/gap-plan.md G5).
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import type { CoverProps } from "./types";
import { CalloutMark, H, RED, W, coverRect } from "./ShortVideo";

const { fontFamily: ANTON } = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");

export const Cover: React.FC<CoverProps> = ({ src, srcW, srcH, focus, crop, text, keyword, circle }) => {
  const place = coverRect(srcW, srcH, crop ?? null, focus, 1, W, H);
  const words = text.trim().split(/\s+/);
  const key = keyword ? norm(keyword) : "";
  // fewer / shorter words -> bigger; always fits inside x 70-1010
  const longest = Math.max(...words.map((w) => w.length));
  const size = Math.min(170, Math.max(118, Math.floor(1500 / Math.max(6, longest + 3))));
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ overflow: "hidden", filter: "contrast(1.07) saturate(0.85) brightness(0.95)" }}>
        {src && <Img src={staticFile(src)} style={{ ...place, maxWidth: "none" }} />}
      </AbsoluteFill>
      {/* subtle vignette + a darker band behind the words so white/red read on any picture */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, transparent 45%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 38%, transparent 55%, transparent 80%, rgba(0,0,0,0.35) 100%)" }} />
      {circle && <CalloutMark c={{ rect: circle, shape: "circle", at_s: 0 }} place={place} still />}
      <div style={{
        position: "absolute", left: 70, right: 70, top: 330, height: 370,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontFamily: ANTON, fontSize: size, lineHeight: 1.02, textAlign: "center", textTransform: "uppercase",
          color: "white", WebkitTextStroke: "18px #000", paintOrder: "stroke fill", textWrap: "balance",
          textShadow: "0 10px 30px rgba(0,0,0,0.6)", letterSpacing: "0.005em",
        }}>
          {words.map((w, i) => (
            <span key={i} style={{ color: key && norm(w) === key ? RED : "white" }}>
              {w}{i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
