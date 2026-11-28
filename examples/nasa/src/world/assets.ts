// Every downloaded asset this video uses (assets/manifest.json lists where they come from; npm run assets
// fetches them; assets/credits.json has the licences). Names on the left are what the world code asks for.
import type { AssetList } from "../kit";

const SUB = "kenney/city-kit-suburban/", FUR = "kenney/furniture-kit/", NAT = "kenney/nature-kit/";
export const HOUSES = ["building-type-a", "building-type-b", "building-type-c", "building-type-d"];
const furniture = ["wall", "wallWindow", "wallDoorway", "bedSingle", "sideTable", "lampRoundTable", "lampRoundFloor", "desk", "computerScreen", "computerKeyboard", "chairDesk", "chair",
  "bookcaseOpen", "books", "rugRectangle", "rugRound", "pottedPlant", "bear", "pillow", "laptop", "cardboardBoxClosed", "cardboardBoxOpen", "table", "tableCloth", "plantSmall1", "speaker", "televisionModern"];

export const ASSETS: AssetList = {
  models: {
    ...Object.fromEntries(HOUSES.map((h) => [h, `${SUB}${h}.glb`])),
    ...Object.fromEntries(furniture.map((f) => [f, `${FUR}${f}.glb`])),
    fence: `${SUB}fence.glb`, treeLarge: `${SUB}tree-large.glb`, treeSmall: `${SUB}tree-small.glb`, planter: `${SUB}planter.glb`,
    cloud: "github/kenney-platformer/cloud.glb", bird: "polypizza/bird.glb", dog: "polypizza/shiba.glb",
  },
  skies: { day: "hdri/day.hdr", golden: "hdri/golden.hdr", storm: "hdri/storm.hdr", night: "hdri/night.hdr" },
  pbr: { asphalt: "textures/asphalt", grass: "textures/grass", concrete: "textures/concrete", planks: "textures/planks", fabric: "textures/fabric" },
};
export const NATURE = NAT;
