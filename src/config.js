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

// Movement: one grid cell per step, tween-driven so turns land on hard corners
// (no rounded turns, no sub-tile drift). Free 4-directional roaming within the
// open walkable space.
export const MOVE_MS = 130; // ms to cross one tile in the old car (base speed)

// Placeholder palette. Walkable GROUND reads light/warm; TREE & BUSH are the
// darker green impassable boundaries. Real Kenney art swaps in later.
export const COLORS = {
  ground: 0x9ab973, // walkable open ground (light grass)
  groundAlt: 0x93b16c, // subtle checker so movement is legible
  tree: 0x21492b, // dense tree wall (impassable)
  bush: 0x3c8248, // softer bush edge (impassable)
  treeShadow: 0x163420,
};
