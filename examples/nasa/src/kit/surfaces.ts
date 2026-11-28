// How surfaces behave under a character: how far a body sinks into them (studs). A bed, sofa or pillow gives way, so
// a seated character rests a little below its top; grass and carpet take the feet a hair; floors, roads and wood
// do not give at all. Used twice:
//   - staging: `restOn(top, "bed")` is where hips or feet go on that surface (World.ts seats, performance.ts);
//   - the collision check (kit/collide.ts): sinking within a surface's softness is fine, deeper is "sunk", and a
//     character perched exactly on top of something soft is "stiff" (it looks like sitting on a board).
// Names are matched against collider labels (Kenney asset names, Roblox model/part names) and Roblox materials.
export type Surface = { name: string; sink: number };

const BY_NAME: [RegExp, Surface][] = [
  [/pillow|cushion|beanbag|bean.?bag/i, { name: "pillow", sink: 0.45 }],
  // a whole word "bed" (bed, BigBed, Bed Base, bedSingle), never "Bedroom" (that is the room's walls and floor)
  [/(^|[^a-z])(big)?bed(single|double|base| base)?([^a-z]|$)|mattress|blanket|duvet|quilt/i, { name: "bed", sink: 0.35 }],
  [/sofa|couch|armchair|lounge/i, { name: "sofa", sink: 0.3 }],
  [/snow/i, { name: "snow", sink: 0.3 }],
  [/sand|mud/i, { name: "sand", sink: 0.12 }],
  [/lawn|grass/i, { name: "grass", sink: 0.06 }],
  [/rug|carpet/i, { name: "carpet", sink: 0.04 }],
];
// Roblox Material enum values that give way (when a part's name says nothing)
const BY_MATERIAL: Record<number, Surface> = {
  1312: { name: "fabric", sink: 0.3 }, 1328: { name: "snow", sink: 0.3 }, 1296: { name: "sand", sink: 0.12 },
  1344: { name: "mud", sink: 0.15 }, 1280: { name: "grass", sink: 0.06 }, 1284: { name: "grass", sink: 0.06 },
};
const HARD: Surface = { name: "hard", sink: 0 };

/** What a surface is made of, from its label (and Roblox material, if any). */
export function surfaceOf(label: string, material?: number): Surface {
  for (const [re, s] of BY_NAME) if (re.test(label)) return s;
  return (material != null && BY_MATERIAL[material]) || HARD;
}
/** Where a body rests on a surface whose top is at `top`: a little lower on soft things. */
export const restOn = (top: number, what: string, material?: number) => top - surfaceOf(what, material).sink;
