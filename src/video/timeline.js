// The video's timeline: shots, captions and music placed from the story (story.json, compiled from docs/) and the
// measured voice clips (timings.json). Shot lengths always come from the voice, never from guesses; before there is
// a voice, a line is estimated at 2.7 words a second so a fresh video still has its timing. Frame-pure: nothing
// here depends on what was drawn before. BlockRig extra.
//
//   const T = createTimeline(story, timings);
//   const { shot, local, p } = T.shotAt(frame / T.FPS);   // the shot at this time, seconds into it, progress 0..1
//   shotClock(shot, local)                                // a clock for animation that doesn't depend on the shot's position
//   T.CAPTIONS                                            // each pops in on its first spoken word
//   speakersOf(T, { mom: { name: "MOM", colour: "#d6457a" } })   // shot id -> speaker tag for dialogue lines

const words = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
/** A stable number 0..999 from a string (a shot id): seeds that stay the same wherever the shot sits. */
export function seedOf(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000; }
/** A clock for a shot: seconds into it plus the shot's own seed, so animation (clouds, particles, shake) looks the same
 *  wherever the shot sits in the video, and differs from shot to shot. */
export const shotClock = (shot, local) => shot.seed + local;

/**
 * @param {object} story `{ fps, width, height, voice?: { gapSeconds }, shots: [{ id, narration, captions?, speaker?, minSeconds?, ... }] }`
 * @param {object} [timings] `{ clips: { [shotId]: { duration, words: [{ word, start, end }] } }, music: [...] }`
 */
export function createTimeline(story, timings) {
  const FPS = story.fps, WIDTH = story.width, HEIGHT = story.height;
  const clips = timings?.clips ?? {};
  const gap = story.voice?.gapSeconds ?? 0.12;

  // Every shot is a whole number of frames, counted on from the shot before: a shot's frames then depend only on the
  // shot itself (its own voice and notes), never on where earlier shots ended. That is what lets a render reuse a shot
  // when another line is re-voiced (the template's render cache).
  let frames = 0;
  const SHOTS = story.shots.map((s, idx) => {
    const clip = clips[s.id];
    const est = words(s.narration) / 2.7;
    const seconds = Math.max((clip?.duration ?? est) + gap, s.minSeconds ?? 0, 0.5), n = Math.max(1, Math.round(seconds * FPS));
    const shot = { ...s, idx, faces: s.faces ?? {}, start: frames / FPS, end: (frames + n) / FPS, dur: n / FPS, startFrame: frames, endFrame: frames + n, audio: clip ? `audio/${s.id}.wav` : null,
      // a seed of the shot's own, for anything that wants a clock or randomness that is the same wherever the shot sits
      seed: seedOf(s.id) };
    frames += n;
    return shot;
  });
  const TOTAL_FRAMES = Math.max(1, frames), TOTAL = TOTAL_FRAMES / FPS;

  function shotAt(time) {
    let shot = SHOTS[SHOTS.length - 1];
    for (const s of SHOTS) if (time < s.end) { shot = s; break; }
    const local = time - shot.start;
    return { shot, local, p: Math.min(1, Math.max(0, local / shot.dur)) };
  }
  const byId = (id) => SHOTS.find((s) => s.id === id);

  // each caption covers the next N words of its shot's narration and pops in on its first word
  const CAPTIONS = [];
  for (const shot of SHOTS) {
    const n = words(shot.narration);
    const ws = clips[shot.id]?.words ?? Array.from({ length: n }, (_, i) => ({ word: "", start: (i * (shot.dur - gap)) / Math.max(1, n), end: 0 }));
    let wi = 0;
    const caps = (shot.captions ?? []).map((c) => {
      const w = ws[wi];
      wi += words(c.text);
      return { text: c.text, highlight: c.highlight ?? "", start: shot.start + (w ? w.start : 0), end: shot.end, shot: shot.id, speaker: shot.speaker ?? null };
    });
    caps.forEach((c, k) => { if (k + 1 < caps.length) c.end = caps[k + 1].start; });
    CAPTIONS.push(...caps);
  }
  /** The caption showing at `time` (seconds), or null. */
  const captionAt = (time) => CAPTIONS.find((c) => time >= c.start && time < c.end) ?? null;

  const MUSIC = timings?.music ?? [];
  return { story, FPS, WIDTH, HEIGHT, SHOTS, TOTAL, TOTAL_FRAMES, shotAt, byId, CAPTIONS, captionAt, MUSIC };
}

/** Shot id -> the speaker tag of each dialogue shot (`speaker:` in the shot list) whose speaker is in `roster`. */
export function speakersOf(timeline, roster) {
  const out = {};
  for (const s of timeline.SHOTS) if (s.speaker && roster[s.speaker]) out[s.id] = roster[s.speaker];
  return out;
}
