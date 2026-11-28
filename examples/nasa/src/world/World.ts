// The places (docs/visuals.md "Locations"): my room (a Roblox Toolbox bedroom with a gaming desk), the nursery (a
// Roblox Toolbox bedroom with big windows), the preschool CTF room, the conference hall and my best friend's room
// (Kenney furniture and walls), plus the yard outside my window where kids play. Every place sits far from the
// others so two never share a frame. Screens and boards (src/world/boards.ts) carry all the on-screen text.
import * as THREE from "three";
import { createLighting, applyFog, LOOK, rng, type AssetLibrary, type Weather, type Daylight } from "../kit";
import { buildRobloxMap } from "blockrig/video";
import { createCascades, type Cascades } from "../kit/cascades";
import { layer, checkGround, lightsByLocation } from "blockrig/video";
import { restOn } from "blockrig/video";
import type { RobloxCast } from "../cast/roblox";
import { HOUSES } from "./assets";
import { screen, banner, fanFlag, calendar, timerTag, poster, standee, nameTag } from "./boards";
import * as P from "./storyProps";

export const LOCATIONS = { room: new THREE.Vector3(0, 0, 0), nursery: new THREE.Vector3(600, 0, 0), preschool: new THREE.Vector3(1200, 0, 0), hall: new THREE.Vector3(1800, 0, 0), friend: new THREE.Vector3(2400, 0, 0), town: new THREE.Vector3(3000, 0, 0) };
// Roblox rooms, in the map's own studs (read off map.json / MapLab): the floor centre, and the inner faces of the walls
const ROOM = { map: "mapBedroomA", floor: new THREE.Vector3(80.7, 1.25, 192.4), inner: new THREE.Box3(new THREE.Vector3(69.1, 1.25, 181.3), new THREE.Vector3(92.4, 13.5, 203.6)) };
const NURSERY = { map: "mapBedroomB", floor: new THREE.Vector3(-307.8, 1.0, -29.6), inner: new THREE.Box3(new THREE.Vector3(-321, 1.0, -45), new THREE.Vector3(-293.5, 20, -15.2)) };
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type Lib = AssetLibrary;
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };

function strip(lib: Lib, tex: string, w: number, d: number, studs: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lib.pbr(tex, { repeat: [w / studs, d / studs] }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.userData.label = tex; return m;
}
function wallBox(lib: Lib, w: number, h: number, colour: string) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), lib.pbr("concrete", { repeat: [w / 10, h / 10], color: colour, roughness: 0.9 }));
  m.receiveShadow = true; m.castShadow = true; return m;
}
/** A Kenney room: plank floor, walls of wall/wallWindow/wallDoorway pieces (7 x 9 studs), open towards +Z. */
function kenneyRoom(lib: Lib, root: THREE.Object3D, o: THREE.Vector3, cols: number, rows: number, pieces: (side: string, i: number) => string, floor = "planks") {
  const W = 7, w = cols * W, d = rows * W, g = new THREE.Group(); g.position.copy(o); root.add(g);
  g.add(layer(strip(lib, floor, w + 2, d + 2, 6), 1, 0));
  for (let i = 0; i < cols; i++) g.add(at(lib.model(pieces("back", i), { width: W }), -w / 2 + W / 2 + i * W, 0, -d / 2));
  for (const s of [-1, 1]) for (let i = 0; i < rows; i++) g.add(at(lib.model(pieces(s < 0 ? "left" : "right", i), { width: W }), s * w / 2, 0, -d / 2 + W / 2 + i * W, Math.PI / 2));
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.4, d + 1), new THREE.MeshStandardMaterial({ color: "#f3efe6", roughness: 0.9 })); ceil.position.y = 9.2; g.add(ceil);
  return { g, w, d };
}

