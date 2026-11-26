import { Composition } from "remotion";
import { Story } from "./Story";
import { FPS, TOTAL_FRAMES, WIDTH, HEIGHT } from "./timeline";

export const RemotionRoot: React.FC = () => (
  <Composition id="Story" component={Story} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
