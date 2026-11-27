# Audio

Expressive narrator: every line has the emotion of its meaning (`emotion:` in story.md, see the voice skill). Measured target: ~160 wpm overall, one narrator on every line, every word clear first (voice skill).

## Voice

- engine: chatterbox-js
- voice: am_adam
- pitch: 1.35
- exaggeration: 0.9
- cfg: 0.35
- tempo: 1.05
- gap: 0.3
- commaPause: 0.22
- stopPause: 0.4
- panic: exaggeration 1.4, cfg 0.3, gain 2

## Music

- s01: quirky-arp
- s05: suspense
- s12: quirky-arp

Themes are synthesized in scripts/music.mjs: quirky-arp (the default background: bouncy awkward arpeggio, 94 bpm, A=451) for the town and the payoff, suspense for the attack on the Vault. Mixed at 0.2 under the voice.

## Sound effects (planned)

| Shot | Effect |
|---|---|
| s07 | beam zaps and impacts on each hit, thunder on the strikes |
| s12 | glass shatter, crowd cheer |
