import React, { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import { StoryVideo } from "../src/StoryVideo";
import type { Scene, Story } from "../src/types";
import storyData from "../public/story.json";

const RATIOS: Record<string, { width: number; height: number; label: string }> = {
  "9:16": { width: 1080, height: 1920, label: "9:16" },
  "16:9": { width: 1920, height: 1080, label: "16:9" },
  "1:1": { width: 1080, height: 1080, label: "1:1" },
  "4:5": { width: 1080, height: 1350, label: "4:5" },
};

const FPS = 30;
const TITLE_DURATION = 3;
const TRACK_HEIGHT = 32;
const LABEL_WIDTH = 240;
const RULER_HEIGHT = 30;

// Remotion Studio exact colors (sampled from screenshot)
const C = {
  bg: "#191b27",
  bgDarker: "#13141e",
  trackEven: "#1c1e2c",
  trackOdd: "#191b27",
  border: "#272937",
  textDim: "#5c5f77",
  textLabel: "#8b8ea3",
  playhead: "#f5222d",
  barBlue: "#3b82f6",
  barBlueDark: "#2563eb",
  barGreen: "#22a85a",
  barGreenDark: "#178a48",
  rulerBg: "#1c1e2c",
};

function App() {
  const [scenes, setScenes] = useState<Scene[]>(storyData.scenes as Scene[]);
  const [title, setTitle] = useState(storyData.title);
  const [ratio, setRatio] = useState<string>("9:16");
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const playerRef = useRef<PlayerRef>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const { width, height } = RATIOS[ratio];
  const story: Story = { title, scenes };

  const titleFrames = FPS * TITLE_DURATION;
  const totalFrames = titleFrames + scenes.reduce((s, sc) => s + sc.durationInSeconds * FPS, 0);
  const totalSeconds = totalFrames / FPS;

  const getSceneOffset = (idx: number) =>
    titleFrames + scenes.slice(0, idx).reduce((s, sc) => s + sc.durationInSeconds * FPS, 0);

  // Build tracks
  const tracks = [
    { label: "<Sequence>  Title", from: 0, duration: titleFrames, type: "title" as const, sceneIdx: -1 },
    ...scenes.map((sc, i) => ({
      label: `<Sequence>  Scene ${i + 1}`,
      from: getSceneOffset(i),
      duration: sc.durationInSeconds * FPS,
      type: "scene" as const,
      sceneIdx: i,
    })),
    ...scenes.filter((sc) => sc.audio).map((sc) => {
      const origIdx = scenes.indexOf(sc);
      return {
        label: `<Audio>  ${sc.audio}`,
        from: getSceneOffset(origIdx),
        duration: sc.durationInSeconds * FPS,
        type: "audio" as const,
        sceneIdx: origIdx,
      };
    }),
  ];

  // Player event listeners
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = () => { if (!isDraggingPlayhead) setCurrentFrame(player.getCurrentFrame()); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    player.addEventListener("frameupdate", onFrame as any);
    player.addEventListener("play", onPlay as any);
    player.addEventListener("pause", onPause as any);
    return () => {
      player.removeEventListener("frameupdate", onFrame as any);
      player.removeEventListener("play", onPlay as any);
      player.removeEventListener("pause", onPause as any);
    };
  }, [isDraggingPlayhead]);

  // Playhead dragging via mouse on entire timeline
  const seekFromMouse = useCallback((clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    const frame = Math.round(fraction * (totalFrames - 1));
    setCurrentFrame(frame);
    playerRef.current?.seekTo(frame);
  }, [totalFrames]);

  useEffect(() => {
    if (!isDraggingPlayhead) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      seekFromMouse(e.clientX);
    };
    const onUp = () => setIsDraggingPlayhead(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDraggingPlayhead, seekFromMouse]);

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    setIsDraggingPlayhead(true);
    playerRef.current?.pause();
    seekFromMouse(e.clientX);
  };

  // Scene drag-and-drop
  const onDragStart = (e: React.DragEvent, idx: number) => { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const onDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...scenes]; const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved); setScenes(updated);
    setSelectedScene(idx); setDragIdx(null); setDragOverIdx(null);
  };
  const onDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const onSceneClick = (idx: number) => { setSelectedScene(idx); playerRef.current?.seekTo(getSceneOffset(idx)); };

  const updateScene = (idx: number, field: keyof Scene, value: string | number) => {
    const updated = [...scenes]; updated[idx] = { ...updated[idx], [field]: value }; setScenes(updated);
  };
  const removeScene = (idx: number) => { setScenes(scenes.filter((_, i) => i !== idx)); setSelectedScene(null); };
  const addScene = () => { setScenes([...scenes, { narration: "New scene...", image: "scene1.jpg", durationInSeconds: 5 }]); setSelectedScene(scenes.length); };
  const exportJson = () => {
    const data = JSON.stringify({ title, scenes }, null, 2);
    const blob = new Blob([data], { type: "application/json" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "story.json"; a.click(); URL.revokeObjectURL(url);
  };
  const togglePlay = () => { if (isPlaying) playerRef.current?.pause(); else playerRef.current?.play(); };

  const formatTime = (frames: number) => {
    const secs = frames / FPS; const m = Math.floor(secs / 60); const s = Math.floor(secs % 60);
    const centis = Math.floor((secs % 1) * 100);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
  };

  // Time markers every 3 seconds
  const timeMarkers: { frame: number; label: string }[] = [];
  const markerInterval = FPS * 3;
  for (let f = 0; f <= totalFrames; f += markerInterval) timeMarkers.push({ frame: f, label: formatTime(f) });

  const playheadPct = `${(currentFrame / totalFrames) * 100}%`;
  const playerHeight = 460;
  const playerWidth = Math.round(playerHeight * (width / height));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, color: "#e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", userSelect: isDraggingPlayhead ? "none" : "auto" }}>

      {/* === TOP BAR === */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: C.bgDarker, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Story Editor</span>
          <span style={{ color: C.border }}>|</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ background: "transparent", border: "none", color: C.textLabel, fontSize: 13, outline: "none", width: 280 }} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {Object.entries(RATIOS).map(([key, val]) => (
            <button key={key} onClick={() => setRatio(key)} style={{ padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer", background: ratio === key ? C.barBlue : "#272937", color: ratio === key ? "#fff" : C.textDim, fontSize: 11, fontWeight: 500 }}>{val.label}</button>
          ))}
          <span style={{ color: C.border, margin: "0 4px" }}>|</span>
          <button onClick={addScene} style={{ padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer", background: "#272937", color: C.textDim, fontSize: 11 }}>+ Scene</button>
          <button onClick={exportJson} style={{ padding: "4px 12px", borderRadius: 4, border: "none", cursor: "pointer", background: C.barBlue, color: "#fff", fontSize: 11, fontWeight: 600 }}>Export</button>
        </div>
      </div>

      {/* === MAIN: Player + Properties === */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0e0f16" }}>
          <Player ref={playerRef} component={StoryVideo} inputProps={{ story }} durationInFrames={Math.max(1, totalFrames)} compositionWidth={width} compositionHeight={height} fps={FPS} style={{ width: playerWidth, height: playerHeight, borderRadius: 4 }} loop />
        </div>
        {selectedScene !== null && scenes[selectedScene] && (
          <div style={{ width: 280, borderLeft: `1px solid ${C.border}`, padding: 16, overflowY: "auto", flexShrink: 0, background: C.bgDarker }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: C.textLabel }}>Scene {selectedScene + 1}</h3>
              <button onClick={() => setSelectedScene(null)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <label style={labelStyle}>Narration</label>
            <textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} value={scenes[selectedScene].narration} onChange={(e) => updateScene(selectedScene, "narration", e.target.value)} />
            <label style={{ ...labelStyle, marginTop: 12 }}>Image</label>
            <input style={inputStyle} value={scenes[selectedScene].image} onChange={(e) => updateScene(selectedScene, "image", e.target.value)} />
            <label style={{ ...labelStyle, marginTop: 12 }}>Audio</label>
            <input style={inputStyle} value={scenes[selectedScene].audio || ""} onChange={(e) => updateScene(selectedScene, "audio", e.target.value)} />
            <label style={{ ...labelStyle, marginTop: 12 }}>Duration (s)</label>
            <input type="number" min={1} max={60} style={inputStyle} value={scenes[selectedScene].durationInSeconds} onChange={(e) => updateScene(selectedScene, "durationInSeconds", Number(e.target.value))} />
            <button onClick={() => removeScene(selectedScene)} style={{ marginTop: 16, width: "100%", padding: 8, borderRadius: 4, border: "1px solid #5c2020", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Delete Scene</button>
          </div>
        )}
      </div>

      {/* === BOTTOM: Timeline === */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, background: C.bgDarker }}>

        {/* Row 1: Timecode + Time Ruler */}
        <div style={{ display: "flex", position: "relative" }}>
          {/* Timecode display */}
          <div style={{ width: LABEL_WIDTH, flexShrink: 0, padding: "0 14px", borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, height: RULER_HEIGHT, background: C.bgDarker }}>
            <span style={{ fontSize: 15, fontFamily: "SF Mono, Monaco, Consolas, monospace", color: "#e2e8f0", fontWeight: 500, letterSpacing: -0.5 }}>
              {formatTime(currentFrame)}
            </span>
            <span style={{ fontSize: 12, fontFamily: "SF Mono, Monaco, Consolas, monospace", color: C.bgDarker, background: C.playhead, borderRadius: 3, padding: "1px 6px", fontWeight: 700 }}>
              {currentFrame}
            </span>
          </div>

          {/* Time ruler — draggable */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            style={{ flex: 1, position: "relative", height: RULER_HEIGHT, background: C.rulerBg, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
          >
            {/* Marker ticks + labels */}
            {timeMarkers.map((m) => {
              const pct = (m.frame / totalFrames) * 100;
              return (
                <React.Fragment key={m.frame}>
                  <div style={{ position: "absolute", left: `${pct}%`, bottom: 0, width: 1, height: 10, background: "#3a3c50" }} />
                  <span style={{ position: "absolute", left: `${pct}%`, top: 6, fontSize: 10, color: C.textDim, fontFamily: "SF Mono, Monaco, Consolas, monospace", transform: "translateX(4px)", whiteSpace: "nowrap", pointerEvents: "none" }}>
                    {m.label}
                  </span>
                </React.Fragment>
              );
            })}

            {/* Playhead handle — red diamond/triangle at top */}
            <div style={{
              position: "absolute", left: playheadPct, top: 0, zIndex: 20, transform: "translateX(-7px)", pointerEvents: "none",
            }}>
              {/* Triangle head */}
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: "block" }}>
                <path d="M7 14L1 4 Q0 2 2 1 L5 0 H9 L12 1 Q14 2 13 4 Z" fill={C.playhead} />
              </svg>
            </div>

            {/* Playhead line on ruler */}
            <div style={{ position: "absolute", left: playheadPct, top: 12, width: 2, height: RULER_HEIGHT - 12, background: C.playhead, transform: "translateX(-1px)", zIndex: 15, pointerEvents: "none" }} />
          </div>
        </div>

        {/* Row 2: Track rows */}
        <div style={{ overflowY: "auto", maxHeight: 250 }}>
          {tracks.map((track, tIdx) => {
            const isScene = track.type === "scene";
            const isAudio = track.type === "audio";
            const isTitle = track.type === "title";
            const isSelected = isScene && selectedScene === track.sceneIdx;
            const isDragOver = isScene && dragOverIdx === track.sceneIdx;
            const isDragging = isScene && dragIdx === track.sceneIdx;
            const barLeft = (track.from / totalFrames) * 100;
            const barWidth = (track.duration / totalFrames) * 100;
            const even = tIdx % 2 === 0;

            return (
              <div key={tIdx} style={{ display: "flex", height: TRACK_HEIGHT }}>
                {/* Track label */}
                <div
                  style={{
                    width: LABEL_WIDTH, flexShrink: 0, padding: "0 14px",
                    borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", gap: 10,
                    background: isSelected ? "#1a2540" : C.bgDarker, cursor: isScene ? "pointer" : "default",
                  }}
                  onClick={() => isScene && onSceneClick(track.sceneIdx)}
                >
                  {/* Eye/dot icon */}
                  <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${isAudio ? C.barGreen : C.barBlue}`, background: "transparent", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: C.textLabel }}>{track.label.split("  ")[0]}</span>
                    {"  "}
                    <span style={{ color: C.textDim }}>{track.label.split("  ")[1]}</span>
                  </span>
                </div>

                {/* Track area */}
                <div
                  onMouseDown={handleRulerMouseDown}
                  style={{
                    flex: 1, position: "relative",
                    background: isSelected ? "#161d30" : even ? C.trackEven : C.trackOdd,
                    borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer",
                  }}
                >
                  {/* Vertical grid lines */}
                  {timeMarkers.map((m) => (
                    <div key={m.frame} style={{ position: "absolute", left: `${(m.frame / totalFrames) * 100}%`, top: 0, width: 1, height: "100%", background: C.border, pointerEvents: "none" }} />
                  ))}

                  {/* Colored bar */}
                  <div
                    draggable={isScene}
                    onDragStart={isScene ? (e) => onDragStart(e, track.sceneIdx) : undefined}
                    onDragOver={isScene ? (e) => onDragOver(e, track.sceneIdx) : undefined}
                    onDrop={isScene ? () => onDrop(track.sceneIdx) : undefined}
                    onDragEnd={isScene ? onDragEnd : undefined}
                    onClick={(e) => { e.stopPropagation(); if (isScene) onSceneClick(track.sceneIdx); }}
                    style={{
                      position: "absolute",
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                      top: 4,
                      bottom: 4,
                      borderRadius: 4,
                      background: isAudio
                        ? `linear-gradient(180deg, ${C.barGreen}, ${C.barGreenDark})`
                        : isDragOver
                        ? "#5b9aff"
                        : `linear-gradient(180deg, ${C.barBlue}, ${C.barBlueDark})`,
                      opacity: isDragging ? 0.35 : 1,
                      cursor: isScene ? "grab" : "default",
                      display: "flex", alignItems: "center", paddingLeft: 10,
                      overflow: "hidden",
                      boxShadow: isSelected ? `0 0 0 1.5px #6aa3ff` : "none",
                      zIndex: 5,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isTitle ? "Title" : isAudio ? scenes[track.sceneIdx]?.audio : track.sceneIdx + 1}
                    </span>
                  </div>

                  {/* Playhead line through track */}
                  <div style={{ position: "absolute", left: playheadPct, top: 0, width: 2, height: "100%", background: C.playhead, transform: "translateX(-1px)", zIndex: 10, pointerEvents: "none" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 3: Transport bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 16px", borderTop: `1px solid ${C.border}`, background: C.bgDarker }}>
          <TBtn onClick={() => playerRef.current?.seekTo(0)}>⏮</TBtn>
          <TBtn onClick={() => playerRef.current?.seekTo(Math.max(0, currentFrame - 1))}>◀</TBtn>
          <TBtn onClick={() => playerRef.current?.seekTo(Math.max(0, currentFrame - FPS))}>⏪</TBtn>
          <TBtn onClick={togglePlay} active={isPlaying}>{isPlaying ? "⏸" : "▶"}</TBtn>
          <TBtn onClick={() => playerRef.current?.seekTo(Math.min(totalFrames - 1, currentFrame + FPS))}>⏩</TBtn>
          <TBtn onClick={() => playerRef.current?.seekTo(Math.min(totalFrames - 1, currentFrame + 1))}>▶</TBtn>
          <TBtn onClick={() => playerRef.current?.seekTo(totalFrames - 1)}>⏭</TBtn>
          <span style={{ color: C.border, margin: "0 8px" }}>|</span>
          <span style={{ fontSize: 12, color: C.textDim }}>{FPS} FPS</span>
          <Dot />
          <span style={{ fontSize: 12, color: C.textDim }}>{width}×{height}</span>
          <Dot />
          <span style={{ fontSize: 12, color: C.textDim }}>{scenes.length} scenes</span>
          <Dot />
          <span style={{ fontSize: 12, color: C.textDim }}>{totalSeconds.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
}

// Transport button
const TBtn: React.FC<{ onClick: () => void; active?: boolean; children: React.ReactNode }> = ({ onClick, active, children }) => (
  <button onClick={onClick} style={{
    width: 30, height: 28, borderRadius: 5, border: "none",
    background: active ? C.barBlue : "#272937", color: active ? "#fff" : "#8b8ea3",
    cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
  }}>{children}</button>
);

const Dot = () => <span style={{ fontSize: 12, color: C.textDim }}>·</span>;

const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, color: C.textDim, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg, color: "#e2e8f0", fontSize: 12, outline: "none", fontFamily: "inherit" };

createRoot(document.getElementById("root")!).render(<App />);
