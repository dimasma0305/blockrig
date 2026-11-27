# References

Videos the user pointed to, and what to take from each. Take the format, pace and feel, never the plot,
characters, voice or footage. Their text and audio are only used locally for comparison (out/ref, git-ignored).

| Link | What to learn | Measured |
|---|---|---|
| https://www.youtube.com/shorts/Mr6-XSSF6d8 | two-voice story (narrator + character), quick cuts, comedic twist at the end | 162 wpm overall, 198 Hz, 7.0 st movement, 0.65 s pauses |
| https://www.youtube.com/shorts/L2j20zDENn8 (SphinxRBLX, 5.8M views) | girl + boy cast, attractive assets; punchy shouted hook | 186 wpm, 195 Hz, 6.9 st, 0.5 s |
| https://www.youtube.com/shorts/kuU12QwIYNw (SphinxRBLX, 4.3M) | lively hook (14.9 st), then flat fast list of mishaps (1.7 st at 389 wpm) | 192 wpm, 216 Hz, 8.4 st, 0.6 s |
| https://www.youtube.com/shorts/Xdn6sGWXdhA (SphinxRBLX, 4.2M) | matter-of-fact narration flat and fast (2.2 st at 333 wpm), running gag repeated | 207 wpm, 229 Hz, 6.1 st, 0.35 s |

Look references (2026-11-27):

| Link | What to take |
|---|---|
| https://www.youtube.com/shorts/Xd_yEnAdiGo | faces, hair, bodies: classic blocky bodies, very pale skin, fluffy anime hair with bangs, 2D anime faces that change every line, layered outfits, evenly lit characters, close chest-up framing |
| https://www.youtube.com/shorts/wVjP5B-94MM | shade, texture, light, sky: warm low sun with long crisp shadows, deep blue sky with big cumulus, saturated contrast, real stone/brick/concrete grain, low cameras that show the sky |

What the numbers say (2026-11-27): narrators talk fast inside a sentence (200-330 wpm) and leave a 0.35-0.65 s beat
between sentences; matter-of-fact lines are flat (2-3 st) and the fastest; hooks and reactions are lively; excited
lines jump 30-50% above the narrator's median pitch; the narrator sits around 195-230 Hz (ours: ~145 Hz).

How to measure a reference: download its audio only with the user's OK (`python -m yt_dlp -f "bestaudio[ext=m4a]"
-o "out/ref/<id>.%(ext)s" <url>`; out/ is git-ignored, never commit it), then run
`~/.venvs/chatterbox/Scripts/python scripts/voice/analyze_ref.py out/ref/*.m4a` and `... --ours` for ours: per
sentence words per minute, median pitch, pitch movement in semitones, and the pause before it.
