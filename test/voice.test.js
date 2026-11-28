// blockrig/voice: every narration problem from the videos' feedback logs, pinned so it can't come back.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  spellNumbers, normalizeWords, matchScore, wordCount, medianPitch, speechBounds, trimToSpeech, pauseAfter, addPauses, encodeWav,
  EMOTIONS, moodOf, emotionSettings, voiceOf, pitchLimit, maxTakeSeconds, judgeTake, alignWords, estimateWords,
  pace, pitchReport, wordTimeProblems, musicSections,
} from "../src/voice/index.js";

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ""} ${a} != ${b}`);
const SR = 16000;
const tone = (hz, sec, amp = 0.5) => Float32Array.from({ length: Math.round(sec * SR) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR));
const silence = (sec) => new Float32Array(Math.round(sec * SR));
const concat = (...xs) => { const y = new Float32Array(xs.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of xs) { y.set(x, o); o += x.length; } return y; };

test("voice: numbers are matched the way they are spoken ($5,000, 11) and homophones count as right", () => {
  assert.equal(spellNumbers("$5,000"), "five thousand dollars");
  assert.equal(spellNumbers("before 11"), "before eleven");
  assert.equal(spellNumbers("105 kids"), "one hundred five kids");
  assert.equal(matchScore("Mom took my $5,000.", "mom took my five thousand dollars"), 1);
  assert.equal(matchScore("Hack the Sun before eleven!", "Hack the sun before 11"), 1);
  assert.equal(matchScore("a bot-net and a flag", "a botnet an a flag"), 1, "spaces, hyphens and an/and don't count");
  assert.ok(matchScore("In this town, it rains", "In this down it trains") < 0.95, "wrong words fail");
  assert.deepEqual(normalizeWords("They're TOO late!"), ["there", "to", "late"]);
  assert.equal(wordCount("  one  two three "), 3);
});

test("voice: one narrator: an emotion per line, '!' panics, and every mood keeps the same voice (no pitch shift)", () => {
  assert.equal(moodOf({ text: "Rank... last!" }), "panic");
  assert.equal(moodOf({ text: "Rank... last.", emotion: "sad" }), "sad");
  assert.equal(moodOf({ text: "Hi", emotion: "nonsense" }), "neutral");
  for (const [k, e] of Object.entries(EMOTIONS)) assert.ok(Math.abs(e.tempo - 1) <= 0.05 + 1e-9, `${k}: tempo within 5%`);
  for (const e of Object.values(EMOTIONS)) assert.equal("pitch" in e, false, "no mood shifts pitch");
  assert.equal(emotionSettings("neutral", { exaggeration: 0.6 }).ex, 0.6);
  assert.equal(emotionSettings("panic", { panic: { gain: 4 } }).gain, 4);
  assert.equal(voiceOf({ speaker: "mom" }, { mom: { voice: "af_heart" } }), "mom", "dialogue: the speaker's own voice");
  assert.equal(voiceOf({ speaker: "dad" }, { mom: {} }), "narrator");
  assert.equal(pitchLimit("sad", false), 0.2, "drifting down stays strict (sad sounded like another voice)");
  assert.equal(pitchLimit("panic", true), 0.35); assert.equal(pitchLimit("panic", false), 0.2);
});

test("voice: a take is judged words first, then the voice, then length (babble is capped)", () => {
  const text = "In this town, it rains every night.";
  close(maxTakeSeconds(text), (7 / 2.5) * 1.8 + 1, 1e-9);
  const good = judgeTake({ text, heard: "in this town it rains every night", pitch: 150, refPitch: 145, mood: "neutral", duration: 2.5 });
  assert.ok(good.ok);
  const drift = judgeTake({ text, heard: "in this town it rains every night", pitch: 110, refPitch: 145, mood: "sad", duration: 2.5 });
  assert.ok(!drift.ok && drift.score < good.score, "another voice loses");
  const babble = judgeTake({ text, heard: "in this town it rains every night", pitch: 145, refPitch: 145, duration: 20 });
  assert.ok(babble.tooLong && !babble.ok);
  const wrong = judgeTake({ text, heard: "in this gown", pitch: 145, refPitch: 145, duration: 2 });
  assert.ok(wrong.score < drift.score, "wrong words lose to a pitch drift");
});

test("voice: caption word times use speech recognition only when it is sane", () => {
  const chunks = [{ timestamp: [0.1, 0.3] }, { timestamp: [0.35, 0.6] }, { timestamp: [0.7, 1.2] }];
  assert.deepEqual(alignWords("one two three", chunks, 1.3).map((w) => w.start), [0.1, 0.35, 0.7]);
  const nonsense = [{ timestamp: [5, 6] }, { timestamp: [5, 6] }, { timestamp: [5, 6] }];
  const spread = alignWords("one two three", nonsense, 1.3);
  assert.ok(spread.every((w) => w.end <= 1.3), "times past the end are not used");
  assert.ok(spread[1].start > spread[0].start);
  const est = estimateWords("hello wonderful world", [{ start: 0, end: 1 }, { start: 1.2, end: 2 }], 2);
  assert.equal(est.length, 3); assert.ok(est.every((w, i) => i === 0 || w.start >= est[i - 1].start));
});

test("voice: pitch is measured by YIN at the bottom of the dip (the scripts read ~7% low) with no octave errors", () => {
  for (const hz of [100, 150, 220, 300]) close(medianPitch(tone(hz, 0.5)), hz, hz * 0.015, `${hz} Hz`);
  assert.equal(medianPitch(silence(0.5)), 0);
});

test("voice: clips are trimmed to their speech (TTS padding made long gaps), word times move with them", () => {
  const x = concat(silence(0.5), tone(150, 1), silence(0.8));
  const b = speechBounds(x, SR); close(b.from, 0.47, 0.02); close(b.to, 1.56, 0.02);
  const t = trimToSpeech(x, SR, [{ word: "hi", start: 0.6, end: 1.4 }]);
  close(t.words[0].start, 0.13, 0.02); close(t.duration, 1.09, 0.03);
});

test("voice: commas and stops get real silence, cut only into silence (no glitch inside a word)", () => {
  assert.equal(pauseAfter("town,"), 0.22); assert.equal(pauseAfter("last..."), 0.4); assert.equal(pauseAfter("NASA!\""), 0.4); assert.equal(pauseAfter("hack"), 0);
  // "In this town, it rains": a short real gap after "town," is widened to 0.22 s
  const x = concat(tone(150, 0.6), silence(0.05), tone(150, 0.6));
  const words = [{ word: "town,", start: 0, end: 0.6 }, { word: "it", start: 0.65, end: 1.25 }];
  const r = addPauses(x, SR, words);
  assert.equal(r.added, 1); close(r.x.length / SR - x.length / SR, 0.17, 0.02);
  close(r.words[1].start - words[1].start, 0.17, 0.02, "the next word moves with the cut");
  // "hills. Sawit" said with no gap at all: nothing is cut (cutting inside a word is the glitch)
  const run = tone(150, 1.2), r2 = addPauses(run, SR, [{ word: "hills.", start: 0, end: 0.6 }, { word: "Sawit", start: 0.6, end: 1.2 }]);
  assert.equal(r2.added, 0); assert.equal(r2.x, run);
  const wav = encodeWav(tone(150, 0.1), SR); assert.equal(String.fromCharCode(...wav.slice(0, 4)), "RIFF"); assert.equal(wav.length, 44 + 1600 * 2);
});

test("voice: pace is measured over the spoken shots (~160 wpm; 305 was too fast)", () => {
  const shots = [{ narration: "one two three four five six seven eight" }, { narration: "" , minSeconds: 2 }, { narration: "nine ten" }];
  const ok = pace(shots, 2 + 60 * 10 / 160); close(ok.wpm, 160, 0.5); assert.equal(ok.problem, undefined); assert.equal(ok.silent, 2);
  assert.match(pace(shots, 2 + 60 * 10 / 305).problem, /rushed/);
  assert.match(pace(shots, 2 + 60 * 10 / 100).problem, /drags/);
});

test("voice: each voice is checked against its own median pitch; caption times are checked", () => {
  const clips = [["a", 150], ["b", 148], ["c", 152], ["d", 110, "sad"], ["e", 195, "panic"], ["m1", 230, , "mom"], ["m2", 228, , "mom"], ["m3", 232, , "mom"]].map(([id, pitch, mood, speaker]) => ({ id, pitch, mood, speaker }));
  const r = pitchReport(clips, { mom: {} });
  close(r.medians.narrator, 150, 0.01); close(r.medians.mom, 230, 0.01);
  assert.ok(r.problems.some((p) => p.startsWith("d:")), "sad drifting 27% down is another voice");
  assert.ok(!r.problems.some((p) => p.startsWith("e:")), "panic 30% up is allowed");
  assert.ok(!r.problems.some((p) => p.startsWith("m")), "mom is compared with mom");
  assert.deepEqual(wordTimeProblems("s01", { duration: 1, words: [{ word: "a", start: 0.5 }, { word: "b", start: 0.2 }] }), ['s01: word times go backwards at "b"']);
  assert.match(wordTimeProblems("s02", { duration: 1, words: [{ word: "a", start: 1.5 }] })[0], /after the clip ends/);
});

test("voice: music sections follow the shots, and theme none is silence", () => {
  const story = { voice: { gapSeconds: 0.5 }, shots: [{ id: "s01" }, { id: "s02" }, { id: "s03", minSeconds: 4 }], music: [{ theme: "goofy-piano", fromShot: "s01" }, { theme: "none", fromShot: "s03" }] };
  const m = musicSections(story, { s01: 2, s02: 1.5 });
  close(m.total, 2.5 + 2 + 4, 1e-9);
  assert.deepEqual(m.sections.map((s) => [s.theme, s.from, s.to, s.silent]), [["goofy-piano", 0, 4.5, false], ["none", 4.5, 8.5, true]]);
});
