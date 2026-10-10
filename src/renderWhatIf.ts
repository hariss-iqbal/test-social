/**
 * Renders build/timeline.json of a "whatif" topic to a silent H.264 master (audio is mixed separately).
 *
 * Usage: npx tsx src/renderWhatIf.ts topics/<slug> <out.mp4> [--frames=0-90] [--scale=0.5]
 *        npx tsx src/renderWhatIf.ts topics/<slug> x --stills=0,120,300 [--outdir=dir]
 * WebGL needs a GPU-backed context: gl="angle" (Remotion's recommendation for three.js).
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";

async function main() {
  const [topicArg, outArg, ...rest] = process.argv.slice(2);
  if (!topicArg || !outArg) throw new Error("usage: renderWhatIf.ts <topicDir> <out.mp4> [--frames=a-b] [--stills=f1,f2] [--scale=s]");
  const topicDir = path.resolve(topicArg);
  const timeline = JSON.parse(fs.readFileSync(path.join(topicDir, "build/timeline.json"), "utf-8"));
  const inputProps = { timeline };
  const arg = (k: string) => rest.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
  const frames = arg("frames");
  const stills = arg("stills");
  const scale = Number(arg("scale") ?? 1);
  const concurrency = Number(arg("concurrency") ?? 4);
  const chromiumOptions = { gl: "angle" as const };

  // 3D assets (CC0 HDRIs + scanned models + animated characters) live outside public/ so other renders stay light
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("assets/whatif_public") });
  const composition = await selectComposition({ serveUrl, id: "WhatIf", inputProps, chromiumOptions });

  if (stills) {
    const outDir = path.resolve(arg("outdir") ?? path.join(topicDir, "build/stills"));
    fs.mkdirSync(outDir, { recursive: true });
    for (const f of stills.split(",").map(Number)) {
      const out = path.join(outDir, `still_${String(f).padStart(5, "0")}.jpg`);
      await renderStill({ composition, serveUrl, inputProps, frame: f, output: out, imageFormat: "jpeg", jpegQuality: 92, chromiumOptions, scale });
      console.log(`still ${f} -> ${out}`);
    }
    return;
  }
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    videoBitrate: process.env.VIDEO_BITRATE ?? "14M",
    x264Preset: "slow",
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 95,
    muted: true,
    scale,
    concurrency,
    chromiumOptions,
    timeoutInMilliseconds: 120000,
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
