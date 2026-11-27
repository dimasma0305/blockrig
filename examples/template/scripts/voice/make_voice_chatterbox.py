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
    # The narrator stays ONE voice: no pitch shifting or filters per emotion (they made sad lines sound like
    # another person). Emotion comes from the delivery Chatterbox copies (the mood's voice sample), its
    # exaggeration and pacing, and tempo and loudness.
    "neutral": {"ex": cfg["exaggeration"], "cfg": cfg["cfg"], "tempo": 1.0, "gain": 0, "prompt": "neutral"},
    # the viral-narrator deadpan: a strange fact stated like the weather (hooks, rules, "In this town...")
    # measured on viral shorts (analyze_ref.py): matter-of-fact lines are flat (2-3 st) and FAST (300-390 wpm)
    "flat":    {"ex": 0.3, "cfg": 0.55, "tempo": 1.2, "gain": 0, "prompt": "flat"},
    "happy":   {"ex": 1.0, "cfg": 0.4, "tempo": 1.0, "gain": 0.5, "prompt": "excited"},
    "excited": {"ex": 1.0, "cfg": 0.38, "tempo": 1.04, "gain": 1.5, "prompt": "excited"},
    "panic":   {"ex": 1.2, "cfg": 0.32, "tempo": 1.06, "gain": 2.0, "prompt": "excited"},
    "shocked": {"ex": 0.95, "cfg": 0.4, "tempo": 1.0, "gain": 1.5, "prompt": "neutral"},  # the excited sample pushed shocked lines up to +40% pitch
    "scared":  {"ex": 1.0, "cfg": 0.3, "tempo": 1.04, "gain": -1, "prompt": "sad"},
    "sad":     {"ex": 0.45, "cfg": 0.6, "tempo": 0.92, "gain": -2.5, "prompt": "sad"},
    "serious": {"ex": 0.5, "cfg": 0.55, "tempo": 0.96, "gain": -1, "prompt": "serious"},
    "smug":    {"ex": 0.75, "cfg": 0.5, "tempo": 0.95, "gain": 0, "prompt": "neutral"},
    "angry":   {"ex": 1.15, "cfg": 0.4, "tempo": 1.02, "gain": 2.5, "prompt": "excited"},
    "whisper": {"ex": 0.4, "cfg": 0.55, "tempo": 0.93, "gain": -5, "prompt": "serious"},
}
# legacy "panic" block from docs/audio.md tunes the panic emotion
if cfg.get("panic"):
    pz = cfg["panic"]; EMOTIONS["panic"].update({k2: pz[k1] for k1, k2 in [("exaggeration", "ex"), ("cfg", "cfg"), ("gain", "gain")] if k1 in pz})
for name, over in (cfg.get("emotions") or {}).items(): EMOTIONS.setdefault(name, dict(EMOTIONS["neutral"])).update(over)
# the voice samples: our own lines read by Kokoro in each mood (speed and level shape the delivery Chatterbox copies)
PROMPTS = {  # (text, Kokoro speed): same voice and pitch for every mood; only the reading differs
    "neutral": (cfg["prompt"], 0.95),
    "excited": ("No way! This is the best day ever! Everybody look, I actually did it! Let's go!", 1.12),
    "sad": ("I tried my best... and it still wasn't enough. Nobody even noticed. I just sat there... alone.", 0.8),
    "serious": ("Listen carefully. Tonight, everything changes. There is one chance. And no second try.", 0.87),
    "flat": ("In my school, the lunch lady knows your name. Nobody told her. She just knows. Every day. Same tray.", 1.0),
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
CLEAR_MIN, CLEAR_MEAN = float(cfg.get("clearMin", 0.45)), float(cfg.get("clearMean", 0.8))

def score(text, heard): return difflib.SequenceMatcher(None, norm(text), norm(" ".join(w for w, _, _ in heard))).ratio()

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

# the narrator's own pitch, from the neutral sample: a take far from it sounds like another voice (a "spike")
REF_PITCH = mean_pitch(ta.load(prompt_for("neutral"))[0])
PITCH_TOL = float(cfg.get("pitchTolerance", 0.18))
print(f"narrator pitch {REF_PITCH:.0f} Hz (takes within +-{PITCH_TOL * 100:.0f}%)", flush=True)

for L in lines:
    text = L["text"]
    mood = L.get("emotion") or ("panic" if text.rstrip().endswith("!") else "neutral")
    emo = EMOTIONS.get(mood, EMOTIONS["neutral"]); ex, cw = emo["ex"], emo["cfg"]
    need = 0.9 if len(text.split()) >= 12 else 0.95  # every word right (homophones are normalised); only very long lines may miss one
    best, cand = None, f"{tmp}/cand.wav"
    # every take is processed exactly as it will ship, then checked; keep the best (ties: the longer, less hurried)
    if len(text.split()) > 2:
        for take in range(int(cfg.get("takes", 10))):
            torch.manual_seed(int(hashlib.md5(f"{text}/{take}".encode()).hexdigest()[:8], 16))
            wav = model.generate(text, audio_prompt_path=prompt_for(emo["prompt"]), exaggeration=ex, cfg_weight=cw)
            final, dur = finish(wav, emo, cand)
            heard = transcribe(final); sc = score(text, heard); cmin, cmean = clarity()
            clear = cmin >= CLEAR_MIN and cmean >= CLEAR_MEAN
            off = abs(mean_pitch(final) / REF_PITCH - 1) if REF_PITCH else 0
            # rank: right words first, then on-pitch, then the longer (less hurried) take
            key = (sc >= need, clear, off <= PITCH_TOL, round(cmean, 2), -off, sc, dur)
            if best is None or key > best[4]: best = (sc, final, dur, heard, key); shutil.copyfile(cand, L["out"])
            if sc >= need and clear and off <= PITCH_TOL: break
    used = "chatterbox"
    if best is None or best[0] < need:
        final, dur = finish(kokoro(text, PROMPTS.get(emo["prompt"], PROMPTS["neutral"])[1]), emo, L["out"])
        heard = transcribe(final); best, used = (score(text, heard), final, dur, heard, None), "kokoro"
    sc, final, duration, heard, _ = best
    transcribe(final); cmin, cmean = clarity()
    with open(L["out"] + ".json", "w") as f:
        json.dump({"duration": round(duration, 3), "engine": used, "emotion": mood, "match": round(sc, 3), "clarity": [round(cmin, 2), round(cmean, 2)], "pitch": mean_pitch(final), "words": words_for(text, heard, duration)}, f)
    print(f"{L['id']}  {used:10s} {mood:8s} clear {cmin:.2f}/{cmean:.2f} match {sc:.2f}  {mean_pitch(final):5.0f} Hz  {duration:.2f}s  {text}", flush=True)
