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
export const CAR_SPEED = 230; // px/s (base speed — same for both cars, honest timing)
export const OVERPASS_BOOST = 2.2; // iCapCar's speed multiplier on the overpass

// Camera (Stardew-style follow). It follows the CAR directly, with per-axis
// smoothing: responsive along the direction of travel (so the car never reaches
// the screen edge) and heavily damped across a corridor (so side-to-side wiggle
// doesn't scroll and it never chases a side street). Which axis is "cross" is
// decided continuously by the corridor shape (below), so it blends at bends.
export const CAM_TRAVEL_SMOOTH = 0.18; // responsive follow along travel
export const CAM_CROSS_SMOOTH = 0.045; // calm follow across a corridor

// Corridor bias: on a straight-ish stretch of path the camera pulls its
// cross-axis toward the path centreline, so wiggling across a lane doesn't
// scroll it. The bias ramps in CONTINUOUSLY with how elongated the open space
// is (full at CORRIDOR_RATIO), and fades to zero where the path opens up at a
// junction — so there's no hard snapping at bends. Combined with CAM_SMOOTH the
// whole thing glides.
export const CORRIDOR_RATIO = 1.6; // open-space length ratio for full bias
export const CORRIDOR_SCAN_CAP = 14; // tiles scanned each way when measuring spans

// Placeholder palette. Walkable GROUND reads light/warm; TREE & BUSH are the
// darker green impassable boundaries. Real Kenney art swaps in later.
export const COLORS = {
  ground: 0x9ab973, // walkable open ground (light grass)
  groundAlt: 0x93b16c, // subtle checker so movement is legible
  tree: 0x21492b, // dense tree wall (impassable)
  bush: 0x3c8248, // softer bush edge (impassable)
  treeShadow: 0x163420,
};
