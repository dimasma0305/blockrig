// Real channel avatars, team logos and video thumbnails (LiveOverflow, John Hammond, kurenaif, Project SEKAI, PPP),
// the user's request: "more like their real YouTube video or profile picture". They are the creators' own images,
// downloaded into assets/brands/ (git-ignored, like the Roblox items; never committed). Loaded before the canvas
// mounts, so the boards can draw them on any frame. A missing file just leaves that picture out.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

const FILES = {
  liveoverflow: "liveoverflow.jpg", johnhammond: "johnhammond.jpg", kurenaif: "kurenaif.jpg", kurenaifBanner: "kurenaif_banner.jpg",
  sekai: "sekai.png", ppp: "ppp.png",
  thumbLO1: "thumb_lo1.jpg", thumbLO2: "thumb_lo2.jpg", thumbJH: "thumb_jh1.jpg",
  kfHeap: "thumb_kf1.jpg", kfPwn: "thumb_kf2.jpg", kfCrypto: "kf_crypto.jpg", kfReed: "kf_reed.jpg", kfDefcon: "kf_defcon.jpg", kfCake: "kf_cake.jpg", kfPipe: "kf_pipe.jpg",
} as const;
export type BrandName = keyof typeof FILES;
export const BRAND: Partial<Record<BrandName, HTMLImageElement>> = {};

const load = (src: string) => new Promise<HTMLImageElement | null>((ok) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

/** true once every brand image has loaded (or failed); holds the render until then. */
export function useBrands() {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading brand images"));
  useEffect(() => {
    Promise.all(Object.entries(FILES).map(async ([k, f]) => { const img = await load(staticFile(`brands/${f}`)); if (img) BRAND[k as BrandName] = img; }))
      .then(() => { setReady(true); continueRender(handle); });
  }, [handle]);
  return ready;
}
