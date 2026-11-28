// blockrig/voice: the decisions behind a story short's narration, tested once here instead of copied into each
// video's scripts. Pure JavaScript with no dependencies (Node or browser): the video runs the speech models
// (Chatterbox, Kokoro, Whisper) and ffmpeg, and asks this module what to voice, whether a take is good, where the
// pauses go and whether the result is paced right. BlockRig extra.
export { numberWords, spellNumbers, normalizeWords, matchScore, wordCount, syllables } from "./text.js";
export { medianPitch, speechBounds, trimToSpeech, pauseAfter, addPauses, encodeWav } from "./audio.js";
export { EMOTIONS, EMOTION_NAMES, LOUD_EMOTIONS, moodOf, emotionSettings, voiceOf, pitchLimit, maxTakeSeconds, judgeTake, alignWords, estimateWords } from "./takes.js";
export { pace, pitchReport, wordTimeProblems, musicSections } from "./checks.js";
