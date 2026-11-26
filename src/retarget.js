// Retarget clips between R15 and R6. Roblox does not play R15 animations on R6 (or the reverse) because
// poses are matched by part name; these helpers rename the joints that exist in both rigs.

const R15_TO_R6 = {
  UpperTorso: "Torso", LeftUpperArm: "Left Arm", RightUpperArm: "Right Arm",
  LeftUpperLeg: "Left Leg", RightUpperLeg: "Right Leg", Neck: "Neck", Head: "Neck", HumanoidRootPart: "HumanoidRootPart",
};
const R6_TO_R15 = { Torso: "UpperTorso", "Left Arm": "LeftUpperArm", "Right Arm": "RightUpperArm", "Left Leg": "LeftUpperLeg", "Right Leg": "RightUpperLeg", Neck: "Neck", Head: "Neck", HumanoidRootPart: "HumanoidRootPart" };

function remap(clip, map, suffix, fallbacks = {}) {
  return {
    ...clip,
    name: `${clip.name}${suffix}`,
    keyframes: clip.keyframes.map((kf) => {
      const poses = {};
      for (const [j, p] of Object.entries(kf.poses)) { const to = map[j]; if (to && !poses[to]) poses[to] = { ...p }; }
      // joints R6 folds together: use the lower torso if the clip has no upper torso key here
      for (const [from, to] of Object.entries(fallbacks)) if (!poses[to] && kf.poses[from]) poses[to] = { ...kf.poses[from] };
      return { t: kf.t, poses };
    }).filter((kf) => Object.keys(kf.poses).length),
  };
}

/** R15 clip -> R6 clip (forearms, hands, shins and feet are dropped). */
export const toR6 = (clip) => remap(clip, R15_TO_R6, "-r6", { LowerTorso: "Torso" });
/** R6 clip -> R15 clip (drives the upper limbs and upper torso). */
export const toR15 = (clip) => remap(clip, R6_TO_R15, "-r15");
/** Retarget every clip in a { name: clip } map. */
export const retargetAll = (clips, fn) => Object.fromEntries(Object.entries(clips).map(([k, c]) => [k, fn(c)]));
