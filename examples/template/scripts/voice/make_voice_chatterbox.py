"""Expressive narration with Chatterbox (Resemble AI, MIT), with the voice taken from a Kokoro clip.

Chatterbox copies a voice from a short sample and adds natural intonation, with an `exaggeration` control
for emotion. The samples are made here with Kokoro (an open model, Apache 2.0) reading our own text, so no real
person's voice is copied. Every line has an EMOTION (neutral, happy, excited, panic, shocked, scared, sad,
serious, smug, angry, whisper): it picks a voice sample read in that mood (Chatterbox copies the delivery as well
as the voice), the exaggeration and pacing, and a little pitch, tempo and volume shaping. Without one, a line
ending in "!" is "panic" and the rest are "neutral". Very short lines (Chatterbox garbles one- or two-word inputs) and any take that fails the check fall
back to Kokoro in the same voice. Every take is transcribed with faster-whisper and retried until its words
match the script, and the final clip's word times come from that transcription.

Runs in its own environment (torch + CUDA): see the voice skill. Usage (make-audio.mjs calls it once):
  python make_voice_chatterbox.py --lines lines.json --config '{"voice": "am_adam", ...}'
lines.json: [{ "id": "s01", "text": "...", "out": "public/audio/s01.wav" }]
Writes each <out> (48 kHz mono) and <out>.json: { duration, words: [{ word, start, end }] }.
"""
import argparse, difflib, hashlib, json, os, re, shutil, subprocess, tempfile
import numpy as np, soundfile as sf
import torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel
from kokoro_onnx import Kokoro

ap = argparse.ArgumentParser()
ap.add_argument("--lines", required=True)
ap.add_argument("--config", default="{}")
a = ap.parse_args()
cfg = {"voice": "am_adam", "pitch": 1.35, "exaggeration": 0.9, "cfg": 0.35, "tempo": 1.0,
       "panic": {"exaggeration": 1.4, "cfg": 0.3, "gain": 2.0},
       "prompt": "In this world, everybody plays the game. Even the bakery hides a secret in its receipts. "
                 "Kids learn it before they can read. And me? I'm ranked last. Tonight is the final.",
       **json.loads(a.config)}
# ex = Chatterbox exaggeration (emotion strength), cfg = cfg_weight (lower = faster, looser),
# tempo = time-stretch, gain = loudness in dB vs neutral, fx = extra ffmpeg filters, prompt = which voice sample
EMOTIONS = {
    # The narrator stays ONE person. Every mood clones the SAME voice sample ("neutral"): separate excited / sad /
    # serious samples made each line sound like a different speaker, and the user could not follow the story.
    # Emotion comes only from how strongly the line is performed (exaggeration, cfg) plus a little tempo (+-5%)
    # and loudness. No pitch shifting, no filters, no fast "deadpan" tempo (it made the hook hard to catch).
    "neutral": {"ex": cfg["exaggeration"], "cfg": cfg["cfg"], "tempo": 1.0, "gain": 0},
    "flat":    {"ex": 0.45, "cfg": 0.5, "tempo": 1.0, "gain": 0},     # calm, matter-of-fact: a strange rule stated plainly
    "happy":   {"ex": 1.0, "cfg": 0.4, "tempo": 1.0, "gain": 0.5},
    "excited": {"ex": 1.05, "cfg": 0.38, "tempo": 1.03, "gain": 1.5},
    "panic":   {"ex": 1.2, "cfg": 0.32, "tempo": 1.04, "gain": 2.0},
    "shocked": {"ex": 0.95, "cfg": 0.4, "tempo": 1.0, "gain": 1.5},
    "scared":  {"ex": 0.9, "cfg": 0.35, "tempo": 1.0, "gain": -1},
    "sad":     {"ex": 0.5, "cfg": 0.55, "tempo": 0.95, "gain": -2},
    "serious": {"ex": 0.55, "cfg": 0.5, "tempo": 0.97, "gain": -1},
    "smug":    {"ex": 0.75, "cfg": 0.5, "tempo": 0.97, "gain": 0},
    "angry":   {"ex": 1.1, "cfg": 0.4, "tempo": 1.02, "gain": 2.5},
    "whisper": {"ex": 0.45, "cfg": 0.55, "tempo": 0.95, "gain": -5},
}
for e in EMOTIONS.values(): e["prompt"] = "neutral"
# legacy "panic" block from docs/audio.md tunes the panic emotion
if cfg.get("panic"):
    pz = cfg["panic"]; EMOTIONS["panic"].update({k2: pz[k1] for k1, k2 in [("exaggeration", "ex"), ("cfg", "cfg"), ("gain", "gain")] if k1 in pz})
