// What the narrator should say, and whether a take said it: numbers spelled out the way speech recognition writes
// them back ("$5,000" -> "five thousand dollars"), homophones counted as right, and a letter-level match score.
// Fixes: takes that said the line right were thrown away because Whisper wrote "$5,000" or "11", or heard "an" as
// "and"; "bot net" and "botnet" are the same words.

const ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const TENS = "  twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
/** 0..999,999,999 in words ("one hundred five", "five thousand"). */
export function numberWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numberWords(n % 100) : "");
  if (n < 1e6) return numberWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + numberWords(n % 1000) : "");
  return numberWords(Math.floor(n / 1e6)) + " million" + (n % 1e6 ? " " + numberWords(n % 1e6) : "");
}
/** Spell out the numbers in a text the way they are spoken: "$5,000" -> "five thousand dollars", "11" -> "eleven". */
export function spellNumbers(s) {
  return s.replace(/(\$?)(\d[\d,]*)(st|nd|rd|th)?/g, (m, dollar, d, ord) => {
    const n = +d.replace(/,/g, "");
    if (!Number.isFinite(n) || n >= 1e9) return m;
    return numberWords(n) + (ord ? "th" : "") + (dollar ? " dollars" : "");
  });
}
// homophones and words speech recognition swaps: each maps to one spelling
const SAME = { knew: "new", their: "there", theyre: "there", too: "to", two: "to", four: "for", through: "threw", thru: "threw", and: "an", ok: "okay" };
/** A text as comparable words: numbers spelled out, lower case, punctuation and hyphens gone, homophones merged. */
export function normalizeWords(s) {
  return spellNumbers(s).toLowerCase().replace(/-/g, " ").replace(/[^a-z0-9' ]/g, " ").replace(/'/g, "").split(/\s+/).filter(Boolean).map((w) => SAME[w] ?? w);
}
/** How well `heard` matches `script`, 0..1: letters only (spaces ignored), 1 - edit distance / length. */
export function matchScore(script, heard) {
  const x = normalizeWords(script).join(""), y = normalizeWords(heard).join("");
  if (!x.length && !y.length) return 1;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length, 1);
}
/** Words in a line (split on spaces), as captions count them. */
export const wordCount = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
/** Syllables in a word (vowel groups; at least 1), for spreading time over words. */
export const syllables = (w) => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]+/g) || []).length);
