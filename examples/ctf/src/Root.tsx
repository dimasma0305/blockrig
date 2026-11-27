// Compositions: the video, plus debug tools (see src/debug/Labs.tsx). Shot plays one shot of the video with
// the debug overlay: choose it with input props { "shot": "s04" } in Studio, or `--props` on the CLI.
import { Composition, Folder, Sequence } from "remotion";
import { Video, type VideoProps } from "./Video";
import { T, FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from "./story";
import { Lineup, PoseLab, MaterialBoard, WeatherLab, POSE_SECONDS, WEATHER_SECONDS, WEATHER_PRESET_COUNT } from "./debug/Labs";
import { ALL } from "./cast/clips";

type ShotProps = { shot: string; debug: boolean };
const ShotView: React.FC<ShotProps> = ({ shot, debug }) => {
  const s = T.byId(shot) ?? T.SHOTS[0];
  return <Sequence from={-s.startFrame}><Video debug={debug} /></Sequence>;
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Story" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ debug: false } as VideoProps} />
    <Folder name="Debug">
      <Composition id="Shot" component={ShotView} fps={FPS} width={WIDTH} height={HEIGHT} durationInFrames={1}
        defaultProps={{ shot: T.SHOTS[0].id, debug: true } as ShotProps}
        calculateMetadata={({ props }) => { const s = T.byId(props.shot) ?? T.SHOTS[0]; return { durationInFrames: Math.max(1, s.endFrame - s.startFrame) }; }} />
      <Composition id="Lineup" component={Lineup} durationInFrames={FPS * 4} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="PoseLab" component={PoseLab} durationInFrames={Math.round(FPS * POSE_SECONDS * Object.keys(ALL).length)} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="MaterialBoard" component={MaterialBoard} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="WeatherLab" component={WeatherLab} durationInFrames={Math.round(FPS * WEATHER_SECONDS * WEATHER_PRESET_COUNT)} fps={FPS} width={WIDTH} height={HEIGHT} />
    </Folder>
  </>
);
