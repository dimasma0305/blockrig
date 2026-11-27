// Every downloaded asset this video uses (assets/manifest.json lists where they come from; npm run assets
// fetches them; assets/credits.json has the licences).
import type { AssetList } from "../kit";

const COM = "kenney/city-kit-commercial/", ROAD = "kenney/city-kit-roads/", CAR = "kenney/car-kit/";
export const SHOPS = ["building-a", "building-b", "building-c", "building-d", "building-e", "building-f", "building-g", "building-h", "building-i", "building-j"];
export const SKYSCRAPERS = ["building-skyscraper-a", "building-skyscraper-b", "building-skyscraper-c", "building-skyscraper-d", "building-skyscraper-e"];

export const ASSETS: AssetList = {
  models: {
    ...Object.fromEntries([...SHOPS, ...SKYSCRAPERS].map((n) => [n, `${COM}${n}.glb`])),
    streetLight: `${ROAD}light-square.glb`, dumpster: `${ROAD}dumpster.glb`, cone: `${ROAD}construction-cone.glb`, trafficLight: `${ROAD}traffic-light.glb`,
    signStreet: `${ROAD}road-sign-street.glb`, barrier: `${ROAD}construction-barrier.glb`,
    sedan: `${CAR}sedan.glb`, taxi: `${CAR}taxi.glb`, police: `${CAR}police.glb`, suv: `${CAR}suv.glb`,
  },
  pbr: { asphalt: "textures/asphalt", concrete: "textures/concrete" },
};
