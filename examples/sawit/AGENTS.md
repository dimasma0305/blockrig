# AGENTS.md: "The Sawit Spirit" (made from examples/template)

**The rules and the skills live in the template, once:** read [`../template/AGENTS.md`](../template/AGENTS.md) and
follow it here. Where it says `.agents/skills/<stage>`, read [`../template/.agents/skills/<stage>/SKILL.md`](../template/.agents/skills/).
Improve the template's rules and skills when you learn something, so every video gets it; write only what is
specific to this video below.

## This video

A kingdom where every unplanted forest burns at night and is sawit (oil palm) by morning; the kind King is behind
it, and the town sees the proof (his map, a guard's badge, the guard's confession). Four places far apart
(`LOCATIONS` in `src/world/World.ts`): the village (Roblox Toolbox houses around a cobbled square, the King's statue,
the planting field), the forest (Grandpa's forest, the sawit around it, the victim forest), the palace (a Roblox
Toolbox castle) and the King's secret room. Palms, trees and coins are instanced from Kenney models; fire, smoke and
water are `src/world/fire.ts`; the boards (map, ledger, portrait) are `src/world/boards.ts`. Ground surfaces use
`layer()` (src/kit/ground.ts). Guards hold torches with `equipTool` + `clips.toolHold`.

Read `docs/feedback.md` first.
