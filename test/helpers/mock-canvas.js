// A canvas stand-in for Node: records every 2D context call so drawing code can be tested without a browser.
export function mockCanvas(size = 256) {
  const calls = [];
  const state = {};
  const ctx = new Proxy(state, {
    get(t, k) { if (k in t) return t[k]; return (...args) => { calls.push([k, ...args.map((a) => (typeof a === "number" ? Math.round(a * 100) / 100 : a))]); }; },
    set(t, k, v) { t[k] = v; calls.push([`=${String(k)}`, v]); return true; },
  });
  return { width: size, height: size, getContext: () => ctx, calls, reset() { calls.length = 0; } };
}
