// The parts of a vertical short's frame that matter, as fractions (x from the left, y from the top): where the
// captions sit, and where TikTok / Shorts / Reels draw their own buttons and text. One source for the captions
// component, the debug overlay, frame() and the staging check. BlockRig extra.
export const ZONES = {
  /** the caption band (top, bottom) */
  captions: [0.62, 0.75],
  /** the app's buttons on the right */
  buttons: { x: [0.86, 1], y: [0.42, 0.82] },
  /** the app's caption / username from here down */
  bottom: 0.84,
  /** the app's top bar down to here */
  top: 0.07,
};
/** The band a watched face must stay out of while a caption shows (a little above and into the captions). */
export const captionBand = (top = ZONES.captions[0]) => [top - 0.03, top + 0.07];
