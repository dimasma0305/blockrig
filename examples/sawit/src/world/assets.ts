// Every downloaded asset this video uses (assets/manifest.json lists where they come from; npm run assets
// fetches them; assets/credits.json has the licences). Names on the left are what the world code asks for.
import type { AssetList } from "../kit";

const NAT = "kenney/nature-kit/", TOWN = "kenney/fantasy-town-kit/", CASTLE = "kenney/castle-kit/", PIRATE = "kenney/pirate-kit/", FUR = "kenney/furniture-kit/";
export const FOREST_TREES = ["treeDetailed", "treeOak", "treeFat", "treeTall", "treeDefault"];

export const ASSETS: AssetList = {
  models: {
    // sawit (oil palm) rows and the green forest
    palm: `${NAT}tree_palmDetailedTall.glb`, palmShort: `${NAT}tree_palmDetailedShort.glb`, palmB: `${PIRATE}palm-detailed-straight.glb`,
    treeDetailed: `${NAT}tree_detailed.glb`, treeOak: `${NAT}tree_oak.glb`, treeFat: `${NAT}tree_fat.glb`, treeTall: `${NAT}tree_tall.glb`, treeDefault: `${NAT}tree_default.glb`,
    treeDark: `${NAT}tree_detailed_dark.glb`, bush: `${NAT}plant_bushDetailed.glb`, bushLarge: `${NAT}plant_bushLarge.glb`, grass: `${NAT}grass_large.glb`,
    stump: `${NAT}stump_round.glb`, log: `${NAT}log.glb`, rock: `${NAT}rock_largeA.glb`, dirtRow: `${NAT}crops_dirtRow.glb`, sapling: `${NAT}crops_leafsStageB.glb`, tent: `${NAT}tent_detailedOpen.glb`,
    // the village
    fountain: `${TOWN}fountain-round-detail.glb`, stallRed: `${TOWN}stall-red.glb`, stallGreen: `${TOWN}stall-green.glb`, cart: `${TOWN}cart.glb`, lantern: `${TOWN}lantern.glb`,
    bannerRed: `${TOWN}banner-red.glb`, windmill: `${TOWN}windmill.glb`, fence: `${TOWN}fence.glb`, pillar: `${TOWN}pillar-stone.glb`, hedge: `${TOWN}hedge-large.glb`,
    // the palace grounds and the secret room
    castleWall: `${CASTLE}wall.glb`, castleDoorway: `${CASTLE}wall-doorway.glb`, door: `${CASTLE}door.glb`, flag: `${CASTLE}flag-banner-long.glb`, towerBase: `${CASTLE}tower-square-base.glb`,
    barrel: `${PIRATE}barrel.glb`, chest: `${PIRATE}chest.glb`, crate: `${PIRATE}crate.glb`, bottle: `${PIRATE}bottle-large.glb`, shovel: `${PIRATE}tool-shovel.glb`,
    coin: "github/kenney-platformer/coin.glb", table: `${FUR}table.glb`, chair: `${FUR}chair.glb`, books: `${FUR}books.glb`,
    cloud: "github/kenney-platformer/cloud.glb", bird: "polypizza/bird.glb",
  },
  skies: { day: "hdri/day.hdr", golden: "hdri/golden.hdr", storm: "hdri/storm.hdr", night: "hdri/night.hdr" },
  pbr: {
    grass: "textures/grass", soil: "textures/soil", cobble: "textures/cobble", forestFloor: "textures/forestFloor", burnt: "textures/burnt",
    castleWall: "textures/castleWall", path: "textures/path", planks: "textures/planks",
  },
};
