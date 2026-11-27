"""Expressive narration with Chatterbox (Resemble AI, MIT), with the voice taken from a Kokoro clip.

Chatterbox copies a voice from a short sample and adds natural intonation, with an `exaggeration` control
for emotion. The sample is made here with Kokoro (an open model, Apache 2.0) reading our own text, so no real
person's voice is copied. Lines that end with "!" are performed with more emotion and lifted in pitch and
volume. Very short lines (Chatterbox garbles one- or two-word inputs) and any take that fails the check fall
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
       "panic": {"exaggeration": 1.4, "cfg": 0.3, "lift": 1.05, "gain": 2.5},
       "prompt": "In this world, everybody plays the game. Even the bakery hides a secret in its receipts. "
                 "Kids learn it before they can read. And me? I'm ranked last. Tonight is the final.",
       **json.loads(a.config)}
panic = {**{"exaggeration": 1.4, "cfg": 0.3, "lift": 1.05, "gain": 2.5}, **cfg.get("panic", {})}
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

def transcribe(wav):
    ta.save(f"{tmp}/t.wav", wav, SR)
    segs, _ = asr.transcribe(f"{tmp}/t.wav", language="en", word_timestamps=True)
    return [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or [])]

def score(text, heard): return difflib.SequenceMatcher(None, norm(text), norm(" ".join(w for w, _, _ in heard))).ratio()

# the voice sample: Kokoro reading our own text, pitched like the rest of the narration
prompt = f"{tmp}/prompt.wav"
ta.save(prompt, kokoro(cfg["prompt"]), SR)

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

def finish(wav, excited, out):
    """Tempo, panic lift and loudness: exactly what ships. Returns (final audio at SR, duration)."""
    ta.save(f"{tmp}/c.wav", wav, SR)
    # loudness: one target for everything, louder (and a little higher) for "!" lines
    af = f"loudnorm=I={-16 + (panic['gain'] if excited else 0)}:TP=-1.0"
    if cfg["tempo"] != 1: af = f"rubberband=tempo={cfg['tempo']}," + af  # faster or slower, same pitch
    if excited: af = f"rubberband=pitch={panic['lift']}:formant=preserved," + af
    ff(f"{tmp}/c.wav", out, af, 48000)
    final, _ = ta.load(out)
    return ta.functional.resample(final, 48000, SR), final.shape[1] / 48000

for L in lines:
    text, excited = L["text"], L["text"].rstrip().endswith("!")
    ex, cw = (panic["exaggeration"], panic["cfg"]) if excited else (cfg["exaggeration"], cfg["cfg"])
    need = 0.85 if len(text.split()) >= 6 else 0.9  # allow recogniser quirks (50 / fifty, zero-days)
    best, cand = None, f"{tmp}/cand.wav"
    # every take is processed exactly as it will ship, then checked; keep the best (ties: the longer, less hurried)
    if len(text.split()) > 2:
        for take in range(6):
            torch.manual_seed(int(hashlib.md5(f"{text}/{take}".encode()).hexdigest()[:8], 16))
            wav = model.generate(text, audio_prompt_path=prompt, exaggeration=ex, cfg_weight=cw)
            final, dur = finish(wav, excited, cand)
            heard = transcribe(final); sc = score(text, heard)
            if best is None or (sc, dur) > (best[0], best[2]): best = (sc, final, dur, heard); shutil.copyfile(cand, L["out"])
            if sc >= need: break
    used = "chatterbox"
    if best is None or best[0] < need:
        final, dur = finish(kokoro(text, 1.05 if excited else 0.95), excited, L["out"])
        best, used = (score(text, transcribe(final)), final, dur, transcribe(final)), "kokoro"
    sc, final, duration, heard = best
    with open(L["out"] + ".json", "w") as f:
        json.dump({"duration": round(duration, 3), "engine": used, "match": round(sc, 3), "words": words_for(text, heard, duration)}, f)
    print(f"{L['id']}  {used:10s} {'!' if excited else ' '} match {sc:.2f}  {duration:.2f}s  {text}", flush=True)
