import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from "remotion";

// --- Scene 1: Title card flies in ---
const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });

  const titleY = interpolate(frame, [0, 20], [80, 0], {
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      }}
    >
      <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
        <div
          style={{
            fontSize: 90,
            fontWeight: "bold",
            color: "white",
            fontFamily: "sans-serif",
            transform: `translateY(${titleY}px)`,
          }}
        >
          Remotion Demo
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#a78bfa",
            fontFamily: "sans-serif",
            marginTop: 20,
            opacity: subtitleOpacity,
          }}
        >
          Videos made with code
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Scene 2: Animated counter ---
const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const count = Math.floor(interpolate(frame, [0, 80], [0, 1000], {
    extrapolateRight: "clamp",
  }));

  const barWidth = interpolate(frame, [0, 80], [0, 80], {
    extrapolateRight: "clamp",
  });

  const fadeIn = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1a1a2e, #16213e)",
      }}
    >
      <div style={{ textAlign: "center", opacity: fadeIn }}>
        <div
          style={{
            fontSize: 120,
            fontWeight: "bold",
            color: "white",
            fontFamily: "monospace",
          }}
        >
          {count.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            fontFamily: "sans-serif",
            marginTop: 10,
          }}
        >
          subscribers
        </div>
        {/* Progress bar */}
        <div
          style={{
            marginTop: 40,
            width: 600,
            height: 12,
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
              borderRadius: 6,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Scene 3: Spinning cards ---
const SpinningCards: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = ["React", "TypeScript", "FFmpeg", "Remotion"];

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f0c29, #302b63)",
      }}
    >
      <div style={{ display: "flex", gap: 30 }}>
        {items.map((label, i) => {
          const delay = i * 8;
          const s = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12 },
          });

          const rotation = interpolate(s, [0, 1], [-90, 0]);

          return (
            <div
              key={label}
              style={{
                width: 200,
                height: 250,
                borderRadius: 20,
                background: "linear-gradient(180deg, #7c3aed, #4c1d95)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                transform: `scale(${s}) rotateY(${rotation}deg)`,
                boxShadow: "0 20px 60px rgba(124, 58, 237, 0.4)",
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: 28,
                  fontWeight: "bold",
                  fontFamily: "sans-serif",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- Main composition: stitches scenes together with <Sequence> ---
export const MyComposition: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Scene 1: frames 0–89 (3 seconds) */}
      <Sequence from={0} durationInFrames={90}>
        <TitleCard />
      </Sequence>

      {/* Scene 2: frames 90–209 (4 seconds) */}
      <Sequence from={90} durationInFrames={120}>
        <Counter />
      </Sequence>

      {/* Scene 3: frames 210–299 (3 seconds) */}
      <Sequence from={210} durationInFrames={90}>
        <SpinningCards />
      </Sequence>
    </AbsoluteFill>
  );
};
