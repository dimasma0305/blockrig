// Describe a Roblox model/map (parsed .rbxm) as plain JSON the video can render without Roblox: every visible part
// with its shape, size, CFrame, colour, material, transparency, mesh modifier, decals/textures and lights, plus the
// asset ids it needs (file meshes, mesh textures, decal images). Used by fetch-roblox.mjs for "kind": "map";
// src/kit/robloxMap.ts draws the result.
import { assetId, BRICK_COLORS } from "blockrig";

const BASE_PARTS = new Set(["Part", "WedgePart", "CornerWedgePart", "TrussPart", "SpawnLocation", "Seat", "VehicleSeat", "MeshPart", "UnionOperation", "NegateOperation", "IntersectOperation", "SkateboardPlatform"]);
const SKIP = new Set(["Camera", "Script", "LocalScript", "ModuleScript", "Sound", "ParticleEmitter", "Fire", "Smoke", "Sparkles", "Humanoid"]);
const vec = (v, d) => (Array.isArray(v) ? v.map((x) => (x == null ? 0 : x)) : d);
// newer files store Color3uint8; old ones (before 2016) only a BrickColor number
function color(p) {
  if (p.Color3uint8) return p.Color3uint8.map((v) => v / 255);
  if (Array.isArray(p.Color)) return p.Color;
  const b = BRICK_COLORS[p.BrickColor ?? p.brickColor];
  return b ? b.slice(1).map((v) => v / 255) : [0.64, 0.64, 0.64];
}

/** @returns {{ parts: object[], lights: object[], refs: { meshes: Set<number>, images: Set<number> } }} */
export function describeMap(roots) {
  const parts = [], lights = [], refs = { meshes: new Set(), images: new Set() };
  const visit = (x, model) => {
    if (SKIP.has(x.className)) return;
    if (x.className === "Model" || x.className === "Folder") model = x.props.Name ?? model;
    if (BASE_PARTS.has(x.className) && x.props.CFrame && (x.props.size || x.props.Size)) {
      const p = x.props, transparency = p.Transparency ?? 0;
      const part = {
        cls: x.className, name: p.Name, model, size: vec(p.size ?? p.Size), cframe: p.CFrame, color: color(p), material: p.Material ?? 256,
        transparency, reflectance: p.Reflectance ?? 0, shape: x.className === "Part" || x.className === "SpawnLocation" || x.className === "Seat" ? p.shape ?? 1 : null,
      };
      if (x.className === "MeshPart") {
        const mesh = assetId(p.MeshId ?? p.MeshContent), tex = assetId(p.TextureID ?? p.TextureContent);
        const sa = x.children.find((c) => c.className === "SurfaceAppearance"), map = sa ? assetId(sa.props.ColorMap ?? sa.props.ColorMapContent) : null;
        part.mesh = mesh; part.texture = map ?? tex; part.initialSize = vec(p.InitialSize, part.size);
        if (mesh) refs.meshes.add(mesh); if (part.texture) refs.images.add(part.texture);
      }
      if (x.className === "UnionOperation") part.union = assetId(p.AssetId);
      for (const c of x.children) {
        if (c.className === "SpecialMesh" || c.className === "BlockMesh" || c.className === "CylinderMesh" || c.className === "FileMesh") {
          const q = c.props, mesh = assetId(q.MeshId ?? q.MeshContent), tex = assetId(q.TextureId ?? q.TextureContent);
          part.modifier = { cls: c.className, type: c.className === "BlockMesh" ? 6 : c.className === "CylinderMesh" ? -4 : q.MeshType ?? 5, scale: vec(q.Scale, [1, 1, 1]), offset: vec(q.Offset, [0, 0, 0]), mesh, texture: tex, vertexColor: vec(q.VertexColor, [1, 1, 1]) };
          if (mesh) refs.meshes.add(mesh); if (tex) refs.images.add(tex);
        } else if (c.className === "Decal" || c.className === "Texture") {
          const q = c.props, img = assetId(q.Texture ?? q.TextureContent ?? q.ColorMapContent);
          if (!img || (q.Transparency ?? 0) >= 1) continue;
          (part.decals ??= []).push({ cls: c.className, face: q.Face ?? 5, image: img, transparency: q.Transparency ?? 0, color: vec(q.Color3, [1, 1, 1]),
            studsU: q.StudsPerTileU ?? 2, studsV: q.StudsPerTileV ?? 2, offsetU: q.OffsetStudsU ?? 0, offsetV: q.OffsetStudsV ?? 0 });
          refs.images.add(img);
        } else if (/Light$/.test(c.className) && (c.props.Enabled ?? true)) {
          lights.push({ cls: c.className, at: p.CFrame.pos, rot: p.CFrame.rot, color: vec(c.props.Color, [1, 1, 1]), brightness: c.props.Brightness ?? 1, range: c.props.Range ?? 16, face: c.props.Face ?? 5, angle: c.props.Angle ?? 90 });
        }
      }
      // a mesh modifier hides the part's own shape; a fully transparent part only matters for its decals
      if (transparency < 1 || part.decals) parts.push(part);
    }
    for (const c of x.children) visit(c, model);
  };
  for (const r of roots) visit(r, null);
  return { parts, lights, refs };
}
