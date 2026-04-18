/**
 * Generates audio files from story narration using ElevenLabs TTS.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key npx tsx src/generate-audio.ts public/story.json
 *
 * This will:
 *   1. Read each scene's narration text
 *   2. Generate speech via ElevenLabs
 *   3. Save audio files to public/ (e.g. scene1_audio.mp3)
 *   4. Update story.json with audio filenames + actual durations
 */
import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("Set ELEVENLABS_API_KEY environment variable");
  process.exit(1);
}

const client = new ElevenLabsClient({ apiKey: API_KEY });

// Get audio duration in seconds using ffprobe
function getAudioDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: "utf-8" }
    );
    return Math.ceil(parseFloat(result.trim()));
  } catch {
    console.warn(`Could not get duration for ${filePath}, using default`);
    return 5;
  }
}

async function main() {
  const storyPath = process.argv[2] || "public/story.json";
  const story = JSON.parse(fs.readFileSync(storyPath, "utf-8"));
  const publicDir = path.dirname(storyPath);

  console.log(`Generating audio for ${story.scenes.length} scenes...\n`);

  for (let i = 0; i < story.scenes.length; i++) {
    const scene = story.scenes[i];
    const audioFile = `scene${i + 1}_audio.mp3`;
    const audioPath = path.join(publicDir, audioFile);

    // Skip if audio already exists
    if (scene.audio && fs.existsSync(path.join(publicDir, scene.audio))) {
      console.log(`Scene ${i + 1}: audio already exists (${scene.audio}), skipping`);
      continue;
    }

    console.log(`Scene ${i + 1}: "${scene.narration.slice(0, 50)}..."`);

    const audioStream = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
      text: scene.narration,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
    });

    // Collect stream into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    fs.writeFileSync(audioPath, Buffer.concat(chunks));

    // Get actual duration and update scene
    const duration = getAudioDuration(audioPath);
    scene.audio = audioFile;
    scene.durationInSeconds = duration;

    console.log(`  → saved ${audioFile} (${duration}s)\n`);
  }

  // Write updated story with audio references and durations
  fs.writeFileSync(storyPath, JSON.stringify(story, null, 2));
  console.log(`Updated ${storyPath} with audio files and durations.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
