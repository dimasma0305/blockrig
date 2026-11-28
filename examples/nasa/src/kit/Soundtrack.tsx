// Narration clips on their shots and the music sections under them. Files are served from assets/ (the
// Remotion public folder), where `npm run voice` writes them.
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import type { Timeline } from "blockrig/video";

export const Soundtrack: React.FC<{ timeline: Timeline; musicVolume?: number; voiceVolume?: number }> = ({ timeline, musicVolume = 0.2, voiceVolume = 1 }) => {
  const { SHOTS, MUSIC, FPS } = timeline;
  return (
    <>
      {SHOTS.filter((s) => s.audio).map((s) => (
        <Sequence key={s.id} from={s.startFrame} durationInFrames={s.endFrame - s.startFrame + 30} name={`voice ${s.id}`}>
          <Audio src={staticFile(s.audio!)} volume={voiceVolume} />
        </Sequence>
      ))}
      {MUSIC.map((m, i) => m.file && (
        <Sequence key={i} from={Math.round(m.from * FPS)} durationInFrames={Math.max(1, Math.round((m.to - m.from) * FPS))} name={`music ${m.theme}`}>
          <Audio src={staticFile(m.file)} volume={musicVolume} />
        </Sequence>
      ))}
    </>
  );
};
