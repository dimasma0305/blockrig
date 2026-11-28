// The video's timeline: shots, captions and music placed from the story (story.json, compiled from docs/) and the
// measured voice clips (timings.json). Shot lengths always come from the voice, never from guesses; before there is
// a voice, a line is estimated at 2.7 words a second so a fresh video still has its timing. Frame-pure: nothing
// here depends on what was drawn before. BlockRig extra.
//
//   const T = createTimeline(story, timings);
//   const { shot, local, p } = T.shotAt(frame / T.FPS);   // the shot at this time, seconds into it, progress 0..1
//   T.CAPTIONS                                            // each pops in on its first spoken word
//   speakersOf(T, { mom: { name: "MOM", colour: "#d6457a" } })   // shot id -> speaker tag for dialogue lines

const words = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);

/**
 * @param {object} story `{ fps, width, height, voice?: { gapSeconds }, shots: [{ id, narration, captions?, speaker?, minSeconds?, ... }] }`
 * @param {object} [timings] `{ clips: { [shotId]: { duration, words: [{ word, start, end }] } }, music: [...] }`
 */
export function createTimeline(story, timings) {
  const FPS = story.fps, WIDTH = story.width, HEIGHT = story.height;
  const clips = timings?.clips ?? {};
  const gap = story.voice?.gapSeconds ?? 0.12;

  let t = 0;
  const SHOTS = story.shots.map((s, idx) => {
    const clip = clips[s.id];
    const est = words(s.narration) / 2.7;
    const dur = Math.max((clip?.duration ?? est) + gap, s.minSeconds ?? 0, 0.5);
    const shot = { ...s, idx, faces: s.faces ?? {}, start: t, end: t + dur, dur, startFrame: Math.round(t * FPS), endFrame: Math.round((t + dur) * FPS), audio: clip ? `audio/${s.id}.wav` : null,
      // the spoken words in video time (lip sync: mouthAt(shot.words, time))
      words: (clip?.words ?? []).map((w) => ({ word: w.word, start: t + w.start, end: t + w.end })) };
    t += dur;
    return shot;
  });
  const TOTAL = t, TOTAL_FRAMES = Math.max(1, Math.round(t * FPS));

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
