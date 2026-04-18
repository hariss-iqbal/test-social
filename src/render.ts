/**
 * Programmatic render script.
 *
 * Usage:
 *   npx tsx src/render.ts                         # renders with default story.json
 *   npx tsx src/render.ts path/to/custom-story.json  # renders with custom story
 *
 * This is how you'd call it from your pipeline —
 * generate a story.json, drop images in public/, run this script → get a video.
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";

async function render() {
  const storyPath = process.argv[2] || path.resolve("public/story.json");
  const story = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
  const outputPath = path.resolve("out/video.mp4");

  console.log(`Bundling project...`);
  const bundleLocation = await bundle({
    entryPoint: path.resolve("src/index.ts"),
  });

  console.log(`Selecting composition...`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "StoryVideo",
    inputProps: { story },
  });

  // Override duration based on the story we're rendering
  const fps = composition.fps;
  const titleDuration = fps * 3;
  const sceneDuration = story.scenes.reduce(
    (sum: number, s: { durationInSeconds: number }) =>
      sum + s.durationInSeconds * fps,
    0
  );

  console.log(`Rendering ${composition.durationInFrames} frames...`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { story },
  });

  console.log(`Done! Video saved to ${outputPath}`);
}

render().catch((err) => {
  console.error(err);
  process.exit(1);
});
