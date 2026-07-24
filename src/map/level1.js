import data from './level1.data.json';

// ---------------------------------------------------------------------------
// Level 1 — canonical map metadata.
//
// The map itself now lives in level1.data.json (edited via the in-game map
// editor and expandable to any size). This module derives dimensions from that
// file and provides the tile enum + collision test. The old code-generated
// sketch layout has been retired now that the JSON is the source of truth.
// ---------------------------------------------------------------------------

export const TILES = {
  GROUND: 0, // walkable
  TREE: 1, // impassable wall
  BUSH: 2, // impassable soft edge
  CONCRETE: 3, // overpass road — walkable only once the overpass materialises
  BRIDGE: 4, // overpass border/railing — always impassable
  DARK_GROUND: 5, // walkable dirt, darkened (paint the forest floor shadowy)
  DARK_TREE: 6, // impassable tree, darkened (paint a deeper, dimmer forest)
};

export const MAP_W = data.w;
export const MAP_H = data.h;

// Decode the committed default map (tiles stored one digit-string per row).
// `tiles` is the base terrain (ground/tree/bush); `overpass` is a separate
// overlay (0 = none, CONCRETE, BRIDGE) that sits ON TOP without disturbing the
// terrain underneath.
export function defaultTiles() {
  return data.tiles.map((row) => row.split('').map((c) => Number(c)));
}

export function defaultOverpass() {
  const rows = data.overpass || data.tiles.map((row) => '0'.repeat(row.length));
  return rows.map((row) => row.split('').map((c) => Number(c)));
}

// Shade mask (0/1): 1 = a "dark zone" cell — driving over it dims the screen.
// A separate overlay from the terrain, painted in the editor.
export function defaultShade() {
  const rows = data.shade || data.tiles.map((row) => '0'.repeat(row.length));
  return rows.map((row) => row.split('').map((c) => Number(c)));
}

export function defaultPois() {
  return data.pois.map((p) => ({ ...p }));
}

// Only open ground (light or dark) is walkable; trees/bushes block.
export function isBlocked(tile) {
  return tile !== TILES.GROUND && tile !== TILES.DARK_GROUND;
}
