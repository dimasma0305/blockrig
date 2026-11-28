// Real images for a video (creator avatars, video thumbnails, team logos, posters): loaded once, before the first
// frame draws, so boards can use them on any frame. They are the creators' own images, downloaded into the video's
// git-ignored assets (never committed, never shipped with BlockRig). A missing or broken file is left out (null), so
// a fresh copy of a video still renders with grey boxes in their place. BlockRig extra.
//
//   const IMAGES = await loadImages({ avatar: "brands/avatar.jpg", thumb: "brands/thumb.jpg" }, staticFile)
//   pic(g, IMAGES.avatar, ...)

/** One image, or null when it fails to load. Browser only (or pass `{ Image }` for another environment). */
export function loadImage(src, { Image: Img = globalThis.Image } = {}) {
  return new Promise((ok) => {
    if (!Img) return ok(null);
    const i = new Img(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src;
  });
}

/**
 * Load named images in parallel: `{ name: file }` -> `{ name: image | null }`. `resolve(file)` turns a file into a URL
 * (Remotion's `staticFile`); by default the file is used as given.
 */
export async function loadImages(files, resolve = (f) => f, o = {}) {
  const entries = await Promise.all(Object.entries(files).map(async ([k, f]) => [k, await loadImage(resolve(f), o)]));
  return Object.fromEntries(entries);
}
