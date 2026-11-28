export type Word = { word: string; start: number; end: number };
export type Line = { id?: string; text?: string; narration?: string; emotion?: string; speaker?: string };
export type Emotion = { ex: number; cfg: number; tempo: number; gain: number };

// ---- text
export function numberWords(n: number): string;
export function spellNumbers(s: string): string;
export function normalizeWords(s: string): string[];
export function matchScore(script: string, heard: string): number;
export function wordCount(s: string | undefined): number;
export function syllables(word: string): number;

// ---- audio (mono Float32 PCM, -1..1)
export function medianPitch(x: Float32Array, sr?: number, o?: { minHz?: number; maxHz?: number; threshold?: number }): number;
export function speechBounds(x: Float32Array, sr: number, o?: { quiet?: number; pad?: number; tail?: number }): { from: number; to: number };
export function trimToSpeech(x: Float32Array, sr: number, words?: Word[], o?: { quiet?: number; pad?: number; tail?: number }): { x: Float32Array; from: number; to: number; duration: number; words: Word[] };
export type PauseOpts = { commaPause?: number; stopPause?: number };
export function pauseAfter(word: string, o?: PauseOpts): number;
export function addPauses(x: Float32Array, sr: number, words: Word[], o?: PauseOpts): { x: Float32Array; words: Word[]; added: number };
export function encodeWav(x: Float32Array, sr: number): Uint8Array;

// ---- takes
export const EMOTIONS: Record<string, Emotion>;
export const EMOTION_NAMES: string[];
export const LOUD_EMOTIONS: string[];
export function moodOf(line: Line): string;
export function emotionSettings(mood: string, cfg?: { exaggeration?: number; cfg?: number; [mood: string]: any }): Emotion;
export function voiceOf(line: Line, voices?: Record<string, unknown>): string;
export function pitchLimit(mood: string, up: boolean): number;
export function maxTakeSeconds(text: string): number;
export function judgeTake(t: { text: string; heard: string; pitch?: number; refPitch?: number; mood?: string; duration?: number }): { score: number; match: number; off: number; limit: number; tooLong: boolean; ok: boolean };
export function alignWords(text: string, chunks: { text?: string; timestamp: [number, number | null] }[] | undefined, duration: number): Word[];
export function estimateWords(text: string, phrases: { start: number; end: number; text?: string }[] | undefined, duration: number): Word[];

// ---- checks
export function pace(shots: { narration?: string; minSeconds?: number }[], total: number, o?: { target?: number; fast?: number; slow?: number }): { words: number; seconds: number; silent: number; wpm: number; problem?: string };
export function pitchReport(clips: { id: string; pitch: number; mood?: string; speaker?: string }[], voices?: Record<string, unknown>): { medians: Record<string, number>; outliers: { id: string; voice: string; pitch: number; median: number; off: number }[]; problems: string[]; notes: string[] };
export function wordTimeProblems(id: string, clip: { duration: number; words?: Word[] } | undefined): string[];
export function musicSections(story: { voice?: { gapSeconds?: number }; shots: { id: string; minSeconds?: number }[]; music?: { theme: string; fromShot: string }[] }, durations: Record<string, number>): { total: number; sections: { theme: string; index: number; silent: boolean; from: number; to: number }[] };