for name, over in (cfg.get("emotions") or {}).items(): EMOTIONS.setdefault(name, dict(EMOTIONS["neutral"])).update(over)
# the voice samples: our own lines read by Kokoro in each mood (speed and level shape the delivery Chatterbox copies)
PROMPTS = {  # (text, Kokoro speed): the ONE voice sample every line clones (see EMOTIONS)
    "neutral": (cfg["prompt"], 0.95),
}
lines = json.load(open(a.lines, encoding="utf8"))

dev = "cuda" if torch.cuda.is_available() else "cpu"
kh = os.environ.get("KOKORO_DIR", os.path.expanduser("~/.cache/kokoro"))
kok = Kokoro(os.path.join(kh, "kokoro-v1.0.onnx"), os.path.join(kh, "voices-v1.0.bin"))
model = ChatterboxTTS.from_pretrained(device=dev)
asr = WhisperModel("base.en", device=dev, compute_type="float16" if dev == "cuda" else "int8")
SR = model.sr
tmp = tempfile.mkdtemp()

def ff(src, dst, af, sr=SR):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af", af, "-ar", str(sr), "-ac", "1", dst], check=True)

def kokoro(text, speed=0.95):
    audio, ksr = kok.create(text, voice=cfg["voice"], speed=speed)
    sf.write(f"{tmp}/k.wav", audio, ksr)
    ff(f"{tmp}/k.wav", f"{tmp}/k2.wav", f"rubberband=pitch={cfg['pitch']}:formant=shifted")
    return ta.load(f"{tmp}/k2.wav")[0]

NUM = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten", "50": "fifty", "knew": "new", "know": "no", "their": "there", "theyre": "there", "too": "to", "two": "to", "for": "for", "four": "for", "right": "write"}
def norm(s): return [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", " ", s.lower().replace("-", " ")).split()]

last_probs = []
def transcribe(wav):
    """Words with times; also keeps each word's recognition probability in last_probs (the clarity signal)."""
    global last_probs
    ta.save(f"{tmp}/t.wav", wav, SR)
    segs, _ = asr.transcribe(f"{tmp}/t.wav", language="en", word_timestamps=True, condition_on_previous_text=False)
    words = [w for s in segs for w in (s.words or [])]
    last_probs = [float(w.probability) for w in words]
    return [(w.word.strip(), w.start, w.end) for w in words]

def clarity():
    """How clearly the last transcribed take was spoken: (weakest word, mean) recognition probability. A mumbled word
    still gets transcribed (the recogniser guesses from context) but with low probability, so this catches it."""
    if not last_probs: return (0.0, 0.0)
    return (min(last_probs), sum(last_probs) / len(last_probs))
CLEAR_MIN, CLEAR_MEAN = float(cfg.get("clearMin", 0.6)), float(cfg.get("clearMean", 0.85))  # every word easy to catch

def score(text, heard):
    """How well the take says the script: compared letter by letter with spaces removed, so a word heard split or
    joined ("bot net" / "botnet", "zero days" / "zero-days") still counts as right."""
    return difflib.SequenceMatcher(None, "".join(norm(text)), "".join(norm(" ".join(w for w, _, _ in heard)))).ratio()

# the voice samples: Kokoro reading our own text in each mood, pitched like the rest of the narration
prompts = {}
def prompt_for(name):
    if name not in prompts:
        text, speed = PROMPTS.get(name, PROMPTS["neutral"])
        prompts[name] = f"{tmp}/prompt-{name}.wav"; ta.save(prompts[name], kokoro(text, speed), SR)
    return prompts[name]

def mean_pitch(wav):
    """Median voiced pitch in Hz (the narrator's identity: should be about the same on every line)."""
    f0 = ta.functional.detect_pitch_frequency(wav.mean(0, keepdim=True), SR, freq_low=80, freq_high=500)[0]
    f0 = f0[(f0 > 90) & (f0 < 480)]
    return round(float(f0.median()), 1) if f0.numel() else 0.0

def words_for(text, heard, duration):
    """Script words with times from the transcription (matched words), interpolated for the rest."""
    script = text.split()
    S = [" ".join(norm(w)) for w in script]
    H = [" ".join(norm(w)) for w, _, _ in heard]
    times = [None] * len(script)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, S, H).get_opcodes():
        if op in ("equal", "replace") and i2 - i1 == j2 - j1:
            for k in range(i2 - i1): times[i1 + k] = (heard[j1 + k][1], heard[j1 + k][2])
    known = [i for i, t in enumerate(times) if t]
    if not known: # nothing matched: spread evenly
        return [{"word": w, "start": round(duration * i / len(script), 3), "end": round(duration * (i + 1) / len(script), 3)} for i, w in enumerate(script)]
    for i in range(len(script)):
        if times[i]: continue
        prev = max([k for k in known if k < i], default=None); nxt = min([k for k in known if k > i], default=None)
        t0 = times[prev][1] if prev is not None else 0.0
        t1 = times[nxt][0] if nxt is not None else duration
        lo = prev if prev is not None else -1; hi = nxt if nxt is not None else len(script)
        f0, f1 = (i - lo - 1) / (hi - lo - 1), (i - lo) / (hi - lo - 1)
        times[i] = (t0 + (t1 - t0) * f0, t0 + (t1 - t0) * f1)
    return [{"word": w, "start": round(t[0], 3), "end": round(t[1], 3)} for w, t in zip(script, times)]

