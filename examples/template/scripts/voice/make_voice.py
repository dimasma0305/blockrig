"""Make a high-pitched narration WAV from text, plus phrase timings for captions.

Usage:
  python make_voice.py --text "POV. Mom said dinner is ready. And you are on the other side of town!" --out public/voice.wav
  python make_voice.py --text-file script.txt --out public/voice.wav --pitch 1.55 --rate 5 --voice "Microsoft David Desktop"

Steps: Windows built-in speech (SAPI, offline, free) -> trim leading silence ->
pitch up with ffmpeg's rubberband filter (keeps the timing) -> normalise loudness ->
detect pauses and write <out>.json with the spoken phrases' start/end times.

Needs Windows PowerShell and an ffmpeg build that includes rubberband.
"""
import argparse
import json
import os
import re
import subprocess
import tempfile


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--text-file")
    ap.add_argument("--out", required=True)
    ap.add_argument("--pitch", type=float, default=1.55, help="1.0 = unchanged, 1.55 = high-pitched boy narrator")
    ap.add_argument("--rate", type=int, default=5, help="SAPI speaking rate, -10..10; 5 is the fast story-short pace")
    ap.add_argument("--formant", choices=["shifted", "preserved"], default="shifted",
                    help="shifted = voice sounds younger (boy); preserved = same speaker, higher note")
    ap.add_argument("--voice", default="Microsoft David Desktop")
    ap.add_argument("--fps", type=int, default=30)
    a = ap.parse_args()
    text = a.text or open(a.text_file, encoding="utf-8").read()
    text = " ".join(text.split())

    tmp = tempfile.mkdtemp()
    raw = os.path.join(tmp, "raw.wav")
    txt = os.path.join(tmp, "text.txt")
    open(txt, "w", encoding="utf-8").write(text)
    ps = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"$s.SelectVoice('{a.voice}'); $s.Rate = {a.rate}; "
        f"$s.SetOutputToWaveFile('{raw}'); "
        f"$s.Speak((Get-Content -Raw -Encoding UTF8 '{txt}')); $s.Dispose()"
    )
    run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps])

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    chain = [
        "silenceremove=start_periods=1:start_threshold=-45dB",
        f"rubberband=pitch={a.pitch}:formant={a.formant}" if a.pitch != 1 else None,
        "loudnorm=I=-14:TP=-1.5",
        "aresample=48000",
    ]
    run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-af", ",".join(c for c in chain if c), a.out])

    dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.out]).stdout)
    log = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", a.out, "-af", "silencedetect=noise=-35dB:d=0.12", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    # speech runs between silences
    phrases, t = [], 0.0
    for i, s0 in enumerate(starts):
        if s0 - t > 0.05:
            phrases.append((t, s0))
        t = ends[i] if i < len(ends) else dur
    if dur - t > 0.05:
        phrases.append((t, dur))

    info = {
        "duration": round(dur, 3),
        "frames": round(dur * a.fps),
        "fps": a.fps,
        "phrases": [
            {"start": round(s, 3), "end": round(e, 3), "startFrame": round(s * a.fps), "endFrame": round(e * a.fps)}
            for s, e in phrases
        ],
    }
    json.dump(info, open(a.out + ".json", "w"), indent=1)
    print(json.dumps(info, indent=1))


if __name__ == "__main__":
    main()
