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
};

export const MAP_W = data.w;
export const MAP_H = data.h;

// Decode the committed default map (tiles stored one digit-string per row).
export function defaultTiles() {
  return data.tiles.map((row) => row.split('').map((c) => Number(c)));
}

export function defaultPois() {
  return data.pois.map((p) => ({ ...p }));
}

// Only open ground is walkable; trees and bushes block (green = impassable).
export function isBlocked(tile) {
  return tile !== TILES.GROUND;
}