def finish(wav, emo, out):
    """Tempo and loudness for the emotion (never pitch): exactly what ships."""
    ta.save(f"{tmp}/c.wav", wav, SR)
    parts = []
    tempo = cfg["tempo"] * emo["tempo"]
    if abs(tempo - 1) > 1e-3: parts.append(f"atempo={tempo:.3f}")  # gentle time-stretch, keeps the pitch
    parts.append(f"loudnorm=I={-16 + emo['gain']}:TP=-1.5:LRA=7")
    ff(f"{tmp}/c.wav", out, ",".join(parts), 48000)
    final, _ = ta.load(out)
    return ta.functional.resample(final, 48000, SR), final.shape[1] / 48000

# punctuation is a promise to the listener: a comma is a short breath, "..." or a full stop inside a line a beat.
# Takes (especially fast, flat ones) often run straight through them, so the shipped file gets the missing silence.
COMMA_PAUSE, STOP_PAUSE = float(cfg.get("commaPause", 0.22)), float(cfg.get("stopPause", 0.4))
def breathe(text, heard, out):
    """Make every comma / inner stop at least COMMA_PAUSE / STOP_PAUSE long, cutting at the quietest point between
    the two words. Returns how many pauses were stretched."""
    wav, sr = ta.load(out)
    words = words_for(text, heard, wav.shape[1] / sr)
    cuts = []  # (time, seconds of silence to add)
    hop = int(0.01 * sr)
    rms = lambda s: float(wav[:, max(0, s):s + hop].pow(2).mean().sqrt())
    quiet = 0.03 * float(wav.abs().max())  # what counts as silence (Whisper's word gaps do not: they overlap breaths)
    for i, w in enumerate(words[:-1]):
        tok = w["word"]
        need = STOP_PAUSE if re.search(r"(\.\.\.|…|[.!?])[\"')]*$", tok) else COMMA_PAUSE if re.search(r"[,;:—-][\"')]*$", tok) else 0
        if not need: continue
        # the quietest 10 ms around the boundary (word timings are approximate: never cut into a word)
        a, b = max(0, int((w["end"] - 0.1) * sr)), min(wav.shape[1], int((words[i + 1]["start"] + 0.1) * sr))
        best, at = None, int(((w["end"] + words[i + 1]["start"]) / 2) * sr)
        for s in range(a, max(a + 1, b - hop), hop):
            e = rms(s)
            if best is None or e < best: best, at = e, s + hop // 2
        # how much real silence is already there, measured from the audio around that point
        l = r = at
        while l - hop > 0 and rms(l - hop) < quiet: l -= hop
        while r + hop < wav.shape[1] and rms(r) < quiet: r += hop
        have = (r - l) / sr
        if have < need: cuts.append((at, need - have))
    if not cuts: return 0
    parts, prev = [], 0
    for at, add in sorted(cuts):
        parts += [wav[:, prev:at], torch.zeros(wav.shape[0], int(add * sr))]; prev = at
    parts.append(wav[:, prev:])
    ta.save(out, torch.cat(parts, 1), sr)
    return len(cuts)

