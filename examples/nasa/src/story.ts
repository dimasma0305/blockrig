// The timeline of this video: docs/story.md compiled to src/generated/story.json (npm run docs), placed on the
// measured narration (assets/audio/timings.json, from npm run voice).
import story from "./generated/story.json";
import timings from "../assets/audio/timings.json";
import { createTimeline, parseWeather, mixWeather, daylight, mixDaylight, type Shot, type StoryFile, type Timings } from "./kit";

export const T = createTimeline(story as unknown as StoryFile, timings as unknown as Timings);
export const { FPS, WIDTH, HEIGHT, SHOTS, TOTAL_FRAMES } = T;

const split = (v: string | undefined) => (v ?? "").split("->").map((x) => x.trim()).filter(Boolean);
/** The shot's weather at progress p ("rain -> clear" blends across the middle of the shot). */
export function weatherAt(shot: Shot, p: number) {
  const [a, b] = split(shot.weather);
  if (!b) return parseWeather(a);
  return mixWeather(parseWeather(a), parseWeather(b), Math.min(1, Math.max(0, (p - 0.25) / 0.5)));
}
/** The shot's time of day at progress p ("storm -> golden" blends the same way). */
export function daylightAt(shot: Shot, p: number) {
  const [a, b] = split((shot as any).time);
  if (!b) return daylight(a);
  return mixDaylight(daylight(a), daylight(b), Math.min(1, Math.max(0, (p - 0.25) / 0.5)));
}
