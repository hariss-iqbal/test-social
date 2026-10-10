import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { StoryVideo } from "./StoryVideo";
import { ShortVideo } from "./short/ShortVideo";
import { Cover } from "./short/Cover";
import { WhatIfVideo } from "./whatif/WhatIfVideo";
import type { WhatIfProps } from "./whatif/types";
import type { CoverProps, ShortProps } from "./short/types";
import type { Story } from "./types";
import storyData from "../public/story.json";

const story = storyData as Story;

// Legacy StoryVideo (used by editor/). Pipeline renders use "Short" below.
const fps = 30;
const titleDuration = fps * 3;
const sceneDuration = story.scenes.reduce((sum, s) => sum + s.durationInSeconds * fps, 0);
const totalDuration = titleDuration + sceneDuration;

const emptyTimeline: ShortProps = {
  timeline: {
    fps: 30, width: 1080, height: 1920, durationInFrames: 30,
    shots: [], captions: [], overlays: [],
    safe: { top: 220, bottom: 1440, left: 60, right: 930 },
  },
};

const emptyWhatIf: WhatIfProps = {
  timeline: {
    fps: 30, width: 1080, height: 1920, durationInFrames: 30, kit: "city", seed: 1,
    params: {}, camera: [], captions: [], hud: [], title: null, endCard: null, flashes: [],
  },
};

const emptyCover: CoverProps = { src: "", srcW: 1080, srcH: 1920, focus: [0.5, 0.5], crop: null, text: "COVER TEXT", keyword: "text", circle: null };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Short"
        component={ShortVideo}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={30}
        defaultProps={emptyTimeline}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.timeline.durationInFrames,
          fps: props.timeline.fps,
          width: props.timeline.width,
          height: props.timeline.height,
        })}
      />
      {/* "whatif" profile: one continuous 3D world (src/whatif) */}
      <Composition
        id="WhatIf"
        component={WhatIfVideo}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={30}
        defaultProps={emptyWhatIf}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.timeline.durationInFrames,
          fps: props.timeline.fps,
          width: props.timeline.width,
          height: props.timeline.height,
        })}
      />
      {/* G5: cover still, rendered by `renderShort.ts <topic> out.jpg --cover` from timeline.cover */}
      <Composition
        id="Cover"
        component={Cover}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={1}
        defaultProps={emptyCover}
      />
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="StoryVideo"
        component={StoryVideo}
        durationInFrames={totalDuration}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ story }}
      />
    </>
  );
};
