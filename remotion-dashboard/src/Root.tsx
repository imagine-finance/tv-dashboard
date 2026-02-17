import { Composition } from "remotion";
import { Dashboard } from "./Dashboard";

// 4 scenes x 7 seconds = 28 seconds, at 30fps = 840 frames
const FPS = 30;
const SCENE_DURATION = 7;
const SCENE_COUNT = 4;
const TOTAL_FRAMES = FPS * SCENE_DURATION * SCENE_COUNT;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Dashboard"
      component={Dashboard}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
