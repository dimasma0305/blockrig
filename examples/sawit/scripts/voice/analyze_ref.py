"""Measure how a narrator talks: tempo and expression per sentence, for reference shorts and for our own lines.

  python scripts/voice/analyze_ref.py out/ref/*.m4a            reference audio (local only, see docs/references.md)
  python scripts/voice/analyze_ref.py --ours                   our narration (assets/audio/s*.wav)

Per sentence: words, seconds, words per minute, median pitch (Hz), and pitch movement (the spread of the voiced
pitch in semitones, 10th to 90th percentile): ~2-3 st is flat and deadpan, 5-8 st lively, 9+ shouting/panic.
Also the pause before each sentence. Background music makes pitch a little noisy, so compare medians, not single
lines. Runs in the voice venv (faster-whisper, torchaudio).
"""
import argparse, glob, json, os, re, subprocess, tempfile
import numpy as np, torch, torchaudio as ta
from faster_whisper import WhisperModel

SR = 16000
ap = argparse.ArgumentParser(); ap.add_argument("files", nargs="*"); ap.add_argument("--ours", action="store_true"); ap.add_argument("--json")
a = ap.parse_args()

def load(path):
    out = os.path.join(tempfile.mkdtemp(), "a.wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), out], check=True)
    w, _ = ta.load(out); return w

def pitch_track(w):
    """Voiced pitch per ~10 ms frame (Hz, 0 where unvoiced or implausible)."""
    f0 = ta.functional.detect_pitch_frequency(w, SR, frame_time=0.01, freq_low=80, freq_high=500)[0].numpy()
    f0[(f0 < 90) | (f0 > 480)] = 0
    return f0, len(w[0]) / SR / max(len(f0), 1)

def stats(f0, hop, t0, t1):
    seg = f0[int(t0 / hop):int(t1 / hop)]; seg = seg[seg > 0]
    if len(seg) < 8: return 0.0, 0.0
    st = 12 * np.log2(seg / np.median(seg))
    return float(np.median(seg)), float(np.percentile(st, 90) - np.percentile(st, 10))

model = WhisperModel("small.en", device="cuda" if torch.cuda.is_available() else "cpu", compute_type="float16" if torch.cuda.is_available() else "int8")
files = sorted(glob.glob("assets/audio/s[0-9]*.wav")) if a.ours else a.files
report = []
for path in files:
    w = load(path); f0, hop = pitch_track(w)
    segs, _ = model.transcribe(path, word_timestamps=True, vad_filter=True)
    words = [(x.word.strip(), x.start, x.end) for s in segs for x in (s.words or [])]
    if not words: continue
    # sentences: split after . ! ? or a pause over 0.45 s (our files are one line each)
    sents, cur = [], []
    for i, wd in enumerate(words):
        cur.append(wd)
        gap = words[i + 1][1] - wd[2] if i + 1 < len(words) else 9
        if (a.ours and i + 1 == len(words)) or (not a.ours and (re.search(r"[.!?]$", wd[0]) or gap > 0.45)): sents.append(cur); cur = []
    if cur: sents.append(cur)
    rows, prev_end = [], None
    for s in sents:
        t0, t1 = s[0][1], s[-1][2]; n = len(s); hz, move = stats(f0, hop, t0, t1)
        rows.append({"text": " ".join(x[0] for x in s), "words": n, "sec": round(t1 - t0, 2), "wpm": round(n / max(t1 - t0, 0.3) * 60), "hz": round(hz), "move_st": round(move, 1), "pause_before": round(t0 - prev_end, 2) if prev_end is not None else None})
        prev_end = t1
    span = words[-1][2] - words[0][1]
    name = os.path.basename(path)
    summary = {"file": name, "words": len(words), "wpm_overall": round(len(words) / span * 60), "median_hz": round(float(np.median([r["hz"] for r in rows if r["hz"]] or [0]))),
               "median_move_st": round(float(np.median([r["move_st"] for r in rows if r["move_st"]] or [0])), 1),
               "median_pause": round(float(np.median([r["pause_before"] for r in rows if r["pause_before"] is not None] or [0])), 2),
               "hook": rows[0], "sentences": rows}
    report.append(summary)
    print(f"\n== {name}: {summary['words']} words, {summary['wpm_overall']} wpm overall, pitch {summary['median_hz']} Hz, movement {summary['median_move_st']} st (median), pause {summary['median_pause']} s")
    for r in rows[: 8 if not a.ours else 99]:
        pause = "" if r["pause_before"] is None else f"+{r['pause_before']}s"
        print(f"  {r['wpm']:>4} wpm  {r['hz']:>4} Hz  {r['move_st']:>4} st  {pause:>6}  {r['text'][:70]}")
if a.json: json.dump(report, open(a.json, "w"), indent=1)