export function buildWorld(gl: THREE.WebGLRenderer, scene: THREE.Scene, lib: Lib, rb: RobloxCast | null = null) {
  const root = new THREE.Group(); root.name = "World";
  const r = rng(7);
  // the base grass, just under the Roblox rooms' floors (their top is at 0)
  const far = layer(strip(lib, "grass", 6000, 1600, 10), 0, -0.08); far.position.x = 1200; root.add(far);

  // ---------------------------------------------------------------- my room (Roblox Toolbox bedroom, gaming desk)
  const R = LOCATIONS.room;
  const roomMap = rb?.maps[ROOM.map];
  if (!roomMap) throw new Error("this video needs the Roblox rooms: run npm run roblox");
  // the curtain behind the desk is left out so the window shows the yard where the kids play; the side monitor,
  // a speaker and the pen cup on the desk corner are left out too: they stood between the cameras and me
  const rm = buildRobloxMap(roomMap.data, { ...roomMap, pbr: (n) => lib.pbr(n) }, { skip: (p) => (p.name === "Curtain" && p.cframe.pos[0] > 80) || /^(Speaker|CupHolder|Monitor)$/.test(p.model ?? "") || (p.model === "Model" && Math.abs(p.cframe.pos[0] - 88.2) < 0.8 && Math.abs(p.cframe.pos[2] - 191.9) < 0.8)
    || (p.model === "Desk" && p.size[0] > 10) });
  const shift = R.clone().sub(ROOM.floor); rm.group.position.copy(shift); root.add(rm.group);
  const M = (x: number, y: number, z: number) => V3(x, y, z).add(shift); // map studs -> world
  // the desk top along the monitor wall (the map's L-shaped CSG top, drawn as its bounding box, covered the chair)
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.2, 12.2), new THREE.MeshStandardMaterial({ color: "#26262b", roughness: 0.5 }));
  top.position.copy(M(89.5, 4.2, 196.4)); top.castShadow = true; top.receiveShadow = true; top.userData.label = "Desk/top"; root.add(top);
  // the gaming chair is the seat I sit in: its one-box-per-part colliders would swallow me (check faces in stills)
  rm.group.userData.colliders = (rm.group.userData.colliders ?? []).filter((b: { name: string; size: number[] }) => !/^GamingChair/.test(b.name) || (b.name === "GamingChair/Pillow" && b.size[2] > 2)); // keep the seat cushion
  const chairBox = rm.find(/GamingChair/).translate(shift);
  const room = {
    box: ROOM.inner.clone().translate(shift).expandByScalar(-0.8),
    // the open floor between the bed, the desk and the window: room cameras stay in it, so no chair back, desk or bed blocks them
    open: new THREE.Box3(V3(-0.2, 1.4, -9.4), V3(10.8, 10.5, -2.7)).translate(R),
    chair: V3((chairBox.min.x + chairBox.max.x) / 2 - 0.2, 0, (chairBox.min.z + chairBox.max.z) / 2), seat: restOn(M(85.2, 4.0, 195.8).y, "cushion"), // on the seat cushion (top at 4.0 in map studs), sinking in a little
    keys: M(87.6, 4.45, 195.6), screenAt: M(90.42, 5.35, 195.95),
    window: M(86.4, 7, 181.3), door: M(88, 0, 186), pkg: M(78.5, 0, 186.5), stand: M(80.5, 0, 191), behind: M(82.3, 0, 195.6),
    side: M(84.6, 0, 191.6), outside: M(84, 0, 168),
  };
  for (const [x, y, z, i] of [[3, 10.5, -5, 34], [5, 9, 1, 16]]) { const l = new THREE.PointLight("#fff1dc", i, 40, 1.2); l.position.copy(R).add(V3(x, y, z)); root.add(l); }
  // my laptop on the front edge of the desk, facing the room (the hook: NASA: LOCKED over my shoulder)
  const lapAt = V3(3.2, 3.05, -1.5).add(R), lapRot = 2.34;
  const lapBase = at(lib.model("laptop", { width: 2.6 }), lapAt.x, lapAt.y, lapAt.z, lapRot + Math.PI); root.add(lapBase);
  const lap = screen(2.3, 1.45); lap.position.copy(lapAt).add(V3(Math.sin(lapRot) * -0.55, 1.0, Math.cos(lapRot) * -0.55)); lap.rotation.set(0, lapRot, 0); root.add(lap); lap.userData.base = lapBase; lap.userData.noCollide = lapBase.userData.noCollide = true; // only in the hook
  const mon = screen(3.55, 2.6); mon.position.copy(room.screenAt); mon.rotation.y = -Math.PI / 2; root.add(mon);
  // story props in the room (shown per shot by performance.ts)
  const props = {
    pkg: at(lib.model("cardboardBoxClosed", { height: 4.2 }), room.pkg.x, 0, room.pkg.z, 0.25),
    pkgOpen: at(lib.model("cardboardBoxOpen", { height: 4.2 }), room.pkg.x, 0, room.pkg.z, 0.25),
    pkgLabel: P.packageLabel(), ball: P.redBall(), juice: P.juiceBox(), yogurt: P.yogurt(), workbook: P.book("OSWE", "#6a4c93"),
    juicePile: new THREE.Group(), suitcase: P.suitcase("#2f6fd6", true, ["CODEGATE", "SECCON"]), trophyBig: P.trophy(2.6), plushInCase: P.dragonPlush(0.5),
    sunscreen: P.sunscreen(), receipt: P.sheet(1.1, 1.6), report: P.sheet(1.3, 1.7), sticky: P.stickyNote(), calendar: calendar(),
    books: [P.book("OSEP", "#1d3557", 1.4, 1.9), P.book("OSED", "#e63946", 1.4, 1.9)], phone: P.phone(), sandwich: P.sandwich(), cert: P.sheet(1.6, 1.1),
    plush: P.dragonPlush(0.42), fanFlag: fanFlag(0.9), milk: P.milkBottle(), badges: [P.badge("DEF CON CTF"), P.badge("SECCON", "#1d3557")], badgeWall: banner(["CTF BADGES"], 2.4, 1.4, "#14213d", "#fff", "#fca311"),
  };
  const moving = (o: any) => { if (Array.isArray(o)) o.forEach(moving); else if (o?.isObject3D) o.userData.noCollide = true; };
  Object.values(props).forEach(moving);
  props.pkgLabel.position.set(0, 2.2, 1.98); props.pkg.add(props.pkgLabel); // the box's front, in its own frame (height 4.2)
  for (let i = 0; i < 14; i++) { const j = P.juiceBox(); const q = rng(300 + i); j.position.set((q() - 0.5) * 1.6, Math.floor(i / 5) * 0.75, (q() - 0.5) * 1.2); j.rotation.y = q() * 3; props.juicePile.add(j); }
  props.juicePile.position.copy(M(88.4, 4.3, 201.2));
  props.sticky.position.copy(M(92.3, 8.6, 193)); props.sticky.rotation.y = -Math.PI / 2;
  props.calendar.position.copy(M(92.3, 8.3, 199.6)); props.calendar.rotation.y = -Math.PI / 2;
  props.badgeWall.position.copy(M(92.3, 8.6, 196.2)); props.badgeWall.rotation.y = -Math.PI / 2;
  props.books.forEach((b, i) => { b.position.copy(M(88.6, 4.3, 199.3 + i * 0.25)).add(V3(0, i * 0.26, 0)); b.rotation.y = 0.3; });
  root.add(props.pkg, props.pkgOpen, props.ball, props.juice, props.yogurt, props.workbook, props.juicePile, props.suitcase, props.trophyBig, props.plushInCase, props.sunscreen, props.receipt, props.report, props.sticky, props.calendar, ...props.books, props.phone, props.sandwich, props.cert, props.plush, props.badgeWall, props.fanFlag, props.milk, ...props.badges);
  for (const b of props.badges) b.visible = false;
  // laptop stickers next to the screen: TCP1P and Burp Suite (plain text)
  [["TCP1P", "#0b2545", "#13c4a3"], ["Burp Suite", "#ff6633", "#ffffff"]].forEach(([t, bg, ac], i) => { const st = banner([t], 0.9, 0.42, bg, "#fff", ac); st.position.copy(M(90.45, 3.95, 194.6 + i * 2.7)); st.rotation.y = -Math.PI / 2; root.add(st); });
  const recTex = screen(1.1, 1.6); recTex.position.z = 0.03; recTex.set("RECEIPT"); props.receipt.add(recTex);
  const repTex = screen(1.3, 1.7); repTex.position.z = 0.03; repTex.set("PROGRESS REPORT"); props.report.add(repTex);
  const certTex = screen(1.6, 1.1); certTex.position.z = 0.03; certTex.set("OSCP: PASSED"); props.cert.add(certTex);
  for (const k of ["ball", "juice", "yogurt", "workbook", "suitcase", "trophyBig", "plushInCase", "sunscreen", "receipt", "report", "phone", "sandwich", "cert", "plush", "pkgOpen", "fanFlag", "milk"] as const) (props as any)[k].visible = false;
  // the yard outside my window: lawn, a fence, trees and the houses across the way, where the kids play
  const yard = new THREE.Group(); root.add(yard);
  for (let i = 0; i < 6; i++) yard.add(at(lib.model("fence", { scale: 10 }), R.x - 14 + i * 4.8, 0, R.z - 36, 0));
  yard.add(at(lib.model(HOUSES[1], { scale: 15 }), R.x - 10, 0, R.z - 62, 0), at(lib.model(HOUSES[2], { scale: 15 }), R.x + 26, 0, R.z - 64, 0));
  yard.add(at(lib.model("treeLarge", { scale: 15 }), R.x - 18, 0, R.z - 30, 1), at(lib.model("treeSmall", { scale: 14 }), R.x + 20, 0, R.z - 28, 2), at(lib.model("treeLarge", { scale: 13 }), R.x + 10, 0, R.z - 44, 3));

  // ---------------------------------------------------------------- the nursery (Roblox Toolbox bedroom, big windows)
  const N = LOCATIONS.nursery, nMap = rb.maps[NURSERY.map];
  const nm = buildRobloxMap(nMap.data, { ...nMap, pbr: (n) => lib.pbr(n) }), nShift = N.clone().sub(NURSERY.floor); nm.group.position.copy(nShift); root.add(nm.group);
  const NM = (x: number, z: number) => V3(x, 0, z).add(nShift).setY(0);
  const nursery = {
    box: NURSERY.inner.clone().translate(nShift).expandByScalar(-0.8), baby: NM(-304, -21.5), door: NM(-316, -19), dad: NM(-312.5, -24.5), mom: NM(-309.5, -26.8),
    tabletAt: NM(-301.2, -20.6), chest: NM(-298.5, -24.5),
  };
  root.add(at(lib.model("rugRound", { width: 11 }), nursery.baby.x, 0.02, nursery.baby.z));
  root.add(at(lib.model("bear", { height: 2.2 }), nursery.baby.x - 3.4, 0, nursery.baby.z - 2.6, 0.6));
  const chest = at(lib.model("cardboardBoxOpen", { height: 2.6 }), nursery.chest.x, 0, nursery.chest.z, -0.5); root.add(chest);
  const htb = banner(["Hack The Box"], 1.8, 0.7, "#111927", "#9fef00", "#9fef00"); htb.position.set(nursery.chest.x - 0.7, 1.4, nursery.chest.z + 1.45); htb.rotation.y = -0.5; root.add(htb);
  const nPlush = P.dragonPlush(0.55); at(nPlush, nursery.baby.x + 2.6, 0, nursery.baby.z - 2.2, -0.7); root.add(nPlush);
  const babyLaptop = at(lib.model("laptop", { width: 1.7 }), nursery.baby.x, 0, nursery.baby.z + 1.5, Math.PI); root.add(babyLaptop);
  const babyScreen = screen(1.45, 0.95); root.add(babyScreen);
  const tcp = banner(["TCP1P"], 0.55, 0.3, "#0b2545", "#fff", "#13c4a3"); root.add(tcp);
  const tableN = at(lib.model("sideTable", { height: 2.2 }), nursery.tabletAt.x, 0, nursery.tabletAt.z, -0.4); root.add(tableN);
  const tablet = screen(1.5, 2.0); tablet.position.set(nursery.tabletAt.x, 3.3, nursery.tabletAt.z); tablet.lookAt(nursery.baby.clone().add(V3(0, 1.4, 0))); tablet.set("BEDTIME PLAYLIST"); root.add(tablet);
  root.add(at(lib.model("lampRoundFloor", { height: 7 }), N.x - 18, 0, N.z - 4));

  // ---------------------------------------------------------------- the preschool CTF room (Kenney)
  const S = LOCATIONS.preschool;
  kenneyRoom(lib, root, S, 5, 4, (side, i) => (side === "left" && i === 3 ? "wallDoorway" : side === "right" && i % 2 ? "wallWindow" : "wall"));
  const lobbyBoard = screen(13, 7.5); lobbyBoard.position.set(S.x, 5.2, S.z - 13.6); root.add(lobbyBoard);
  const pre = { seats: [] as { at: THREE.Vector3; seat: number }[], door: V3(S.x - 15, 0, S.z + 10), board: lobbyBoard.position.clone(), laptops: [] as (THREE.Mesh & { set(k: string, p?: number): void })[] };
  // two rows of three toddler gaming desks, facing the board (-Z): desk, laptop with a screen, a milk bottle, a small chair
  for (let row = 0; row < 2; row++) for (let c = 0; c < 3; c++) {
    const x = S.x + (c - 1) * 7, z = S.z - 2 + row * 7.5;
    root.add(at(lib.model("desk", { height: 2.3 }), x, 0, z - 1.2, Math.PI));
    root.add(at(lib.model("laptop", { width: 1.6 }), x, 2.3, z - 1.5, 0));
    const sc = screen(1.35, 0.85); sc.position.set(x, 2.95, z - 1.86); sc.rotation.x = -0.25; root.add(sc); pre.laptops.push(sc);
    root.add(at(P.milkBottle(), x + 1.4, 2.3, z - 1.1));
    const ch = at(lib.model("chair", { height: 3.2 }), x, 0, z + 0.9, Math.PI); root.add(ch);
    pre.seats.push({ at: V3(x, 0, z + 0.9), seat: 1.55 });
  }
  const kfNote = poster("kurenaif", 1.5, 1.7, "kurenaif", "#6b2fb3"); kfNote.position.set(S.x - 7.6, 2.36, S.z - 2.6); kfNote.rotation.x = -Math.PI / 2; root.add(kfNote); // his kurenaif notebook
  const kfStand = standee(5.2); kfStand.position.set(S.x - 11.2, 0, S.z - 2.4); kfStand.rotation.y = 0.35; root.add(kfStand); // a kurenaif standee by his desk
  root.add(at(lib.model("bookcaseOpen", { height: 6 }), S.x + 15, 0, S.z - 9, -Math.PI / 2), at(lib.model("pottedPlant", { height: 4 }), S.x - 15.5, 0, S.z - 12));
  const preLight = new THREE.PointLight("#fff1dc", 30, 50, 1.2); preLight.position.set(S.x, 8, S.z); root.add(preLight);

  // ---------------------------------------------------------------- the conference hall (school trips)
  const H = LOCATIONS.hall;
  const hallFloor = layer(strip(lib, "concrete", 60, 40, 8), 1, 0); hallFloor.position.x = H.x; hallFloor.position.z = H.z; root.add(hallFloor);
  const back = wallBox(lib, 60, 22, "#1d2433"); back.position.set(H.x, 11, H.z - 14); root.add(back);
  const banners = [["CODEGATE", "KOREA"], ["SECCON", "JAPAN"], ["DEF CON CTF", "LAS VEGAS"]].map(([a, b], i) => {
    const bn = banner([a, b], 11, 6, ["#0b3d91", "#b5121b", "#111111"][i], "#ffffff", ["#ffd166", "#ffffff", "#e63946"][i]);
    bn.position.set(H.x - 14 + i * 14, 9.5, H.z - 13.6); root.add(bn); return bn.position.clone();
  });
  const hall = { banners, kids: [V3(H.x - 5, 0, H.z - 2), V3(H.x + 3, 0, H.z - 1)] };
  for (let i = 0; i < 3; i++) { const t = at(lib.model("table", { height: 2.6 }), H.x - 14 + i * 14, 0, H.z - 8); root.add(t); root.add(at(P.trophy(3.2 + i * 0.6), H.x - 14 + i * 14, 2.6, H.z - 8)); }
  ["#2f6fd6", "#e63946", "#2a9d8f", "#f4a261"].forEach((c, i) => root.add(at(P.suitcase(c, false, i % 2 ? ["SECCON"] : ["CODEGATE"]), H.x - 9 + i * 5, 0, H.z + 4 - (i % 2) * 2, 0.3 - i * 0.2)));
  for (let i = 0; i < 3; i++) { const s = new THREE.SpotLight("#ffe6c0", 60, 40, 0.5, 0.6, 1.2); s.position.set(H.x - 14 + i * 14, 20, H.z + 2); s.target.position.set(H.x - 14 + i * 14, 8, H.z - 13); root.add(s, s.target); }
  const hallFill = new THREE.PointLight("#fff1dc", 26, 60, 1.1); hallFill.position.set(H.x, 14, H.z + 4); root.add(hallFill);

  // ---------------------------------------------------------------- my best friend's room (Kenney): kurenaif everywhere
  const F = LOCATIONS.friend;
  kenneyRoom(lib, root, F, 3, 3, () => "wall");
  root.add(at(lib.model("bedSingle", { length: 9 }), F.x - 6.5, 0, F.z - 5), at(lib.model("desk", { height: 3 }), F.x + 6, 0, F.z - 8.6), at(lib.model("computerScreen", { height: 2.2 }), F.x + 6, 3, F.z - 9.2));
  // kurenaif everywhere: her banner art as wallpaper across the back wall, real video thumbnails as posters,
  // a full-body standee, and her crypto video on his monitor
  const wall = poster("kurenaifBanner", 20, 7.5, "", "#2a1020"); wall.position.set(F.x, 5.2, F.z - 10.15); root.add(wall);
  ([["kfCrypto", -10.15, -6, "CTF Crypto 超入門"], ["kfReed", -10.15, 0, "LIVE"], ["kfDefcon", -10.15, 5.5, "DEF CON CTF"]] as const).forEach(([n, x, z, cap]) => { const pp = poster(n, 4.2, 3.2, cap, "#6b2fb3"); pp.position.set(F.x + x, 5.5, F.z + z); pp.rotation.y = Math.PI / 2; root.add(pp); });
  const kStand = standee(6.4); kStand.position.set(F.x - 3.2, 0, F.z - 7.6); kStand.rotation.y = 0.25; root.add(kStand);
  const fScreen = screen(2.6, 1.6); fScreen.position.set(F.x + 6, 4.15, F.z - 8.95); fScreen.set("KURENAIF"); root.add(fScreen);
  const fFlag = fanFlag(1.2); fFlag.position.set(F.x - 9, 0, F.z - 8.8); fFlag.scale.setScalar(1.4); root.add(fFlag);
  const friendRoom = { spot: V3(F.x + 1.5, 0, F.z - 3) };
  const fLight = new THREE.PointLight("#fff1dc", 22, 40, 1.3); fLight.position.set(F.x, 8.5, F.z); root.add(fLight);

  // ---------------------------------------------------------------- the town (the hook: a world where everyone is hacking)
  const TW = LOCATIONS.town;
  const road = layer(strip(lib, "asphalt", 140, 12, 8), 2, 0); road.position.set(TW.x, road.position.y, TW.z); root.add(road);
  for (const s of [-1, 1]) { const sw = layer(strip(lib, "concrete", 140, 6, 4), 1, 0); sw.position.set(TW.x, sw.position.y, TW.z + s * 9); root.add(sw); }
  for (let i = 0; i < 5; i++) for (const s of [-1]) { // the far side only: the crane comes down over the near side
    const h = lib.model(HOUSES[(i + (s > 0 ? 2 : 0)) % HOUSES.length], { scale: 15 }); root.add(at(h, TW.x - 44 + i * 22, 0, TW.z + s * 30, s > 0 ? Math.PI : 0));
    root.add(at(lib.model(i % 2 ? "treeSmall" : "treeLarge", { scale: 13 }), TW.x - 33 + i * 22, 0, TW.z + s * 17, i));
  }
  const billboard = new THREE.Group(); billboard.position.set(TW.x + 6, 0, TW.z - 15); root.add(billboard);
  const bb = banner(["HACK NASA BEFORE 10", "OR GET DELETED"], 18, 7.5, "#0b1020", "#ffffff", "#ff2d3d"); bb.position.y = 12; billboard.add(bb);
  for (const x of [-6, 6]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 0.6), new THREE.MeshStandardMaterial({ color: "#3a3f48", roughness: 0.6 })); post.position.set(x, 6, -0.4); post.castShadow = true; billboard.add(post); }
  const bigScreen = screen(9, 5.4); bigScreen.position.set(TW.x - 16, 9, TW.z - 14.5); bigScreen.set("NASA: LOCKED"); root.add(bigScreen);
  const bigPole = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9, 0.7), new THREE.MeshStandardMaterial({ color: "#3a3f48" })); bigPole.position.set(TW.x - 16, 4.5, TW.z - 15); bigPole.castShadow = true; root.add(bigPole);
  // everyone's laptop (a Kenney laptop and a glowing screen, carried in front of them by performance.ts)
  const townLaptops = Array.from({ length: 9 }, (_, i) => {
    const g = new THREE.Group(); const m = lib.model("laptop", { width: 1.5 }); m.rotation.y = Math.PI; g.add(m);
    const sc = screen(1.3, 0.8); sc.position.set(0, 0.55, 0.35); sc.rotation.set(-0.25, 0, 0); (sc.material as THREE.Material).side = THREE.DoubleSide; sc.set(["TCP1P", "PRACTICE TABS", "BUG BOUNTY TABS"][i % 3], 0.3 + i * 0.07); g.add(sc);
    g.visible = false; g.userData.noCollide = true; root.add(g); return g;
  });
  const town = { spots: [V3(-14, 0, 8), V3(-9, 0, 9.5), V3(-4, 0, 6.4), V3(1, 0, 9.3), V3(6.5, 0, 8), V3(12, 0, 9), V3(-11, 0, -8.5), V3(-2, 0, -8.2), V3(9, 0, -9)].map((v) => v.add(TW)), laptops: townLaptops };

  // confetti for the birthday: seeded boxes that fall through the shot (frame-pure)
  const confetti = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.04, 0.14), new THREE.MeshBasicMaterial({ toneMapped: false }), 240);
  const cr = rng(11), cols = ["#ff4fa3", "#3ec6ff", "#ffe066", "#7cff6b", "#ff8a3d"], cdata = Array.from({ length: 240 }, () => ({ x: (cr() - 0.5) * 12, z: (cr() - 0.5) * 9, y: 9 + cr() * 8, v: 2 + cr() * 2.5, s: cr() * 6, w: cr() * 3 }));
  cdata.forEach((_, i) => confetti.setColorAt(i, new THREE.Color(cols[i % cols.length])));
  confetti.userData.noCollide = true; confetti.visible = false; confetti.frustumCulled = false; root.add(confetti);
  const dummy = new THREE.Object3D();

  // ---------------------------------------------------------------- sky, sun
  let cascades: Cascades | null = null;
  const lighting = createLighting({ shadowSize: 45, sky: false }); root.add(lighting.root); lighting.root.userData.noCollide = true;
  const pmrem = new THREE.PMREMGenerator(gl), envs: Record<string, THREE.Texture> = {};
  const env = (name: string) => (envs[name] ??= pmrem.fromEquirectangular(lib.sky(name)).texture);
  const timer = timerTag(); timer.visible = false; root.add(timer);
  // hacker usernames over the kids' heads (the baby and the preschool), and my name sign in the nursery
  const tags = { hero: nameTag("0xDEAF"), friend: nameTag("kur3n4if", "#ff7ad9"), tm1: nameTag("r00tkit", "#ffd166"), tm2: nameTag("nullbyte", "#7ad7ff") };
  for (const t of Object.values(tags)) root.add(t);
  const sign = banner(["0xDEAF", "(my name)"], 4.2, 2.2, "#0b1020", "#3dff8b", "#13c4a3"); sign.position.set(nursery.baby.x - 1, 6.2, nursery.baby.z - 8.4); root.add(sign);
  checkGround(root);
  // render speed: each place's lamps are only on while the camera is there (blockrig/video lightsByLocation)
  const lamps = lightsByLocation(root, LOCATIONS);
  scene.add(root);

  const skyFor = (d: Daylight) => (d.stars > 0.6 ? "night" : d.sunDir[1] < 0.5 ? "golden" : "day");
  return {
    root, lib, room, lap, nursery, town, tags, pre, hall, friendRoom, props, mon, babyScreen, babyLaptop, tcp, tablet, lobbyBoard, timer, restOn,
    update(o: { location: string; weather: Weather; daylight: Daylight; time: number; local: number; camera: THREE.Camera; ownLight?: boolean; confetti?: { at: THREE.Vector3; t: number } | null }) {
      const focus = (LOCATIONS as any)[o.location] ?? LOCATIONS.room;
      lamps.show(o.location);
      const skyName = skyFor(o.daylight);
      scene.background = lib.sky(skyName); if (!o.ownLight) scene.environment = env(skyName);
      scene.backgroundIntensity = 1; scene.environmentIntensity = LOOK.env * 0.7;
      lighting.update({ time: o.daylight, overcast: 0, flash: 0, focus });
      cascades ??= createCascades(scene, o.camera as THREE.PerspectiveCamera, { maxFar: 400 }); cascades.update(lighting.sun);
      gl.toneMappingExposure = LOOK.exposure * o.daylight.exposure * 1.05;
      applyFog(scene, { ...o.weather, rain: 0, snow: 0, fog: 0, wet: 0, lightning: [] } as Weather, new THREE.Color(o.daylight.horizon), 0.0006);
      confetti.visible = !!o.confetti;
      if (o.confetti) {
        cdata.forEach((c, i) => {
          const y = c.y - c.v * o.confetti!.t; dummy.position.set(o.confetti!.at.x + c.x + Math.sin(o.confetti!.t * 2 + c.s) * 0.5, Math.max(0.05, y), o.confetti!.at.z + c.z);
          dummy.rotation.set(o.confetti!.t * c.w + c.s, c.s, o.confetti!.t * c.w); dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix);
        });
        confetti.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
export type World = ReturnType<typeof buildWorld>;
