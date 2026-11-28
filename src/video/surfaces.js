// How surfaces behave under a character: how far a body sinks into them (studs). A bed, sofa or pillow gives way,
// so a seated character rests a little below its top; grass and carpet take the feet a hair; floors, roads and wood
// do not give at all. Used for staging (`restOn(top, "bed")`) and by the staging check (createProbe): sinking within
// a surface's softness is fine, deeper is "sunk", and resting exactly on top of something soft is "stiff".
// Names are matched against collider labels (asset names, Roblox model/part names); Roblox `Material` enum values
// are used when the name says nothing. BlockRig extra (Roblox collisions are rigid).

const BY_NAME = [
  [/pillow|cushion|beanbag|bean.?bag/i, { name: "pillow", sink: 0.45 }],
  // a whole word "bed" (bed, BigBed, Bed Base, bedSingle), never "Bedroom" (the room's walls and floor)
  [/(^|[^a-z])(big)?bed(single|double|base| base)?([^a-z]|$)|mattress|blanket|duvet|quilt/i, { name: "bed", sink: 0.35 }],
  [/sofa|couch|armchair|lounge/i, { name: "sofa", sink: 0.3 }],
  [/snow/i, { name: "snow", sink: 0.3 }],
  [/sand|mud/i, { name: "sand", sink: 0.12 }],
  [/lawn|grass/i, { name: "grass", sink: 0.06 }],
  [/rug|carpet/i, { name: "carpet", sink: 0.04 }],
];
// Roblox Material enum values that give way (https://create.roblox.com/docs/reference/engine/enums/Material)
const BY_MATERIAL = {
  1312: { name: "fabric", sink: 0.3 }, 1328: { name: "snow", sink: 0.3 }, 1296: { name: "sand", sink: 0.12 },
  1344: { name: "mud", sink: 0.15 }, 1280: { name: "grass", sink: 0.06 }, 1284: { name: "grass", sink: 0.06 },
};
const HARD = { name: "hard", sink: 0 };

/** What a surface is made of, from its label (and Roblox material, if any). */
export function surfaceOf(label, material) {
  for (const [re, s] of BY_NAME) if (re.test(label)) return s;
  return (material != null && BY_MATERIAL[material]) || HARD;
}
/** Where a body rests on a surface whose top is at `top`: a little lower on soft things. */
export const restOn = (top, what, material) => top - surfaceOf(what, material).sink;
