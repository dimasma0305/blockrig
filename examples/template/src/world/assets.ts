// Every downloaded asset this video uses (assets/manifest.json lists where they come from; npm run assets
// fetches them; assets/credits.json has the licences). Names on the left are what the world code asks for.
import type { AssetList } from "../kit";

const SUB = "kenney/city-kit-suburban/", ROAD = "kenney/city-kit-roads/", CAR = "kenney/car-kit/", FUR = "kenney/furniture-kit/";
export const HOUSES = ["building-type-a", "building-type-b", "building-type-c", "building-type-d", "building-type-f", "building-type-k", "building-type-l", "building-type-q"];

export const ASSETS: AssetList = {
  models: {
    ...Object.fromEntries(HOUSES.map((h) => [h, `${SUB}${h}.glb`])),
    road: `${ROAD}road-straight.glb`, roadCrossing: `${ROAD}road-crossing.glb`, streetLight: `${ROAD}light-curved.glb`, stopSign: `${ROAD}road-sign-stop.glb`,
    fence: `${SUB}fence.glb`, treeLarge: `${SUB}tree-large.glb`, treeSmall: `${SUB}tree-small.glb`, planter: `${SUB}planter.glb`,
    sedan: `${CAR}sedan.glb`, suv: `${CAR}suv.glb`, taxi: `${CAR}taxi.glb`,
    wall: `${FUR}wall.glb`, wallWindow: `${FUR}wallWindow.glb`, bed: `${FUR}bedSingle.glb`, sideTable: `${FUR}sideTable.glb`, lamp: `${FUR}lampRoundTable.glb`,
    desk: `${FUR}desk.glb`, monitor: `${FUR}computerScreen.glb`, chair: `${FUR}chairDesk.glb`, bookcase: `${FUR}bookcaseOpen.glb`, rug: `${FUR}rugRectangle.glb`,
    plant: `${FUR}pottedPlant.glb`, bear: `${FUR}bear.glb`, pillow: `${FUR}pillow.glb`, books: `${FUR}books.glb`,
    cloud: "github/kenney-platformer/cloud.glb", bird: "polypizza/bird.glb", dog: "polypizza/shiba.glb",
  },
  skies: { day: "hdri/day.hdr", golden: "hdri/golden.hdr", storm: "hdri/storm.hdr", night: "hdri/night.hdr" },
  pbr: { asphalt: "textures/asphalt", grass: "textures/grass", concrete: "textures/concrete", planks: "textures/planks" },
};
