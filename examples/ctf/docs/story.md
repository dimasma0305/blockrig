---
title: Everybody Plays CTF
slug: ctf
fps: 60
size: 1080x1920
---

# Everybody Plays CTF

- **Hook:** In this world, everybody plays CTF (capture-the-flag hacking contests), even the bakery and schoolkids.
- **Plot:** The hero is ranked last. At the World Final the pros throw zero-days, rainbow tables and a botnet at the Vault and fail. The hero views the page source: the flag is in a comment. Rank one.
- **Twist:** now everybody in this world checks the source first.
- **Weather arc:** neon drizzle → storm during the attack (lightning on the hits and on "Nothing worked!") → the sky clears when the flag is found.

<!-- Shot format: see examples/template/docs/story.md. Edit this file, then npm run docs. -->

## Shots

### s01 · street
> In this world, everybody plays CTF.

- captions: IN THIS *WORLD*, | EVERYBODY PLAYS *CTF*.
- action: crane down past the sky scoreboard into the busy neon street; people walk, rank tags floating over them
- camera: high crane down from the scoreboard to street level
- weather: drizzle
- time: night
- mood: hype

### s02 · street
> Even the bakery hides a flag in its receipts.

- captions: EVEN THE *BAKERY* | HIDES A *FLAG* | IN ITS RECEIPTS.
- action: the baker hands over bread; a receipt hologram pops up with a glowing flag{...} line
- camera: medium on the baker at the shop counter, slight push-in
- faces: baker=happy
- weather: drizzle
- time: night
- mood: funny

### s03 · street
> Kids learn SQL injection before multiplication.

- captions: *KIDS* LEARN | *SQL* INJECTION | BEFORE MULTIPLICATION.
- action: two kids outside the school cheer at a floating ' OR 1=1-- hologram; the school sign glitches
- camera: low angle on the kids, school sign above
- faces: kids=grin
- weather: drizzle
- time: night
- mood: funny

### s04 · street
> And me? Rank... last!

- captions: AND *ME*? | RANK... *LAST*.
- action: the hero alone on the pavement, the rank tag above them flickers to #8,000,000,000; slump
- camera: close on the hero, pull up to reveal the tag
- faces: hero=sad
- weather: rain
- time: night
- mood: sad

### s05 · plaza
> Tonight is the World Final. One flag, locked inside the Vault.

- captions: *TONIGHT* IS | THE WORLD *FINAL*. | ONE *FLAG*, | LOCKED INSIDE THE *VAULT*.
- action: reveal the Vault tower under the hex firewall dome, searchlights sweeping, crowd behind barriers
- camera: wide low orbit around the dome
- weather: rain; lightning 0.4
- time: night
- mood: tense

### s06 · plaza
> The pros threw everything.

- captions: THE *PROS* | THREW *EVERYTHING*.
- action: the pro team steps forward in formation and raises their laptops
- camera: low hero shot of the team, slow push
- faces: pros=determined
- weather: storm
- time: night
- mood: tense

### s07 · plaza
> Zero-days. Rainbow tables. An actual botnet.

- captions: ZERO-DAYS. | *RAINBOW* TABLES. | AN ACTUAL *BOTNET*.
- action: packet beams and a rainbow beam hit the dome, impacts ripple; a swarm of drones dives in; sparks
- camera: fast side tracking along the beams, camera shake
- faces: pros=furious
- weather: storm; lightning 0.5 1.6
- time: night
- mood: action

### s08 · plaza
> Nothing worked!

- captions: *NOTHING* WORKED.
- action: dome flickers and holds; drones drop; the pros slump
- camera: static wide, dome centred
- faces: pros=sad
- weather: storm; lightning 0.05
- time: night
- mood: panic
- min: 1

### s09 · terminal
> So I tried the one thing nobody did.

- captions: SO I *TRIED* | THE *ONE* THING | *NOBODY* DID.
- action: the hero walks through the crowd to the little terminal at the Vault door
- camera: behind the hero, tracking forward
- faces: hero=determined
- weather: rain
- time: night
- mood: tense

### s10 · terminal
> I viewed the page source.

- captions: I *VIEWED* | THE PAGE *SOURCE*.
- action: the hero's hand on the keyboard (IK), the screen fills with HTML
- camera: over the shoulder onto the screen
- faces: hero=smug
- weather: rain
- time: night
- mood: tense

### s11 · terminal

- action: silent beat: the screen scrolls and one green comment line lights up: <!-- flag{it_was_in_the_source} -->
- camera: screen close-up, slow push
- faces: hero=shocked
- weather: drizzle
- time: night
- mood: tense
- min: 1.3

### s12 · plaza
> The flag was in a comment!

- captions: THE *FLAG* | WAS IN A *COMMENT*.
- action: the dome shatters into hexes, the Vault opens, glyph confetti bursts, the crowd's jaws drop
- camera: wide pull-back from the opening Vault
- faces: hero=laugh, pros=shocked, crowd=shocked
- weather: rain -> clear
- time: night
- mood: triumph
- min: 1.4

### s13 · plaza
> Now I'm rank one!

- captions: *NOW* I'M | RANK *ONE*.
- action: the sky scoreboard flips; the hero's tag spins to #1; victory jump
- camera: low angle on the hero, scoreboard behind
- faces: hero=grin
- weather: clear
- time: night
- mood: triumph
- min: 1.2

### s14 · street
> And everybody in this world checks the source first.

- captions: AND *EVERYBODY* | IN THIS *WORLD* | CHECKS THE *SOURCE* | FIRST.
- action: back on the street: everyone, the baker and kids included, types view-source; screens glow green
- camera: crane up from the street back to the scoreboard
- faces: baker=smug, kids=grin
- weather: clear
- time: night
- mood: funny
- min: 2.2
