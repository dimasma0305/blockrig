// Where things are. The street runs along Z (towards -Z is "into" the city); the plaza is far off on +X.
export const STREET = { roadHalf: 6, walkHalf: 11, buildingsAt: 16 };
// walking lanes on each sidewalk (|x|): towards the city on the inner one, back on the outer one, 2.2 studs apart so
// people passing never touch; props and lamps keep out of them (World.ts plan)
export const LANES = { inner: 7.6, outer: 9.8, width: 1.2 };
export const BAKERY = { x: 10.5, z: -6 };        // baker behind the counter, facing the street (-X)
export const SCHOOL = { x: -9.5, z: -22 };       // kids in front of the school, facing the street (+X)
export const HERO_STREET = { x: -8.8, z: 1 };
export const PX = 400;                           // plaza origin
export const VAULT = { x: PX, z: -30, radius: 24 };
export const TERMINAL = { x: PX, z: -30 + 25.2 }; // just outside the dome, at the vault door
export const BARRIER_Z = 10;