# the narrator's own pitch, from the neutral sample: a take far from it sounds like another voice (a "spike")
REF_PITCH = mean_pitch(ta.load(prompt_for("neutral"))[0])
PITCH_TOL = float(cfg.get("pitchTolerance", 0.18))
print(f"narrator pitch {REF_PITCH:.0f} Hz (takes within +-{PITCH_TOL * 100:.0f}%)", flush=True)

def voice_part(text, mood, out):
    """The best take of `text` in one mood, processed as it ships, written to `out`: ((score, final, seconds,
    heard words, key), engine). Falls back to Kokoro when no Chatterbox take says every word right."""
    emo = EMOTIONS.get(mood, EMOTIONS["neutral"]); ex, cw = emo["ex"], emo["cfg"]
    need = 0.9 if len(text.split()) >= 12 else 0.95  # every word right (homophones are normalised); only very long lines may miss one
    best, cand = None, f"{tmp}/cand.wav"
    # every take is processed exactly as it will ship, then checked; keep the best (ties: the longer, less hurried).
    # Short lines too: Kokoro is a slightly different speaker, so it is only the last resort.
    short = len(text.split()) <= 2
    for take in range(int(cfg.get("takes", 16))):
        torch.manual_seed(int(hashlib.md5(f"{text}/{take}".encode()).hexdigest()[:8], 16))
        wav = model.generate(text, audio_prompt_path=prompt_for(emo["prompt"]), exaggeration=ex, cfg_weight=cw)
        final, dur = finish(wav, emo, cand)
        heard = transcribe(final); sc = score(text, heard); cmin, cmean = clarity()
        clear = cmin >= CLEAR_MIN and cmean >= CLEAR_MEAN
        off = abs(mean_pitch(final) / REF_PITCH - 1) if REF_PITCH else 0
        # rank: right words first, then on-pitch, then the longer (less hurried) take
        key = (sc >= need, clear, off <= PITCH_TOL, round(cmean, 2), -off, sc, dur)
        if best is None or key > best[4]: best = (sc, final, dur, heard, key); shutil.copyfile(cand, out)
        if sc >= need and clear and off <= PITCH_TOL: break
    # Kokoro only when no take says every word (or, for 1-2 word lines that Chatterbox may garble, says it clearly)
    if best is None or best[0] < need or (short and not best[4][1]):
        final, dur = finish(kokoro(text, PROMPTS.get(emo["prompt"], PROMPTS["neutral"])[1]), emo, out)
        heard = transcribe(final); return (score(text, heard), final, dur, heard, None), "kokoro"
    return best, "chatterbox"

for L in lines:
    text = L["text"]
    mood = L.get("emotion") or ("panic" if text.rstrip().endswith("!") else "neutral")
    best, used = voice_part(text, mood, L["out"])
    sc, final, duration, heard, _ = best
    stretched = breathe(text, heard, L["out"])
    if stretched:  # re-measure what ships: new length and word times (captions follow them)
        shipped, ssr = ta.load(L["out"]); final = ta.functional.resample(shipped, ssr, SR); duration = shipped.shape[1] / ssr
        heard = transcribe(final)
    transcribe(final); cmin, cmean = clarity()
    with open(L["out"] + ".json", "w") as f:
        json.dump({"duration": round(duration, 3), "engine": used, "emotion": mood, "match": round(sc, 3), "clarity": [round(cmin, 2), round(cmean, 2)], "pitch": mean_pitch(final), "words": words_for(text, heard, duration)}, f)
    print(f"{L['id']}  {used:10s} {mood:8s} clear {cmin:.2f}/{cmean:.2f} match {sc:.2f}  {mean_pitch(final):5.0f} Hz  {duration:.2f}s  {'+%d pause ' % stretched if stretched else ''}{text}", flush=True)
