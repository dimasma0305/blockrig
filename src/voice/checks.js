// Checks an agent can run without hearing the video (npm run check), and the music sections. Fixes from the logs:
//   - "the speech is too fast" (305 wpm): pace is measured over the spoken shots (silent beats held for their `min`
//     are deliberate) against ~160 wpm; over 190 is rushed, under 130 drags;
//   - "sounds like another voice": each voice's clips are compared with that voice's median pitch;
//   - captions that start after their clip ends, or word times that go backwards;
//   - "the music stops here": a music section with theme `none` is silence.
import { wordCount } from "./text.js";
import { voiceOf, pitchLimit } from "./takes.js";

/** Pace over the spoken shots: `{ words, seconds, silent, wpm, problem? }`. */
export function pace(shots, total, { target = 160, fast = 190, slow = 130 } = {}) {
  const words = shots.reduce((n, s) => n + wordCount(s.narration), 0);
  const silent = shots.filter((s) => !s.narration).reduce((t, s) => t + Math.max(s.minSeconds ?? 0, 0.5), 0);
  const seconds = Math.max(1, total - silent), wpm = (60 * words) / seconds;
  const problem = wpm > fast ? `pace ${wpm.toFixed(0)} wpm is rushed (target ~${target}): lower "tempo" or raise "gap" in docs/audio.md`
    : wpm < slow ? `pace ${wpm.toFixed(0)} wpm drags (target ~${target}): raise "tempo" or shorten "gap"/"min" holds` : undefined;
  return { words, seconds, silent, wpm, problem };
}

/**
 * One voice per speaker: each voice's clips against that voice's median pitch. `clips`: `[{ id, pitch, mood, speaker }]`.
 * Returns `{ medians: { voice: Hz }, outliers: [{ id, voice, pitch, median, off }], problems, notes }` (needs 3+
 * clips per voice). Voicing takes against the voice sample's pitch and checking against the median of the finished
 * takes can disagree (template: a take +34% from the sample was +37% from the median): re-voice the outliers
 * against the median.
 */
export function pitchReport(clips, voices = {}) {
  const byVoice = new Map(), medians = {}, outliers = [], problems = [], notes = [];
  for (const c of clips) if (c.pitch > 0) { const v = voiceOf(c, voices); if (!byVoice.has(v)) byVoice.set(v, []); byVoice.get(v).push(c); }
  for (const [v, cs] of byVoice) {
    if (cs.length < 3) continue;
    const sorted = cs.map((c) => c.pitch).sort((a, b) => a - b), median = sorted[sorted.length >> 1];
    medians[v] = median;
    for (const c of cs) {
      const d = c.pitch / median - 1, limit = pitchLimit(c.mood ?? "neutral", d > 0);
      if (Math.abs(d) > limit) outliers.push({ id: c.id, voice: v, pitch: c.pitch, median, off: d });
      if (Math.abs(d) > limit) problems.push(`${c.id}: voice pitch ${c.pitch.toFixed(0)} Hz is ${(d * 100).toFixed(0)}% off ${v}'s ${median.toFixed(0)} Hz (sounds like another voice)`);
      else if (Math.abs(d) > 0.12) notes.push(`${c.id}: voice pitch ${(d * 100).toFixed(0)}% off ${v}'s median`);
    }
  }
  return { medians, outliers, problems, notes };
}

/** Problems with one clip's word times: they go backwards, or a word starts after the clip ends. */
export function wordTimeProblems(id, clip) {
  const out = [], ws = clip?.words ?? [];
  let last = -1;
  for (const w of ws) { if (w.start < last - 1e-3) { out.push(`${id}: word times go backwards at "${w.word}"`); break; } last = w.start; }
  if (ws.length && ws.at(-1).start > clip.duration + 0.05) out.push(`${id}: a caption word starts after the clip ends`);
  return out;
}

/**
 * Music sections from the story's `music` list (`[{ theme, fromShot }]`) and each shot's clip length: each section
 * runs from its shot's start to the next section's. Theme `none` is silence. `[{ theme, from, to, index }]`.
 */
export function musicSections(story, durations) {
  const gap = story.voice?.gapSeconds ?? 0.12;
  let total = 0; const starts = {};
  for (const s of story.shots) { starts[s.id] = total; total += Math.max((durations[s.id] ?? 0) + gap, s.minSeconds ?? 0); }
  const music = story.music ?? [];
  return { total, sections: music.map((m, i) => ({ theme: m.theme, index: i, silent: m.theme === "none", from: starts[m.fromShot] ?? 0, to: i + 1 < music.length ? starts[music[i + 1].fromShot] ?? total : total })) };
}
