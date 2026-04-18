export interface Scene {
  narration: string;
  image: string;
  audio?: string;
  durationInSeconds: number;
}

export interface Story {
  title: string;
  scenes: Scene[];
}

export interface StoryVideoProps {
  story: Story;
}
