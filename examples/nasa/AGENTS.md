# AGENTS.md: "Hack NASA Before Ten" (made from examples/template)

**The rules and the skills live in the template, once:** read [`../template/AGENTS.md`](../template/AGENTS.md) and
follow it here. Where it says `.agents/skills/<stage>`, read [`../template/.agents/skills/<stage>/SKILL.md`](../template/.agents/skills/).
Improve the template's rules and skills when you learn something, so every video gets it; write only what is
specific to this video below.

## This video

A kid raised as a hacker must hack NASA before ten or the government removes him; nine years of real hacking tricks (Mitnick's phone con, aircrack-ng, Log4Shell, Heartbleed, Gary McKinnon's UFO hunt) fail, and Dad, eating a sandwich, asks "Did you try admin, admin?". It works; the next objective is the Sun. 37 shots, about 1:45; every dialogue speaker has their own voice, narration one voice.

Places (`LOCATIONS` in src/world/World.ts): my room (Roblox Toolbox bedroom with a gaming desk; the window shows kids playing), the nursery (Roblox Toolbox bedroom), the preschool, the conference hall and the friend's room (Kenney). Unusual here: docs/story.md `say:` (pronunciation), `speaker:`, `title:` / `timer:` / `screen:` (on-screen text, src/world/boards.ts and src/direction/Layers2D.tsx), music theme `none` (silence), one hero rig scaled by age (performance.ts `ageScale`), shots mapped onto earlier staging by `legacy()` (new beats are s80-s90), story props in src/world/storyProps.ts.

Read `docs/feedback.md` first.
