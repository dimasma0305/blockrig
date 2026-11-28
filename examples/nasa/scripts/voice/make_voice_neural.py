"""Natural-sounding narration with exact word timings, using Microsoft's free neural voices.

Usage:
  python make_voice_neural.py --text "Mom said dinner is ready." --out public/v2.wav
  python make_voice_neural.py --text-file script.txt --out public/voice.wav --style boy
  python make_voice_neural.py --list

Needs the edge-tts package (pip install edge-tts) and ffmpeg with the rubberband filter.
The narration text is sent to Microsoft's online speech service, so only use this when
the user has agreed to that.

Styles (override any part with --voice, --rate, --pitch):
  boy     en-US-BrianNeural, 70% faster, pitched up 1.6x with a younger tone  (default)
  kid     en-US-AnaNeural (a real child voice), 30% faster, no pitch change
  girl    en-US-AvaNeural, 30% faster, pitched up 1.15x
  horror  en-US-ChristopherNeural, 18% faster, no pitch change (deep, firm adult)

Writes <out> (48 kHz WAV) and <out>.json:
  {"duration": s, "frames": n, "words": [{"word", "start", "end", "startFrame", "endFrame"}]}
Speeding up is done by the voice service, and pitching does not change length, so the
word times in the JSON match the final file.
"""
import argparse
import asyncio
import json
import os
import subprocess
import tempfile

STYLES = {
    "boy": ("en-US-BrianNeural", "+70%", 1.6, "shifted"),
    "kid": ("en-US-AnaNeural", "+30%", 1.0, "shifted"),
    "girl": ("en-US-AvaNeural", "+30%", 1.15, "shifted"),
    "horror": ("en-US-ChristopherNeural", "+18%", 1.0, "preserved"),
}


async def synth(text, voice, rate, mp3):
    import edge_tts

    try:
        com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    except TypeError:  # older versions emit word boundaries by default
        com = edge_tts.Communicate(text, voice, rate=rate)
    words = []
    with open(mp3, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7  # 100-nanosecond units
                words.append({"word": chunk["text"], "start": start, "end": start + chunk["duration"] / 1e7})
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--text-file")
    ap.add_argument("--out")
    ap.add_argument("--style", choices=sorted(STYLES), default="boy")
    ap.add_argument("--voice")
    ap.add_argument("--rate", help='speed change such as "+35%%"')
    ap.add_argument("--pitch", type=float)
    ap.add_argument("--formant", choices=["shifted", "preserved"],
                    help="shifted = smaller, younger-sounding speaker (can turn chipmunk); preserved = same speaker, higher note")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    if a.list:
        for k, v in STYLES.items():
            print(f"{k:7s} {v[0]:26s} rate {v[1]:5s} pitch x{v[2]}")
        return
    voice, rate, pitch, formant = STYLES[a.style]
    voice = a.voice or voice
    rate = a.rate or rate
    pitch = a.pitch if a.pitch is not None else pitch
    formant = a.formant or formant
    text = a.text or open(a.text_file, encoding="utf-8").read()
    text = " ".join(text.split())

    mp3 = os.path.join(tempfile.mkdtemp(), "raw.mp3")
    words = asyncio.run(synth(text, voice, rate, mp3))

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    chain = [
        f"rubberband=pitch={pitch}:formant={formant}" if pitch != 1 else None,
        "loudnorm=I=-14:TP=-1.5",
        "aresample=48000",
    ]
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", mp3, "-af", ",".join(c for c in chain if c), a.out],
        check=True,
    )
    dur = float(
        subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.out],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
    )
    for w in words:
        w["start"] = round(w["start"], 3)
        w["end"] = round(w["end"], 3)
        w["startFrame"] = round(w["start"] * a.fps)
        w["endFrame"] = round(w["end"] * a.fps)
    info = {"duration": round(dur, 3), "frames": round(dur * a.fps), "fps": a.fps, "voice": voice, "words": words}
    json.dump(info, open(a.out + ".json", "w"), indent=1)
    spoken = words[-1]["end"] if words else dur
    wpm = len(words) / spoken * 60 if spoken else 0
    print(f"{a.out}: {dur:.2f}s, {len(words)} words, {wpm:.0f} words a minute")
    print(" ".join(f"{w['word']}@{w['startFrame']}" for w in words))


if __name__ == "__main__":
    main()
