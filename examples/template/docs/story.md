---
title: The Rain Knows
slug: rain-knows
fps: 60
size: 1080x1920
---

# The Rain Knows

- **Hook (first 2 s):** In this town, it rains every time someone lies.
- **Plot:** I lie about eating my sister's cookies, a storm hits the whole street, I confess, the sun comes back. Twist: now it rains when *she* lies.
- **Comment bait:** what did she lie about?
- **Length:** ~17 s, 7 shots, 2 locations (street, bedroom).

<!--
How to write a shot (scripts/docs.mjs compiles this file into src/generated/story.json):

### <id> · <location>
> Narration, one or two sentences. End a line with "!" and the voice performs it with panic/energy.
  Leave the quote out for a silent reaction shot, and give it a "min".

- captions: 2-4 WORDS | PER CAPTION | *ONE* WORD IN STARS IS HIGHLIGHTED   (must cover the narration, in order)
- action: who does what (one clear action, from clips in src/cast/clips.ts)
- camera: where it is, how tight, at most one move
  (match the meaning: "Rank... last." is sad, not panic; without it, "!" lines are panic)
- faces: hero=shock, sister=angry   (BlockRig expressions: neutral happy grin laugh smug wink determined angry furious roar shocked scared sad hurt sleepy embarrassed dazed)
- weather: clear | overcast | fog | drizzle | rain | storm | snow | blizzard   (add "lightning 0.3" for a strike at 0.3 s)
- time: day | golden | dusk | night | storm
- mood: a word for the music and colour (calm, tense, panic, relief, funny)
- light: golden   (optional lighting preset: day, golden, night, indoor, studio; see the world skill)
- min: 1.2   (hold at least this long, seconds)
-->

## Shots

### s01 · street
> In this town, it rains every time someone lies.

- captions: IN THIS TOWN | IT *RAINS* EVERY TIME | SOMEONE *LIES*
- action: hero walks down the sunny street; neighbours chat on the sidewalk
- emotion: flat
- camera: high wide crane down onto the street, ending behind the hero
- faces: hero=happy
- weather: clear
- time: day
- mood: calm

### s02 · bedroom
> My sister asked if I ate her cookies.

- captions: MY SISTER ASKED | IF I ATE | HER *COOKIES*
- action: sister stands with arms crossed; hero sits on the bed next to an empty plate
- emotion: serious
- camera: front three-quarter of the room, both in frame, slow push in
- faces: sister=angry, hero=embarrassed
- weather: clear
- time: day
- mood: tense
- light: indoor

### s03 · bedroom
> I said... not me!

- captions: I SAID... | NOT *ME!*
- action: hero shrugs too hard
- emotion: panic
- camera: close-up on the hero, quick push in
- faces: hero=grin
- weather: clear
- time: day
- mood: funny
- light: indoor

### s04 · street
- action: thunder: the sky goes dark, rain slams the street, lightning strikes
- camera: low angle up at the house as the storm rolls in, shake on the strike
- faces: hero=shocked
- weather: storm; lightning 0.25 0.9
- time: storm
- mood: panic
- min: 1.4

### s05 · street
> The whole street knew!

- captions: THE WHOLE STREET | *KNEW!*
- action: neighbours in the rain turn and point at the hero
- emotion: shocked
- camera: wide over the neighbours' shoulders to the hero on his lawn
- faces: hero=shocked
- weather: rain
- time: storm
- mood: panic

### s06 · street
> So I told the truth.

- captions: SO I TOLD | THE *TRUTH*
- action: hero slumps; the rain stops and the sun breaks through
- emotion: sad
- camera: medium on the hero, slow pull back as the light comes back
- faces: hero=sad
- weather: rain -> clear
- time: storm -> golden
- mood: relief

### s07 · street
> Now it only rains... when she lies.

- captions: NOW IT ONLY RAINS... | WHEN *SHE* LIES
- action: sister smiles sweetly; one small cloud rains only on her
- emotion: smug
- camera: two-shot from the road, both kids side by side, faces in the upper half (clear of the captions), her cloud raining above her
- faces: hero=smug, sister=happy
- weather: clear
- time: golden
- mood: funny
- light: golden
- min: 2.2
