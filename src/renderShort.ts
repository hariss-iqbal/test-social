/**
 * Renders build/timeline.json of a topic to a silent H.264 master (audio is mixed separately).
 *
 * Usage: npx tsx src/renderShort.ts topics/<slug> <out.mp4> [--frames=0-90] [--still=120:out.jpg]
 *        npx tsx src/renderShort.ts topics/<slug> <cover.jpg> --cover   (Cover still from timeline.cover)
 * build/media is used as Remotion's publicDir; timeline paths (topic-relative) are rewritten to it.
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";

async function main() {
  const [topicArg, outArg, ...rest] = process.argv.slice(2);
  if (!topicArg || !outArg) throw new Error("usage: renderShort.ts <topicDir> <out.mp4> [--frames=a-b] [--still=f:out.jpg]");
  const topicDir = path.resolve(topicArg);
  const timeline = JSON.parse(fs.readFileSync(path.join(topicDir, "build/timeline.json"), "utf-8"));
  // Serve only build/media (prepared media). Using the whole topic dir made Remotion copy
  // out/ and old renders into every bundle.
  const mediaDir = path.join(topicDir, "build/media");
  const rel = (p?: string) => (p ? path.relative("build/media", p) : p);
  for (const s of timeline.shots) { s.src = rel(s.src); if (s.still) s.still = rel(s.still); }
  if (timeline.cover) timeline.cover.src = rel(timeline.cover.src);
  const inputProps = { timeline };
  const frames = rest.find((a) => a.startsWith("--frames="))?.split("=")[1];
  const still = rest.find((a) => a.startsWith("--still="))?.split("=")[1];

  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: mediaDir });
  if (rest.includes("--cover")) {
    if (!timeline.cover) throw new Error("timeline.cover missing (edl.cover not set)");
    const coverProps = timeline.cover;
    const comp = await selectComposition({ serveUrl, id: "Cover", inputProps: coverProps });
    await renderStill({ composition: comp, serveUrl, inputProps: coverProps, frame: 0, output: path.resolve(outArg), imageFormat: "jpeg", jpegQuality: 94 });
    console.log(`cover -> ${outArg}`);
    return;
  }
  const composition = await selectComposition({ serveUrl, id: "Short", inputProps });

  if (still) {
    const [f, out] = still.split(":");
    await renderStill({ composition, serveUrl, inputProps, frame: Number(f), output: path.resolve(out), imageFormat: "jpeg", jpegQuality: 92 });
    console.log(`still ${f} -> ${out}`);
    return;
  }
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    videoBitrate: process.env.VIDEO_BITRATE ?? "12M",
    x264Preset: "slow",
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 95,
    muted: true,
    outputLocation: path.resolve(outArg),
    inputProps,
    frameRange: frames ? (frames.split("-").map(Number) as [number, number]) : undefined,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) { last = pct; console.log(`render ${pct}%`); }
    },
  });
  console.log(`rendered -> ${outArg}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
