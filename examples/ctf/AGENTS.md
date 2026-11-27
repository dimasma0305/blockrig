# AGENTS.md: "Everybody Plays CTF" (made from examples/template)

**The rules and the skills live in the template, once:** read [`../template/AGENTS.md`](../template/AGENTS.md) and
follow it here. Where it says `.agents/skills/<stage>`, read [`../template/.agents/skills/<stage>/SKILL.md`](../template/.agents/skills/).
Improve the template's rules and skills when you learn something, so every video gets it; write only what is
specific to this video below.

## This video

"In this world, everybody plays CTF": the last-ranked player beats the World Final by viewing the page source.
Neon city at night with rain and a lightning storm; a Vault plaza with a hex force-field dome (`src/world/vfx.ts`:
tower windows, dome, holograms, glyph rain, beams, particle bursts). Places are in `src/world/layout.ts` (street on
Z, the plaza far away at x = 400), and the street is laid out on a 2D plan in `src/world/World.ts` (PlanLab shows it).
Characters carry floating rank tags welded above their heads, so close-ups aim below the head (camera skill). The
hero types on the terminal by IK (s10). This video has no Roblox maps, so its Debug folder has no MapLab.

Read `docs/feedback.md` first.
