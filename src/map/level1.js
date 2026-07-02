// ---------------------------------------------------------------------------
// Level 1 — the real course, laid out to mirror the page-3 sketch.
//
// Bottom → top journey (matches the sketch's topology, not to scale):
//   START (bottom center)
//     → wide LOWER FIELD holding the 3 alts: ◇ debris (left), ○ disguise
//       (center), △ caged (right), plus a couple of dead-end stubs as texture
//     → KYC CUSTOMS 1 (left-center, gating the forest entrance)
//     → SUBSCRIPTION / DOCUMENT FOREST (serpentine corridor winding upward)
//     → KYC CUSTOMS 2 (top center)
//     → FINISH / start assembly (top right)
//
// Still open-world (Pokémon/Stardew): wide walkable clearings, free 4-dir
// roaming, obscurity from the tight camera zoom (no fog). The forest becomes a
// proper green maze with the overpass in the Document Center step; for now it's
// a winding corridor so the route reads. Code-generated tile data migrates to a
// Tiled (.tmj) export with the same tile codes when Kenney art lands. Both cars
// share this exact course so the timer contrast stays honest.
// ---------------------------------------------------------------------------

export const TILES = {
  GROUND: 0, // walkable
  TREE: 1, // impassable wall
  BUSH: 2, // impassable soft edge
};

export const MAP_W = 52;
export const MAP_H = 46;

// Tile coords the driver spawns on (inside the bottom start clearing).
export const START = { x: 27, y: 42 };

// Wide walkable rectangles [x1, y1, x2, y2] (inclusive). Overlaps connect them.
const CLEARINGS = [
  // --- lower area -----------------------------------------------------------
  [6, 30, 46, 40], // LOWER FIELD (holds the 3 alts)
  [22, 40, 32, 44], // START clearing
  [14, 41, 22, 44], // start spur -> dead-end (down-left of start)
  [18, 26, 20, 30], // dead-end stub (up from field)
  [36, 26, 38, 30], // dead-end stub (up from field)
  // --- forest entrance + KYC 1 ---------------------------------------------
  [8, 25, 12, 30], // forest entrance neck (KYC 1 sits here)
  // --- subscription / document forest (serpentine, winds upward) -----------
  [6, 22, 44, 25], // forest bottom run (left -> right)
  [40, 14, 44, 25], // up the right side
  [10, 14, 44, 17], // middle run (right -> left)
  [6, 8, 10, 17], // up the left side
  [6, 8, 30, 11], // top run (left -> right)
  // --- KYC 2 + finish -------------------------------------------------------
  [30, 8, 47, 11], // connector to finish (KYC 2 sits near its start)
  [36, 6, 47, 13], // FINISH clearing (start assembly)
];

// Small tree/bush clumps carved back INTO clearings for texture & obstacles.
// [x1, y1, x2, y2, isBush]. Kept clear of the route spine and POI tiles.
const OBSTACLES = [
  [16, 33, 18, 35, false],
  [33, 34, 35, 36, false],
  [24, 31, 25, 32, true],
  [20, 15, 22, 16, false],
  [30, 22, 32, 24, false],
  [14, 9, 15, 10, true],
];

// Points of interest — rendered as placeholder markers now, wired to task/gate
// logic in step 2. Positions are tile coords on walkable ground.
export const POIS = [
  { type: 'start', x: 27, y: 42, label: 'START' },
  { type: 'alt-debris', x: 11, y: 35, label: 'Alt · debris' },
  { type: 'alt-disguise', x: 27, y: 36, label: 'Alt · disguise' },
  { type: 'alt-caged', x: 42, y: 33, label: 'Alt · caged' },
  { type: 'kyc1', x: 10, y: 27, label: 'KYC 1' },
  { type: 'kyc2', x: 32, y: 9, label: 'KYC 2' },
  { type: 'finish', x: 43, y: 9, label: 'FINISH' },
];

function fillRect(tiles, [x1, y1, x2, y2], value) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (y < 0 || x < 0 || y >= MAP_H || x >= MAP_W) continue;
      tiles[y][x] = value;
    }
  }
}

export function buildLevel() {
  // Base fill: dense trees everywhere.
  const tiles = [];
  for (let y = 0; y < MAP_H; y++) {
    tiles.push(new Array(MAP_W).fill(TILES.TREE));
  }

  // Carve the open walkable clearings, then punch interior obstacles back in.
  CLEARINGS.forEach((rect) => fillRect(tiles, rect, TILES.GROUND));
  OBSTACLES.forEach(([x1, y1, x2, y2, isBush]) =>
    fillRect(tiles, [x1, y1, x2, y2], isBush ? TILES.BUSH : TILES.TREE),
  );

  // Soften the tree walls: TREE tiles touching open ground become BUSH on a
  // deterministic pattern, so edges read as hedges rather than a hard block.
  const dressed = tiles.map((row) => row.slice());
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (tiles[y][x] !== TILES.TREE) continue;
      const touchesGround =
        tiles[y - 1]?.[x] === TILES.GROUND ||
        tiles[y + 1]?.[x] === TILES.GROUND ||
        tiles[y][x - 1] === TILES.GROUND ||
        tiles[y][x + 1] === TILES.GROUND;
      if (touchesGround && (x * 5 + y * 11) % 3 === 0) {
        dressed[y][x] = TILES.BUSH;
      }
    }
  }

  return dressed;
}

// Only open ground is walkable; trees and bushes block (green = impassable).
export function isBlocked(tile) {
  return tile !== TILES.GROUND;
}
