// ---------------------------------------------------------------------------
// Global, locked-up-front constants. TILE_SIZE is the single source of truth
// for the grid; every map, sprite, and movement step is a multiple of it.
// ---------------------------------------------------------------------------

export const TILE_SIZE = 32;

// How many tiles the camera shows around the driver. Intentionally tight — an
// open-world (Pokémon/Stardew) camera where the zoom itself hides the shape of
// the map. Obscurity comes from the zoom + open clearings, NOT a fog overlay.
export const VIEW_TILES_X = 13;
export const VIEW_TILES_Y = 9;

// Supersampling factor. We render the canvas at RENDER_SCALE× the tile
// resolution and use a matching camera zoom, so the visible tile count is
// unchanged but the framebuffer is much higher-res (crisp instead of blocky).
// The final look sharpens further once real high-res art replaces placeholders.
export const RENDER_SCALE = 3;

// Movement: continuous, physics-driven (velocity + slide-along-walls), 8-way.
// The car is no longer snapped to the tile grid.
export const CAR_SPEED = 210; // px/s for the old car (base speed)

// Camera deadzone (Stardew-style): the car roams freely inside this centered
// box before the view scrolls. Full box size in tiles. The camera is also
// "corridor-aware": on a vertical stretch of path it locks its X to the path
// centreline (and vice versa), so wiggling across a corridor doesn't scroll the
// cross-axis. CORRIDOR_RATIO is how much longer one axis of open space must be
// than the other to count as a corridor.
export const DEADZONE_TILES_X = 2.5;
export const DEADZONE_TILES_Y = 2;
export const CORRIDOR_RATIO = 1.4;
export const CORRIDOR_SCAN_CAP = 12; // tiles scanned each way when measuring spans

// Placeholder palette. Walkable GROUND reads light/warm; TREE & BUSH are the
// darker green impassable boundaries. Real Kenney art swaps in later.
export const COLORS = {
  ground: 0x9ab973, // walkable open ground (light grass)
  groundAlt: 0x93b16c, // subtle checker so movement is legible
  tree: 0x21492b, // dense tree wall (impassable)
  bush: 0x3c8248, // softer bush edge (impassable)
  treeShadow: 0x163420,
};
