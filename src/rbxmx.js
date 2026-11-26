// Reader for the XML Roblox model format (.rbxmx), producing the same instance tree as parseRbxm().
// Format: <roblox version="4"><Item class="..." referent="..."><Properties>...</Properties><Item .../></Item></roblox>
// Property elements are named by type (string, bool, int, float, double, token, Vector3, CoordinateFrame,
// Content, Color3, Color3uint8, ...) with a name="PropertyName" attribute.

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescape = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m));

// tiny XML tree builder: elements with attributes, children and text (CDATA supported)
function xmlTree(text) {
  const root = { tag: "#root", attrs: {}, children: [], text: "" }, stack = [root];
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) { top.text += m[1]; continue; }
    if (m[6] !== undefined) { top.text += unescape(m[6]); continue; }
    if (!m[3]) continue; // comment or processing instruction
    if (m[2] === "/") { if (stack.length > 1) stack.pop(); continue; }
    const attrs = {};
    for (const a of m[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = unescape(a[2] ?? a[3]);
    const el = { tag: m[3], attrs, children: [], text: "" };
    top.children.push(el);
    if (!m[5]) stack.push(el);
  }
  return root;
}

const child = (el, tag) => el.children.find((c) => c.tag === tag);
const num = (el, tag, d = 0) => { const c = child(el, tag); return c ? parseFloat(c.text) : d; };

function propValue(p) {
  const t = p.tag, txt = p.text.trim();
  switch (t) {
    case "string": case "ProtectedString": return p.text;
    case "BinaryString": { const s = (p.text || "").replace(/s+/g, ""); if (!s) return ""; const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; } // base64
    case "bool": return txt === "true";
    case "int": case "int64": case "token": return parseInt(txt, 10);
    case "float": case "double": return parseFloat(txt);
    case "Vector3": return [num(p, "X"), num(p, "Y"), num(p, "Z")];
    case "Vector2": return [num(p, "X"), num(p, "Y")];
    case "CoordinateFrame": case "CFrame": return { rot: ["R00", "R01", "R02", "R10", "R11", "R12", "R20", "R21", "R22"].map((k, i) => num(p, k, i % 4 === 0 ? 1 : 0)), pos: [num(p, "X"), num(p, "Y"), num(p, "Z")] };
    case "Content": { const u = child(p, "url"); return u ? u.text.trim() : ""; }
    case "Color3": return child(p, "R") ? [num(p, "R"), num(p, "G"), num(p, "B")] : (() => { const v = parseInt(txt, 10) >>> 0; return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; })();
    case "Color3uint8": { const v = parseInt(txt, 10) >>> 0; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
    case "Ref": return txt === "null" ? null : txt;
    default: return undefined; // unsupported types are skipped, as in the binary reader
  }
}

/** Parse XML model text into root instances ({ className, ref, props, children, parent }). */
export function parseRbxmx(text) {
  const doc = xmlTree(text);
  const robloxEl = doc.children.find((c) => c.tag === "roblox");
  if (!robloxEl) throw new Error("blockrig: not an XML Roblox model");
  const build = (el, parent) => {
    const inst = { className: el.attrs.class, ref: el.attrs.referent, props: {}, children: [], parent };
    const props = child(el, "Properties");
    if (props) for (const p of props.children) { const v = propValue(p); if (v !== undefined && p.attrs.name) inst.props[p.attrs.name] = v; }
    for (const c of el.children) if (c.tag === "Item") inst.children.push(build(c, inst));
    return inst;
  };
  return robloxEl.children.filter((c) => c.tag === "Item").map((c) => build(c, null));
}
