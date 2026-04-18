import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  Audio,
  staticFile,
} from "remotion";
import type { Story } from "./types";

// --- Single scene: image background + animated subtitle ---
const SceneView: React.FC<{
  narration: string;
  image: string;
  audio?: string;
}> = ({ narration, image, audio }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slow zoom on the image (Ken Burns effect)
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.15]);

  // Subtitle fades in
  const textOpacity = spring({ frame, fps, config: { damping: 20 } });

  // Subtitle slides up
  const textY = interpolate(frame, [0, 15], [30, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Narration audio */}
      {audio && <Audio src={staticFile(audio)} volume={1} />}

      {/* Background image with Ken Burns zoom */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
          }}
        />
        {/* Dark overlay for text readability */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(transparent 50%, rgba(0,0,0,0.85) 100%)",
          }}
        />
      </AbsoluteFill>

      {/* Subtitle text at bottom */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          padding: 60,
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            color: "white",
            fontSize: 48,
            fontFamily: "sans-serif",
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: 1400,
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          {narration}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- Title card ---
const TitleScene: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 15 } });
  const lineWidth = interpolate(frame, [20, 50], [0, 300], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0a0a0a, #1a1a2e)",
      }}
    >
      <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
        <div
          style={{
            color: "white",
            fontSize: 72,
            fontWeight: "bold",
            fontFamily: "sans-serif",
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: lineWidth,
            height: 4,
            backgroundColor: "#a78bfa",
            margin: "20px auto",
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// --- Main: assembles all scenes sequentially ---
export const StoryVideo: React.FC<{ story: Story }> = ({ story }) => {
  const { fps } = useVideoConfig();

  const titleDurationFrames = fps * 3; // 3 second title card
  let currentFrame = 0;

  return (
    <AbsoluteFill>
      {/* Title card */}
      <Sequence from={currentFrame} durationInFrames={titleDurationFrames}>
        <TitleScene title={story.title} />
      </Sequence>

      {/* Each scene placed one after another */}
      {story.scenes.map((scene, i) => {
        // Offset by title + all previous scenes
        const offset =
          titleDurationFrames +
          story.scenes
            .slice(0, i)
            .reduce((sum, s) => sum + s.durationInSeconds * fps, 0);

        const duration = scene.durationInSeconds * fps;

        return (
          <Sequence key={i} from={offset} durationInFrames={duration}>
            <SceneView narration={scene.narration} image={scene.image} audio={scene.audio} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
