import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { StoryVideo } from "./StoryVideo";
import type { Story } from "./types";
import storyData from "../public/story.json";

const story = storyData as Story;

// Calculate total duration from story data
const fps = 30;
const titleDuration = fps * 3;
const sceneDuration = story.scenes.reduce(
  (sum, s) => sum + s.durationInSeconds * fps,
  0
);
const totalDuration = titleDuration + sceneDuration;

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
