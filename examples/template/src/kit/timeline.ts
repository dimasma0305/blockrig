// Shots, captions and music placed on the timeline from story.json (compiled from docs/) and the measured
// narration clips (assets/audio/timings.json). Shot lengths always come from the voice, never from guesses.

export type Word = { word: string; start: number; end: number };
export type StoryShot = {
  id: string; narration: string; captions?: { text: string; highlight?: string }[]; location?: string;
  action?: string; camera?: string; faces?: Record<string, string>; weather?: string; mood?: string; minSeconds?: number;
};
export type StoryFile = {
  title: string; slug: string; fps: number; width: number; height: number;
  voice?: { gapSeconds?: number; [k: string]: unknown }; music?: { theme: string; fromShot: string }[]; shots: StoryShot[];
};
export type Timings = { clips: Record<string, { duration: number; words: Word[] }>; music: { file: string; from: number; to: number; theme: string }[]; total: number };

export type Shot = StoryShot & {
  idx: number; faces: Record<string, string>; start: number; end: number; dur: number; startFrame: number; endFrame: number; audio: string | null;
};
export type Caption = { text: string; highlight: string; start: number; end: number; shot: string };
export type Timeline = ReturnType<typeof createTimeline>;

export function createTimeline(story: StoryFile, timings: Timings) {
  const FPS = story.fps, WIDTH = story.width, HEIGHT = story.height;
  const clips = timings?.clips ?? {};
  const gap = story.voice?.gapSeconds ?? 0.12;

  let t = 0;
  const SHOTS: Shot[] = story.shots.map((s, idx) => {
    const clip = clips[s.id];
    // no voice yet (fresh copy): estimate the line at ~2.7 words a second so the video still has its timing
    const est = s.narration ? s.narration.split(/\s+/).filter(Boolean).length / 2.7 : 0;
    const dur = Math.max((clip?.duration ?? est) + gap, s.minSeconds ?? 0, 0.5);
    const shot: Shot = { ...s, idx, faces: s.faces ?? {}, start: t, end: t + dur, dur, startFrame: Math.round(t * FPS), endFrame: Math.round((t + dur) * FPS), audio: clip ? `audio/${s.id}.wav` : null };
    t += dur;
    return shot;
  });
  const TOTAL = t, TOTAL_FRAMES = Math.max(1, Math.round(t * FPS));

  function shotAt(time: number): { shot: Shot; local: number; p: number } {
    let shot = SHOTS[SHOTS.length - 1];
    for (const s of SHOTS) if (time < s.end) { shot = s; break; }
    const local = time - shot.start;
    return { shot, local, p: Math.min(1, Math.max(0, local / shot.dur)) };
  }
  const byId = (id: string) => SHOTS.find((s) => s.id === id)!;

  // each caption covers the next N words of its shot's narration and pops in on its first word
  const CAPTIONS: Caption[] = [];
  SHOTS.forEach((shot) => {
    const n = shot.narration ? shot.narration.split(/\s+/).filter(Boolean).length : 0;
    const words = clips[shot.id]?.words ?? Array.from({ length: n }, (_, i) => ({ word: "", start: (i * (shot.dur - gap)) / Math.max(1, n), end: 0 }));
    let wi = 0;
    const caps: Caption[] = (shot.captions ?? []).map((c) => {
      const n = c.text.split(/\s+/).filter(Boolean).length, w = words[wi];
      wi += n;
      return { text: c.text, highlight: c.highlight ?? "", start: shot.start + (w ? w.start : 0), end: shot.end, shot: shot.id };
    });
    caps.forEach((c, k) => { if (k + 1 < caps.length) c.end = caps[k + 1].start; });
    CAPTIONS.push(...caps);
  });

  const MUSIC = timings?.music ?? [];
  return { story, FPS, WIDTH, HEIGHT, SHOTS, TOTAL, TOTAL_FRAMES, shotAt, byId, CAPTIONS, MUSIC };
}
