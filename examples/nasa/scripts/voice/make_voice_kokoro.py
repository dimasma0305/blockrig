"""Narration with Kokoro, an open-weight TTS model that runs offline (no text leaves the machine).

Each phrase (split at , . ? ! and ...) is synthesized on its own and joined with short pauses, so the
phrase spans are known exactly; make-audio.mjs spreads each phrase's words over its span by syllables.
The voice is pitched up with ffmpeg's rubberband filter (formants shifted too, for a younger tone).

Needs: pip install kokoro-onnx soundfile, plus the model files in ~/.cache/kokoro (or $KOKORO_DIR):
  kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Writes <out>.wav (48 kHz mono) and <out>.wav.json: { duration, phrases: [{ text, start, end }] }.
"""
import argparse, json, os, re, subprocess, tempfile
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ap = argparse.ArgumentParser()
ap.add_argument("--text", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--voice", default="am_puck")
ap.add_argument("--speed", type=float, default=1.3)
ap.add_argument("--pitch", type=float, default=1.35)
ap.add_argument("--pause", type=float, default=0.12, help="seconds between sentences (half that between clauses)")
ap.add_argument("--fps", type=int, default=60)
a = ap.parse_args()

home = os.environ.get("KOKORO_DIR", os.path.expanduser("~/.cache/kokoro"))
k = Kokoro(os.path.join(home, "kokoro-v1.0.onnx"), os.path.join(home, "voices-v1.0.bin"))

# phrases end at punctuation; keep the punctuation so the model gets the right intonation
parts = [p.strip() for p in re.findall(r"[^,.?!…]+(?:\.\.\.|[,.?!…])*", a.text) if p.strip() and re.search(r"\w", p)]
chunks, phrases, t, sr = [], [], 0.0, 24000
for i, p in enumerate(parts):
    audio, sr = k.create(p, voice=a.voice, speed=a.speed)
    chunks.append(audio)
    dur = len(audio) / sr
    phrases.append({"text": p, "start": round(t, 3), "end": round(t + dur, 3)})
    t += dur
    if i + 1 < len(parts):
        gap = a.pause if re.search(r"(\.\.\.|[.?!…])$", p) else a.pause / 2
        chunks.append(np.zeros(int(gap * sr), dtype=np.float32))
        t += gap

with tempfile.TemporaryDirectory() as tmp:
    raw = os.path.join(tmp, "raw.wav")
    sf.write(raw, np.concatenate(chunks), sr)
    af = f"rubberband=pitch={a.pitch}:formant=shifted," if a.pitch != 1 else ""
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-af", af + "loudnorm=I=-16:TP=-1.5", "-ar", "48000", "-ac", "1", a.out], check=True)

with open(a.out + ".json", "w") as f:
    json.dump({"duration": round(t, 3), "phrases": phrases}, f)
