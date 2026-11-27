// Shots, captions and music placed on the timeline from story.json and the measured narration clips.
import story from "../story.json";
import timings from "../public/audio/timings.json";

export const FPS: number = story.fps;
export const WIDTH: number = story.width;
export const HEIGHT: number = story.height;

type Word = { word: string; start: number; end: number };
export type Shot = {
  id: string; idx: number; narration: string; location: string; faces: Record<string, string>;
  start: number; end: number; dur: number; startFrame: number; endFrame: number;
  audio: string | null;
};
export type Caption = { text: string; highlight: string; start: number; end: number; shot: string };

const clips = (timings as any).clips as Record<string, { duration: number; words: Word[] }>;
const gap: number = (story as any).voice?.gapSeconds ?? 0.12;

let t = 0;
export const SHOTS: Shot[] = story.shots.map((s: any, idx: number) => {
  const clip = clips[s.id];
  const dur = Math.max((clip?.duration ?? 0) + gap, s.minSeconds ?? 0);
  const shot: Shot = {
    id: s.id, idx, narration: s.narration, location: s.location, faces: s.faces ?? {},
    start: t, end: t + dur, dur, startFrame: Math.round(t * FPS), endFrame: Math.round((t + dur) * FPS),
    audio: clip ? `audio/${s.id}.wav` : null,
  };
  t += dur;
  return shot;
});
export const TOTAL: number = t;
export const TOTAL_FRAMES: number = Math.round(t * FPS);

export function shotAt(time: number): { shot: Shot; local: number; p: number } {
  let shot = SHOTS[SHOTS.length - 1];
  for (const s of SHOTS) if (time < s.end) { shot = s; break; }
  const local = time - shot.start;
  return { shot, local, p: Math.min(1, Math.max(0, local / shot.dur)) };
}
export const byId = (id: string) => SHOTS.find((s) => s.id === id)!;

// captions: each caption covers the next N words of its shot's narration and starts on its first word
export const CAPTIONS: Caption[] = [];
story.shots.forEach((s: any, i: number) => {
  const shot = SHOTS[i], words = clips[s.id]?.words ?? [];
  let wi = 0;
  const caps: Caption[] = (s.captions ?? []).map((c: any) => {
    const n = c.text.split(/\s+/).filter(Boolean).length;
    const w = words[wi];
    wi += n;
    return { text: c.text, highlight: c.highlight ?? "", start: shot.start + (w ? w.start : 0), end: shot.end, shot: s.id };
  });
  caps.forEach((c, k) => { if (k + 1 < caps.length) c.end = caps[k + 1].start; });
  CAPTIONS.push(...caps);
});

export const MUSIC: { file: string; from: number; to: number; theme: string }[] = (timings as any).music;
